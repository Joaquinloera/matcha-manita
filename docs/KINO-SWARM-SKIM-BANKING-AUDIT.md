# KINO 281102 — SWARM + SKIM integration audit
Date: 2026-10-08
Status: Research and architecture only; no live banking connection or payment authorization asserted.

## Verified repositories
- Joaquinloera/matcha-manita — Netlify storefront and functions configuration.
- Joaquinloera/sonoraport-banking — `config/matcha-banking-integration.json` defines signed server-to-server payment-intent integration.
- Joaquinloera/Worldsanbox13 — `data/sonoraport-banking-bridge.json` defines an authenticated banking bridge and explicitly sets `connectionState.configured=false`.
- Joaquinloera/Sonoraportworldclock-hive — repository exists; internal integration not yet verified.

## Integration contract to preserve
- HMAC-SHA256 signatures; timestamp, request ID and idempotency headers.
- Server-side ownership checks for customerId, orderId and intentId.
- Banking payment binding must prevent duplicate/cross-intent binding.
- Provider callback is settlement authority; browser cannot assert settlement.
- Replay protection, audit trail, fail-closed behavior, HTTPS and secret storage outside repository.
- Do not enable money movement or production payment processing without provider eligibility, regulatory review and explicit authorization.

## Next engineering steps
1. Audit existing Matcha Manita Netlify function implementations against the banking contract.
2. Compare Sonoraport Banking routes and runtime deployment configuration; do not commit secrets.
3. Validate sandbox bridge health and capabilities with authorized test credentials.
4. Map Worldclock event timestamps and scheduling into a shared event schema.
5. Add automated contract tests using synthetic transactions only.
6. Review cannabis-related merchant eligibility and applicable laws before choosing payment providers.

## Research protocol
SWARM: divide research into banking compliance, API documentation, code audit, security and UX workstreams.
SKIM: cite primary documentation, mark each finding verified/proposed/untested, and record blockers.
No claim of continuous autonomous background execution.
