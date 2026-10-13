import test from "node:test";
import assert from "node:assert/strict";
import { appendInventoryEvent, verifyInventoryChain } from "../netlify/functions/_lib/inventory-audit-chain.mjs";

const receive = { sku: "MM-FLOWER-1G", action: "receive", quantity: 10, timestamp: "2026-10-13T00:00:00Z", reference: "test-receipt-1" };
test("creates a verifiable linked inventory history", () => {
  const one = appendInventoryEvent([], receive);
  const two = appendInventoryEvent(one, { ...receive, action: "reserve", quantity: 2, reference: "test-reservation-1" });
  assert.equal(two.length, 2);
  assert.equal(two[1].previousHash, two[0].hash);
  assert.equal(verifyInventoryChain(two), true);
});
test("detects changed quantities", () => {
  const chain = appendInventoryEvent([], receive);
  const tampered = structuredClone(chain);
  tampered[0].event.quantity = 999;
  assert.equal(verifyInventoryChain(tampered), false);
});
test("detects reordered and removed records", () => {
  const one = appendInventoryEvent([], receive);
  const two = appendInventoryEvent(one, { ...receive, action: "adjust", reference: "test-adjustment" });
  assert.equal(verifyInventoryChain([two[1], two[0]]), false);
  assert.equal(verifyInventoryChain([two[1]]), false);
});
test("rejects invalid event actions and quantities", () => {
  assert.throws(() => appendInventoryEvent([], { ...receive, action: "transfer" }), /Invalid action/);
  assert.throws(() => appendInventoryEvent([], { ...receive, quantity: -1 }), /Invalid quantity/);
});
