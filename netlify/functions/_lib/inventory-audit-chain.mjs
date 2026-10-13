// KINO dispensary inventory event hash chain.
// This is an off-chain integrity primitive, NOT a deployed blockchain or a ledger.
// Persist events in an access-controlled database before relying on them for auditing.
import { createHash } from "node:crypto";

const ZERO_HASH = "0".repeat(64);
function digest(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function canonicalEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw Error("Invalid event");
  const { sku, action, quantity, timestamp, reference } = event;
  if (typeof sku !== "string" || !sku.trim()) throw Error("Invalid SKU");
  if (!["receive", "adjust", "reserve", "release"].includes(action)) throw Error("Invalid action");
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw Error("Invalid quantity");
  if (typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp))) throw Error("Invalid timestamp");
  if (typeof reference !== "string" || !reference.trim()) throw Error("Missing reference");
  return { sku, action, quantity, timestamp, reference };
}
export function appendInventoryEvent(chain, event) {
  if (!Array.isArray(chain)) throw Error("Invalid chain");
  if (!verifyInventoryChain(chain)) throw Error("Invalid existing chain");
  const entry = canonicalEvent(event);
  const previousHash = chain.length ? chain[chain.length - 1].hash : ZERO_HASH;
  const sequence = chain.length;
  const hash = digest(JSON.stringify({ sequence, previousHash, event: entry }));
  return [...chain, { sequence, previousHash, event: entry, hash }];
}
export function verifyInventoryChain(chain) {
  if (!Array.isArray(chain)) return false;
  let previousHash = ZERO_HASH;
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (!entry || entry.sequence !== i || entry.previousHash !== previousHash) return false;
    let normalized;
    try { normalized = canonicalEvent(entry.event); } catch { return false; }
    if (JSON.stringify(normalized) !== JSON.stringify(entry.event)) return false;
    const expected = digest(JSON.stringify({ sequence: i, previousHash, event: normalized }));
    if (entry.hash !== expected) return false;
    previousHash = expected;
  }
  return true;
}
