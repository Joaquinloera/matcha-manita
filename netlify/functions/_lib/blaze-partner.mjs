/**
 * KINO #281102 / Matcha Manita — BLAZE partner adapter (server only).
 * Official docs: https://apidocs.blaze.me/getting-started/authentication
 * No credentials are stored in this repository. No storefront route is exposed.
 */
const BASE_URL = "https://api.partners.blaze.me";
const ALLOWED_PATHS = new Set(["/api/v1/partner/store"]);

export function isBlazeConfigured(env = process.env) {
  return Boolean(env.BLAZE_PARTNER_KEY && env.BLAZE_DEVELOPER_KEY);
}

export async function blazeRead(path, options = {}) {
  const { env = process.env, fetchImpl = fetch, timeoutMs = 8000 } = options;
  if (!ALLOWED_PATHS.has(path)) throw new Error("BLAZE path not allowlisted");
  if (!isBlazeConfigured(env)) throw new Error("BLAZE credentials not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(BASE_URL + path, {
      method: "GET",
      headers: {
        "x-api-key": env.BLAZE_PARTNER_KEY,
        "Authorization": env.BLAZE_DEVELOPER_KEY,
        "Accept": "application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      // Do not return provider response bodies: they may contain private data.
      const error = new Error("BLAZE request failed");
      error.status = response.status;
      throw error;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function getBlazeStore(options) {
  return blazeRead("/api/v1/partner/store", options);
}
