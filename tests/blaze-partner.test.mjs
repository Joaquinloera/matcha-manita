import test from "node:test";
import assert from "node:assert/strict";
import { blazeRead, getBlazeStore, isBlazeConfigured } from "../netlify/functions/_lib/blaze-partner.mjs";

const env = { BLAZE_PARTNER_KEY: "test-partner", BLAZE_DEVELOPER_KEY: "test-developer" };

test("requires both server credentials", () => {
  assert.equal(isBlazeConfigured({}), false);
  assert.equal(isBlazeConfigured({ BLAZE_PARTNER_KEY: "x" }), false);
  assert.equal(isBlazeConfigured(env), true);
});

test("rejects non-allowlisted endpoints before making network calls", async () => {
  let called = false;
  await assert.rejects(
    blazeRead("/api/v1/partner/transactions", {
      env, fetchImpl: async () => { called = true; }
    }),
    /not allowlisted/
  );
  assert.equal(called, false);
});

test("fails closed when credentials are missing", async () => {
  await assert.rejects(getBlazeStore({ env: {}, fetchImpl: () => { throw Error("network called"); } }), /not configured/);
});

test("passes credentials only to the approved store endpoint", async () => {
  let calls = 0;
  const store = await getBlazeStore({
    env,
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, "https://api.partners.blaze.me/api/v1/partner/store");
      assert.equal(init.method, "GET");
      assert.equal(init.headers["x-api-key"], env.BLAZE_PARTNER_KEY);
      assert.equal(init.headers.Authorization, env.BLAZE_DEVELOPER_KEY);
      assert.ok(init.signal);
      return { ok: true, json: async () => ({ id: "mock-store" }) };
    }
  });
  assert.deepEqual(store, { id: "mock-store" });
  assert.equal(calls, 1);
});

test("does not expose provider response bodies on failures", async () => {
  await assert.rejects(
    getBlazeStore({ env, fetchImpl: async () => ({ ok: false, status: 429, text: async () => "secret payload" }) }),
    error => error.message === "BLAZE request failed" && error.status === 429 && !error.message.includes("secret")
  );
});

test("aborted requests propagate a failure", async () => {
  await assert.rejects(
    getBlazeStore({
      env, timeoutMs: 1,
      fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      })
    }),
    /aborted/
  );
});
