const crypto = require("crypto");

const ORDER_OWNERSHIP_SECRET =
  process.env.MATCHA_MANITA_ORDER_OWNERSHIP_SECRET || "";

const MAX_BODY_BYTES = 8192;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}

function ownershipDigest(customerId, orderId) {
  return crypto
    .createHmac("sha256", ORDER_OWNERSHIP_SECRET)
    .update(`${customerId}:${orderId}`)
    .digest("hex");
}

function validIdentifier(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, {
      ok: false,
      error: "Method not allowed."
    });
  }

  if (!ORDER_OWNERSHIP_SECRET) {
    return response(503, {
      ok: false,
      error:
        "Production order ownership service is not configured."
    });
  }

  if (
    Buffer.byteLength(event.body || "", "utf8") >
    MAX_BODY_BYTES
  ) {
    return response(413, {
      ok: false,
      error: "Request body too large."
    });
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return response(400, {
      ok: false,
      error: "Invalid JSON request body."
    });
  }

  if (!validIdentifier(body.customerId)) {
    return response(400, {
      ok: false,
      error: "A valid authenticated customer ID is required."
    });
  }

  const orderId = `mm_${crypto.randomUUID()}`;

  const ownershipProof =
    ownershipDigest(body.customerId, orderId);

  return response(201, {
    ok: true,
    orderId,
    customerId: body.customerId,
    ownershipProof
  });
};
