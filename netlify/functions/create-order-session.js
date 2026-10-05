const crypto = require("crypto");

const SUPABASE_URL =
  (process.env.MATCHA_MANITA_SUPABASE_URL || "").replace(/\/$/, "");

const SUPABASE_PUBLISHABLE_KEY =
  process.env.MATCHA_MANITA_SUPABASE_PUBLISHABLE_KEY || "";

const ORDER_OWNERSHIP_SECRET =
  process.env.MATCHA_MANITA_ORDER_OWNERSHIP_SECRET || "";

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

function getBearerToken(headers = {}) {
  const authorization =
    headers.authorization ||
    headers.Authorization ||
    "";

  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  return match ? match[1].trim() : "";
}

async function verifyCustomer(accessToken) {
  const authResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      }
    }
  );

  if (!authResponse.ok) {
    return null;
  }

  const user = await authResponse.json();

  if (
    !user ||
    typeof user.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      user.id
    )
  ) {
    return null;
  }

  return user;
}

function ownershipDigest(customerId, orderId) {
  return crypto
    .createHmac("sha256", ORDER_OWNERSHIP_SECRET)
    .update(`${customerId}:${orderId}`)
    .digest("hex");
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return response(405, {
      ok: false,
      error: "Method not allowed."
    });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY ||
    !ORDER_OWNERSHIP_SECRET
  ) {
    return response(503, {
      ok: false,
      error:
        "Production customer authentication is not fully configured."
    });
  }

  const accessToken = getBearerToken(event.headers);

  if (!accessToken) {
    return response(401, {
      ok: false,
      error: "Authenticated customer session required."
    });
  }

  let user;

  try {
    user = await verifyCustomer(accessToken);
  } catch {
    return response(502, {
      ok: false,
      error: "Customer identity service is unavailable."
    });
  }

  if (!user) {
    return response(401, {
      ok: false,
      error: "Customer session could not be verified."
    });
  }

  const customerId = user.id;

  const orderId =
    `mm_${crypto.randomUUID()}`;

  const ownershipProof =
    ownershipDigest(customerId, orderId);

  return response(201, {
    ok: true,
    orderId,
    customerId,
    ownershipProof
  });
};
