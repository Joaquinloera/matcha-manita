const crypto = require("crypto");

const BANKING_URL = (process.env.SONORAPORT_BANKING_API_URL || "").replace(/\/$/, "");
const BANKING_TOKEN = process.env.MATCHA_MANITA_BANKING_TOKEN || "";
const ORDER_OWNERSHIP_SECRET = process.env.MATCHA_MANITA_ORDER_OWNERSHIP_SECRET || "";
const MAX_BODY_BYTES = 16384;

function response(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }, body: JSON.stringify(body) };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function ownershipDigest(customerId, orderId) {
  return crypto.createHmac("sha256", ORDER_OWNERSHIP_SECRET).update(`${customerId}:${orderId}`).digest("hex");
}

function validateOwnership(body) {
  if (!ORDER_OWNERSHIP_SECRET || !body.customerId || !body.orderId || !body.ownershipProof) return false;
  return safeEqual(body.ownershipProof, ownershipDigest(body.customerId, body.orderId));
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") return response(405, { ok: false, error: "Method not allowed." });

  if (!BANKING_URL || !BANKING_TOKEN || !ORDER_OWNERSHIP_SECRET) {
    return response(503, { ok: false, error: "Production Banking bridge is not fully configured." });
  }

  if (Buffer.byteLength(event.body || "", "utf8") > MAX_BODY_BYTES) {
    return response(413, { ok: false, error: "Request body too large." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { ok: false, error: "Invalid JSON request body." });
  }

  if (!validateOwnership(body)) {
    return response(403, { ok: false, error: "Order ownership verification failed." });
  }

  if (!Number.isInteger(body.amount) || body.amount <= 0) {
    return response(400, { ok: false, error: "amount must be a positive integer in minor currency units." });
  }

  if (typeof body.currency !== "string" || !/^[A-Za-z]{3}$/.test(body.currency)) {
    return response(400, { ok: false, error: "currency must be a three-letter currency code." });
  }

  const idempotencyKey =
    event.headers?.["idempotency-key"] ||
    event.headers?.["Idempotency-Key"];

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 255
  ) {
    return response(400, {
      ok: false,
      error: "A valid Idempotency-Key header is required."
    });
  }

  let upstream;

  try {
    upstream = await fetch(
      `${BANKING_URL}/api/matcha-manita/payment-intents`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${BANKING_TOKEN}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey
        },
        body: JSON.stringify({
          amount: body.amount,
          currency: body.currency.toUpperCase(),
          orderId: body.orderId,
          description:
            typeof body.description === "string"
              ? body.description.slice(0, 500)
              : undefined
        })
      }
    );
  } catch {
    return response(502, {
      ok: false,
      error: "SonoraPort Banking is unreachable."
    });
  }

  let banking;

  try {
    banking = await upstream.json();
  } catch {
    return response(502, {
      ok: false,
      error: "Invalid response from SonoraPort Banking."
    });
  }

  if (!upstream.ok) {
    return response(upstream.status, {
      ok: false,
      error:
        banking.error ||
        "SonoraPort Banking rejected the request.",
      requestId: banking.requestId || null
    });
  }

  return response(upstream.status, {
    ok: banking.ok === true,
    paymentIntent: banking.paymentIntent || null,
    auditReceiptId: banking.auditReceiptId || null,
    settlementExecuted:
      banking.settlementExecuted === true,
    providerConfirmed:
      banking.providerConfirmed === true,
    requestId: banking.requestId || null
  });
};
