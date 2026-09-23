# Production Readiness Tracker

*Last updated: September 23, 2026*

## Status Legend

| Status | Meaning |
|---|---|
| LOCAL VERIFIED | Code was executed locally and the behavior passed. |
| CONFIGURATION VERIFIED | Source/configuration was inspected and is structurally correct. |
| REMOTE DEPLOYED | A real remote deployment exists and is reachable. |
| REMOTE VERIFIED | A real request was sent to the deployed service and produced the expected result. |
| BUSINESS BLOCKED | Engineering supports the workflow, but real client data or approval is missing. |

---

## Core Infrastructure

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Local PostgreSQL | LOCAL VERIFIED | Docker container running, 119/119 tests pass | — |
| Database Migration Path | CONFIGURATION VERIFIED | Dockerfile securely uses `migrate deploy` without destructive resets | Requires actual Render deploy |
| Local API (localhost) | LOCAL VERIFIED | `npm run start` and `curl /api/health/live` pass | — |
| Render API Infrastructure | BUSINESS BLOCKED | No Render CLI access / dashboard credentials | Needs client platform access |
| Webhook Raw Body Architecture | LOCAL VERIFIED | `express.raw` correctly guards Razorpay webhook for HMAC | — |
| Storefront to API Connection | CONFIGURATION VERIFIED | Vercel configured for `NEXT_PUBLIC_API_URL` runtime switch | Requires actual remote deploy |
| Cloudflare R2 (production CORS) | BUSINESS BLOCKED | S3 API `GetBucketCorsCommand` returns Access Denied | Needs Cloudflare Dashboard access |
| Storefront (Vercel) | BUSINESS BLOCKED | No Vercel CLI access / dashboard credentials | Needs client platform access |
| Admin Panel | LOCAL VERIFIED | Vite build succeeds locally | — |

## Catalog & Products

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Real catalog inventory | LOCAL VERIFIED | 82 leaf folders fully crawled and counted | — |
| Product schema | CONFIGURATION VERIFIED | Handles all known product types | — |
| MRP / Compare-at pricing | BUSINESS BLOCKED | MRP exists in source data, need instructions | Schema change needed IF business wants strikethrough pricing |
| SKU assignment | BUSINESS BLOCKED | 41/82 folders have SKUs, format inconsistent | SKU policy needs approval |
| Product variant structure | BUSINESS BLOCKED | "8 variations" vs separate products unclear | Client must decide |
| Selling price | BUSINESS BLOCKED | 13 listings placeholder text, 14 no info.txt | Client must provide real prices |
| Catalog Importer Dry-Run | LOCAL VERIFIED | Script correctly classifies 82 folders safely | — |
| Catalog DB Mutation | BUSINESS BLOCKED | Blocked on missing data | Awaiting prices/variants |
| R2 Asset Upload | BUSINESS BLOCKED | Migration manifest generated securely | Awaiting visual sign-off |

## Storefront UI

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Home page | LOCAL VERIFIED | Production layout implemented using 10 verified prototype assets | — |
| Navigation (desktop) | LOCAL VERIFIED | Shop All, Frames, Posters, Track Order | — |
| Navigation (mobile) | LOCAL VERIFIED | Full-screen drawer with category links | — |
| Product listing page | LOCAL VERIFIED | Implemented using isolated prototype data boundary | — |
| Product detail page | LOCAL VERIFIED | Implemented standard product PDP with gallery and data isolation | — |
| Personalization flow | LOCAL VERIFIED | Upload → crop → preview → add to cart pipeline works | — |
| Cart | LOCAL VERIFIED | Functional with pricing calculation (Prototype products currently isolated from cart DB transactions) | — |
| Checkout | LOCAL VERIFIED | Guest + authenticated checkout works locally | Production payment gateway needed |
| Mobile responsive | LOCAL VERIFIED | Verified across Home, Shop, and PDP | — |

## Commerce & Payments

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Razorpay (test mode) | LOCAL VERIFIED | Order creation, webhook signature, idempotency tested | — |
| Razorpay Webhook Architecture | CONFIGURATION VERIFIED | Raw body HMAC validation implemented on `/api/v1/webhooks` | — |
| Razorpay (production credentials) | BUSINESS BLOCKED | Production keys missing | Live credentials needed |
| Order creation flow | LOCAL VERIFIED | Cart → Checkout → PENDING order → Razorpay | — |
| Webhook security | LOCAL VERIFIED | 20 webhook integration tests pass | — |
| Payment confirmation | LOCAL VERIFIED | Browser callback does NOT confirm; webhook is authoritative | — |
| Order immutable snapshots | LOCAL VERIFIED | Pricing, dimensions, customization frozen at checkout | — |

## Fulfillment & Shipping

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Shiprocket Webhook Architecture | CONFIGURATION VERIFIED | Webhook route correctly mapped for AWB updates | — |
| Shiprocket Credentials | BUSINESS BLOCKED | Credentials missing | Production credentials needed |
| Shiprocket API Logic | LOCAL VERIFIED | Service code exists, dry-run tests pass | Needs actual live test |
| Packaging cardinality | BUSINESS BLOCKED | Unknown whether packaging varies by Size, Frame, or variant | Client meeting needed |
| AWB tracking | CONFIGURATION VERIFIED | Code exists, not tested with real courier | — |

## Notifications

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Notification service | ✅ VERIFIED | 2 integration tests pass | — |
| SMS provider | ⬜ UNVERIFIED | Mock provider in use | Production SMS provider needed |
| Email provider (Resend) | ⬜ UNVERIFIED | Resend SDK imported but not production-tested | Production API key needed |

## Authentication

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| OTP login flow | ✅ VERIFIED | Works locally | Production SMS delivery needed |
| JWT tokens | ✅ VERIFIED | Access + refresh token flow works | — |
| Admin authentication | ✅ VERIFIED | Role-based access control works | — |
| Cookie security | 🟡 PARTIALLY VERIFIED | HttpOnly cookies work locally | Cross-domain cookie behavior on Vercel needs verification |

---

## Production Blockers

For the definitive list of blockers (separated by Engineering vs Business), see [PRODUCTION_BLOCKERS.md](./PRODUCTION_BLOCKERS.md).

## P1 Important (Should Fix Before Launch)

1. **Mobile responsive audit** — Full check with real product content
2. **Category filtering** — Verify filter behavior with real catalog
3. **Production Shiprocket credentials** — Live courier scheduling
4. **Production email/SMS** — Real transactional notifications

## P2 Enhancement (Should Not Block Launch)

1. **Advanced filtering** — Multi-facet filters beyond category
2. **Search** — Product search functionality
3. **Recommendations** — Related products
4. **Analytics** — Usage tracking
5. **SEO optimization** — Meta tags, structured data, sitemap
