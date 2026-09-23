# Production Readiness Tracker

*Last updated: September 23, 2026*

## Status Legend

| Status | Meaning |
|---|---|
| ✅ VERIFIED | Tested and confirmed working |
| 🟡 PARTIALLY VERIFIED | Some aspects work, others untested or incomplete |
| 🔴 BLOCKED | Cannot proceed without external input or fix |
| ⬜ UNVERIFIED | Not yet tested |
| 📋 BUSINESS DECISION REQUIRED | Waiting for client confirmation |

---

## Core Infrastructure

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Local PostgreSQL | VERIFIED | Docker container running, 119/119 tests pass | — |
| Database Migration Path | VERIFIED | Dockerfile securely uses `migrate deploy` without destructive resets | — |
| Local API (localhost) | VERIFIED | All endpoints functional, tests pass | — |
| Render API Infrastructure | VERIFIED | Build succeeds, health endpoints `/api/health/live` & `ready`, proxy trust verified | — |
| Webhook Raw Body Architecture | VERIFIED | `express.raw` correctly guards Razorpay webhook for HMAC | — |
| Storefront to API Connection | VERIFIED | Vercel configured for `NEXT_PUBLIC_API_URL` runtime switch | — |
| Cloudflare R2 (production CORS) | BLOCKED | Vercel origin fails R2 CORS | Engineering config needed via Cloudflare Dashboard |
| Storefront (Vercel) | VERIFIED | Builds and deploys, prototype gating prevents leakage | — |
| Admin Panel | VERIFIED | Vite build succeeds, catalog metadata management works | — |

## Catalog & Products

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Real catalog inventory | VERIFIED | 82 leaf folders fully crawled and counted | — |
| Product schema | VERIFIED | Handles all known product types | — |
| MRP / Compare-at pricing | BUSINESS DECISION REQUIRED | MRP exists in source data, need instructions | Schema change needed IF business wants strikethrough pricing |
| SKU assignment | BUSINESS DECISION REQUIRED | 41/82 folders have SKUs, format inconsistent | SKU policy needs approval |
| Product variant structure | BUSINESS DECISION REQUIRED | "8 variations" vs separate products unclear | Client must decide |
| Selling price | BUSINESS DECISION REQUIRED | 13 listings placeholder text, 14 no info.txt | Client must provide real prices |
| Catalog Importer Dry-Run | VERIFIED | Script correctly classifies 82 folders safely | — |
| Catalog DB Mutation | BUSINESS DECISION REQUIRED | Blocked on missing data | Awaiting prices/variants |
| R2 Asset Upload | BUSINESS DECISION REQUIRED | Migration manifest generated securely | Awaiting visual sign-off |

## Storefront UI

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Home page | ✅ VERIFIED | Production layout implemented using 10 verified prototype assets | — |
| Navigation (desktop) | ✅ VERIFIED | Shop All, Frames, Posters, Track Order | — |
| Navigation (mobile) | ✅ VERIFIED | Full-screen drawer with category links | — |
| Product listing page | ✅ VERIFIED | Implemented using isolated prototype data boundary | — |
| Product detail page | ✅ VERIFIED | Implemented standard product PDP with gallery and data isolation | — |
| Personalization flow | ✅ VERIFIED | Upload → crop → preview → add to cart pipeline works | — |
| Cart | 🟡 PARTIALLY VERIFIED | Functional with pricing calculation (Prototype products currently isolated from cart DB transactions) | — |
| Checkout | ✅ VERIFIED | Guest + authenticated checkout works locally | Production payment gateway needed |
| Mobile responsive | ✅ VERIFIED | Verified across Home, Shop, and PDP | — |

## Commerce & Payments

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Razorpay (test mode) | VERIFIED | Order creation, webhook signature, idempotency tested | — |
| Razorpay Webhook Architecture | VERIFIED | Raw body HMAC validation implemented on `/api/v1/webhooks` | — |
| Razorpay (production credentials) | BLOCKED | Production keys missing | Live credentials needed |
| Order creation flow | VERIFIED | Cart → Checkout → PENDING order → Razorpay | — |
| Webhook security | VERIFIED | 20 webhook integration tests pass | — |
| Payment confirmation | VERIFIED | Browser callback does NOT confirm; webhook is authoritative | — |
| Order immutable snapshots | VERIFIED | Pricing, dimensions, customization frozen at checkout | — |

## Fulfillment & Shipping

| Area | Status | Evidence | Blocker |
|---|---|---|---|
| Shiprocket Webhook Architecture | VERIFIED | Webhook route correctly mapped for AWB updates | — |
| Shiprocket Credentials | BLOCKED | Credentials missing | Production credentials needed |
| Shiprocket API Logic | PARTIALLY VERIFIED | Service code exists, dry-run tests pass | Needs actual live test |
| Packaging cardinality | BUSINESS DECISION REQUIRED | Unknown whether packaging varies by Size, Frame, or variant | Client meeting needed |
| AWB tracking | PARTIALLY VERIFIED | Code exists, not tested with real courier | — |

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
