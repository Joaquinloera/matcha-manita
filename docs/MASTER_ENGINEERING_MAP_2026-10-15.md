# Matcha Manita — Master Engineering Map

Verified source branch: kino-premium-preview-20261008 (2026-10-15 review). Preserve original Día de los Muertos design and assets. Separate customer storefront from SonoraPort financial backend.

## Architecture
Customer storefront (index.html, styles.css, app.js) → server-side service boundary → cannabis POS/inventory/compliance adapters and SonoraPort financial gateway → approved providers. Supabase handles application data/authentication; Netlify serves website/functions; GitHub controls source.

## Workstreams and verification gates
1. Storefront: compare ten reference screenshots; verify artwork files; navigation, product cards, mobile and accessibility. Current source explicitly calls ordering PREVIEW, not live.
2. Cannabis operations: Arizona license evidence, ADHS rules, inventory, delivery, age/identity checks, state-by-state US regulatory registry, international market registry. No inferred licensing.
3. Banking: JPMorgan, Citi, HSBC, ICBC, Bank of China, BBVA; extract official API URLs, OAuth/mTLS, accounts, treasury, onboarding, permitted capabilities.
4. Networks: CIPS, SWIFT, FedNow, Pix, SPEI, UPI; standards, ISO 20022 where applicable, participant/sponsor access, message flows.
5. Payments: Stripe, PayPal, Adyen, Visa, Mastercard; SDKs, webhooks, credential types, provider acceptance, settlement and reconciliation. Never assume cannabis merchant approval.
6. AI: OpenAI, Anthropic, Google, Microsoft, AWS, Mistral; API endpoints, authentication, models, agents, orchestration, budgets, audit trails.
7. Blockchain: Alchemy, Ethereum, Solana; JSON-RPC, SDKs, wallet security, custody/signing, confirmations and reconciliation.
8. Security: server-side secrets, least privilege, key rotation, signed webhooks, idempotency, audit logging; no private keys in frontend.

## Provider extraction schema
provider_id, jurisdiction, category, official_documentation, api_base_url, auth_method, sdk, webhooks, capabilities, onboarding, institutional_sponsor_required, cannabis_use_policy_checked, credential_status, sandbox_test, production_test, last_verified, evidence_url.

## Mandatory build loop
RECOVER → AI AGENTS → SWARM → SKIM → CROSS-CHECK → CODE → TEST → SAVE → VERIFY → user review.

## Current status
Readback verified index.html, styles.css, app.js on named GitHub branch. No deployment, live payment, license, or autonomous swarm verified by this map. This file is the initial engineering map, not a completed integration.
