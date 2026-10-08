# KINO #281102 — SWARM + SKIM: banking and payment integration research
Research date: 2026-10-08. Research report, not a production authorization or provider approval.

## Scope
Research actual cannabis-capable financial services, payment APIs, POS integration paths, and connections among Matcha Manita, Sonoraport Banking, Worldsanbox13, and Worldclock. No assumption that generic checkout is suitable, and no blanket rejection of payment integration. Distinguish vendor claims, verified code configuration, and untested connections.

## Verified public research (primary sources)
1. **CanPay** — states cannabis retailers with compliant accounts at CanPay-approved financial institutions can join its debit network. Source: https://www.canpaydebit.com/financial-institutions/ . Integration availability, underwriting and API access for Matcha Manita are not yet verified.
2. **Flowhub Pay** — markets cash alternatives for in-store, online and delivery workflows integrated with Flowhub POS. Source: https://www.flowhub.com/product/payments . API availability and standalone custom-checkout support remain to be checked.
3. **Cova Pay** — describes ACH and debit payment options integrated with Cova POS through vetted partners. Source: https://www.covasoftware.com/cannabis-payments-for-dispensaries . Need technical documentation and confirmation of custom integration rights.
4. **Dutchie POS API** — documents products, inventory, transaction reporting and Basic authentication with location/integrator keys. Sources: https://api.pos.dutchie.com/swagger/index.html and https://support.dutchie.com/hc/en-us/articles/27660267271187-Dutchie-POS-API-key-request-process-for-third-party-integrations . Approved integration and authorized credentials are required; this is not proof of payment-processing access.
5. **FinCEN** — guidance describes how financial institutions assess and service marijuana-related businesses under BSA obligations; it does not state that all banking services are unavailable. Source: https://www.fincen.gov/resources/statutes-regulations/guidance/bsa-expectations-regarding-marijuana-related-businesses .
6. **U.S. GAO (2026)** — documents ongoing challenges obtaining financial services, despite growth in institutions serving cannabis businesses. Source: https://www.gao.gov/products/gao-26-107498 .

## Existing project contracts inspected
- `sonoraport-banking/config/matcha-banking-integration.json`: HMAC-SHA256, timestamp, request ID, idempotency key, five payment-intent routes, server-side ownership, reconciliation and replay protection.
- `sonoraport-banking/data/sonoraport-banking-bridge.json`: authenticated service bridge, environment variables for banking URL/token, restricted money movement.
- `Worldsanbox13/data/sonoraport-banking-bridge.json`: `connectionState.configured=false`; service secrets still need deployment configuration. The bridge is a declared design, not a proven live connection.
- `matcha-manita/netlify.toml`: Netlify Functions deployment and payment-create redirect. Runtime endpoint parity is not yet verified.

## SWARM workstreams
**BANK-01 Provider mapping:** CanPay, Flowhub Pay, Cova Pay; determine merchant acceptance, state coverage, pricing, settlement, onboarding and permitted use.
**BANK-02 API documentation:** Determine authenticated APIs, sandbox environments, webhooks, refunds, reconciliation exports, and custom frontend eligibility.
**BANK-03 Code audit:** Compare Matcha Manita Netlify Functions against Sonoraport's five-route payment-intent contract and identify gaps.
**BANK-04 Security:** Validate signed requests, server-only secrets, ownership checks, replay defense, idempotency, callback authenticity and audit events.
**BANK-05 Cross-project coordination:** Specify event schemas, health checks, and read-only monitoring for Worldsanbox13 and Worldclock without granting money-movement authority.

## SKIM verification rules
For each source record URL, exact capability, date, authentication, evidence, integration blockers, and status (documented / tested / approved / deployed). Use official sources first; never invent API endpoints or merchant approval.

## Immediate next tasks
1. Inspect Matcha Manita's payment and banking Netlify functions and identify contract mismatches.
2. Find official technical onboarding/API documentation for CanPay, Flowhub Pay and Cova Pay.
3. Prototype a provider-neutral adapter using synthetic payments and test-only fixtures, on the development branch.
4. Test bridge health only after an authorized endpoint and test credentials are available.
5. Keep production banking and live checkout unchanged until explicit approval and validated integration.

## Status
Research updated; provider integrations not activated; no banking transactions executed; no assertion of background autonomous agents.
