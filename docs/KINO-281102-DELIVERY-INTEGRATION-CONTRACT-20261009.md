# KINO #281102 — Delivery-only integration contract

Status: DEVELOPMENT SPECIFICATION. No POS integration, legal eligibility, payments, or delivery dispatch is claimed operational.

## Fixed business boundary
Matcha Manita is an independently branded cannabis DELIVERY service. No walk-in store, pickup option, or in-person retail service should be advertised without explicit approval and applicable authorization. LLC organizational relationship and authorized banking backend are the only intended cross-project connections. Preserve the owner-approved sugar-skull woman, English Bulldog, marigolds, crowned MM mark, and black/gold/neon visual direction.

## Research — primary vendor sources inspected with TinyFish, October 9, 2026
- Dutchie POS: https://api.pos.dutchie.com/pages/authentication.html — HTTP Basic with vendor-scoped API key, issued by Dutchie Support; permission scopes and location-specific access; /whoami can validate granted access.
- POSaBIT: https://developer.posabit.com/authentication.html — V3 HTTP Basic with integrator token + venue token; V1/V2 bearer tokens are legacy.
- Treez: https://code.treez.io/reference/authentication — integrator-generated signed JWT with registered X.509 RSA public certificate, 30-second TTL and organization/endpoint permissions.

## Provider-neutral backend contract (not implemented)
GET /api/catalog -> normalized {products:[{id,category,variants:[{sku,priceMinor,available}]}],syncedAt,source}
POST /api/delivery/eligibility -> {eligible:false,reason,verifiedAt} until address, licensing, age/identity, service-area and operational checks have succeeded on server.
POST /api/orders -> requires authenticated user, verified eligibility, server-priced SKU/quantity, idempotency key, and an authorized POS order reservation; never trust client totals.
GET /api/orders/:id -> return only the authenticated customer's own order state.
POST /api/webhooks/:provider -> verify provider signature, timestamp/replay protections, and reconcile idempotently before updating order state.

## Mandatory fail-closed gates
1. No fulfillment until cannabis delivery licensing and permitted service areas are independently verified.
2. No client-side API secrets, payment keys, POS credentials, or signing private keys.
3. No ZIP-code-only approval; actual address and applicable restrictions must be checked securely.
4. Age checkbox is NOT government-ID or legal eligibility verification.
5. No orders accepted on a placeholder backend; unavailable provider or compliance check must block order submission.
6. No delivery time, inventory, potency, tax, discount, or payment availability claims without authoritative provider data.
7. No production deployment before owner review.

## Acceptance checklist
- [x] Delivery-first, preview-only storefront copy committed in index.html.
- [ ] Owner artwork implemented as interactive responsive design.
- [ ] POS provider selected and approved API access provisioned.
- [ ] Server-side price/inventory synchronization and idempotent order lifecycle implemented.
- [ ] Age, ID, address, license and delivery eligibility validated by compliant service.
- [ ] Dispatch integration, audit logs, failure handling and reconciliation tested.
- [ ] Automated tests and accessible mobile QA passing.
- [ ] Owner approves production release.

## Known limitation
This document is a research and implementation contract, not proof of an active license, POS partnership, bank integration, delivery operation or production readiness.
