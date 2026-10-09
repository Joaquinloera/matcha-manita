# KINO Build 21 — Dispensary API research
Date: 2026-10-09
Status: public documentation research, not credentials or approved integrations.

## Verified vendor APIs

- Dutchie POS: https://api.pos.dutchie.com/swagger/index.html — Basic authentication using authorized location key and integrator key; OpenAPI spec; catalog/inventory/customer APIs.
- Treez: https://code.treez.io/reference/authentication and https://support.treez.io/en/articles/9129351-requesting-api-access-for-treez-apis — self-signed JWT using registered certificate, org and endpoint scopes. New legacy API keys stopped October 1, 2026; migration deadline November 1, 2026.
- Cova: https://api.covasoft.net/documentation — OAuth2 token, product and inventory sync, sales order, taxes, GL, Canadian e-commerce payment API (do not assume US applicability).
- BLAZE: https://apidocs.blaze.me/intro — partner/developer keys, inventory, cart, orders, transactions, webhooks.
- Jane: https://dm-sdk-docs.iheartjane.com/api-reference/ — merchandising SDK and headless product/facet API; advanced direct API usage may require Jane review.
- Weedmaps: https://developer.weedmaps.com/v2026.01/docs/overview — menu synchronization, availability, pricing, taxonomy and brand enrichment.

## Proposed engineering architecture
UI (original Día de los Muertos artwork + accessible interactive components) -> server-side catalog/order API -> provider adapter -> authorized POS/inventory service. Independent Sonoraport banking contract; never confuse a POS API with payment-provider authorization.

## Design requirements from owner
Preserve both uploaded visual references as master inspiration, not flattened website buttons. Rebuild navigation, login, flower cards, selectors, and cart as responsive HTML/CSS/JS. Maintain uniform flower pricing of $2.86/1g, $10/3.5g, $20/7g, $40/14g, $80/28g across strains. Product/brand claims, stock and potency must be verified before publication.

## Next SWARM + SKIM tasks
1. Inventory existing Matcha Manita code, assets and functions.
2. Draft modular visual layout preserving logo, marigolds, French bulldog, skull art and neon motifs.
3. Implement and test responsive product cards, weight selection and cart on development branch.
4. Compare public POS schemas and create provider-neutral mappings and synthetic test fixtures.
5. Verify integrations with authorized test accounts; never request or expose third-party private API keys.
6. Preview before production deployment; keep live website unchanged.

Research work is performed in explicit sessions, not continuous background agents.
