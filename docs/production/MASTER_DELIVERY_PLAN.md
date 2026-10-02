# FirstMemoir — Master Delivery Plan

*Authoritative Operational & Delivery Roadmap toward Production*  
*Last updated: October 2, 2026*  
*Delivery Philosophy: CLIENT REQUIREMENT → DEFINE VERTICAL SLICE → IMPLEMENT → LOCAL QUALITY GATE → VERCEL DEMO / STAGING → CLIENT REVIEW → FEEDBACK → ACCEPT/REVISE → NEXT SLICE*

---

## A. Current State

FirstMemoir is currently in an active **Iterative Delivery** phase transitioning toward production readiness.

1. **Storefront Demo:** Publicly accessible at [https://firstmemoir-demo.vercel.app](https://firstmemoir-demo.vercel.app).
   - Deployed on Vercel with `NEXT_PUBLIC_DEMO_MODE=true`.
   - Showcases 10 verified representative prototype products across Frames, Posters, and Bookmarks.
   - Decoupled from backend API and database to allow immediate remote client UI/UX evaluation without data pollution.
   - Mobile-first responsiveness, navigation drawers, image galleries, and mock Add-to-Cart interactions verified.
2. **Monorepo Engineering Foundation:** Fully compiled and passing typechecks:
   - `@repo/database`: Prisma models, migrations, and seeds.
   - `@repo/shared`: Zod validation schemas and shared types.
   - `@repo/ui`: Common UI primitives.
   - `@repo/api-client`: Type-safe API client contracts.
   - `apps/storefront`: Next.js 16 (Turbopack) consumer web application.
   - `apps/admin`: React / Vite management panel for catalog, orders, and manufacturing queues.
   - `apps/api`: Express / TypeScript backend with HMAC-verified webhooks, idempotent transactions, and Shiprocket dry-run integration.
3. **Infrastructure Boundary:**
   - **Developer Sandbox:** Permanently preserved (local Docker DB, developer GitHub `ayush-writes-code/FirstMemoir`, developer R2 bucket `weprintit-assets`, Neon Staging `ep-wispy-glitter-axsmkbyo`, Razorpay Test keys, Shiprocket test account).
   - **Client Production:** Zero client accounts provisioned yet; production infrastructure setup is deferred until client approves the core experience.

---

## B. Architecture Status

Classification taxonomy applied strictly:
- `IMPLEMENTED_AND_VERIFIED`: Code executed and verified working with concrete evidence.
- `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED`: Code fully written and tested locally/staging, but live production environment/credentials not yet attached.
- `PARTIALLY_IMPLEMENTED`: Core capability functional, but specific provider integrations or workflows remain in mock/scaffold state.
- `BLOCKED_BY_BUSINESS_INPUT`: Engineering complete or ready, but requires client policy, prices, or grouping decisions.
- `BLOCKED_BY_PLATFORM_ACCESS`: Blocked on client creating accounts, granting credentials, or domain access.
- `NOT_IMPLEMENTED`: Intentionally not built (e.g. BullMQ/Redis, automated CMYK PDF generation).
- `DEFERRED`: Intentionally postponed to a later track to prevent premature optimization or unnecessary expense.

| Component / Subsystem | Status | Engineering Capability | Business Data Availability | Production Verification |
|---|---|---|---|---|
| **Storefront UI (Home, Nav, Shop, PDP, Mobile)** | `IMPLEMENTED_AND_VERIFIED` | Full Next.js frontend with responsive design | 10 prototype items loaded; 72 items pending | Live verified on `firstmemoir-demo.vercel.app` |
| **Catalog Data Schema (Prisma)** | `IMPLEMENTED_AND_VERIFIED` | Schema supports products, options, metadata, packaging | Blocked on client pricing & variants | Migrations verified locally on Docker PostgreSQL |
| **Catalog Dry-Run Importer** | `IMPLEMENTED_AND_VERIFIED` | Script recursively crawls and verifies 82 folders | Missing 34 prices & 41 SKUs | Verified locally against 452 listing assets |
| **Product Customizer (Upload / Crop / Preview)** | `IMPLEMENTED_AND_VERIFIED` | Canvas cropper, live preview, DPI validation | Not applicable to current 82 fixed listings | Verified locally; remote CORS blocked on Vercel |
| **Cart & Pricing Engine** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Server-side price verification & option calculation | Standard option sets configured | Verified locally; decoupled on demo storefront |
| **Checkout & Order Creation** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Guest checkout, address validation, order snapshots | Fixed pricing required for checkout | Verified with local API & test database |
| **Razorpay Payments & Webhooks** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Raw body HMAC verification, idempotent payment events | Blocked on client live credentials | 20 webhook integration tests passing locally |
| **Shiprocket Fulfillment Integration** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Service code, snapshot dimension extraction, tracking | Blocked on 4 packaging box profiles | Dry-run integration tests passing locally |
| **Manufacturing Queue (Admin)** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Vite admin panel, order status updates, item inspection | Awaiting real customer orders | Admin builds cleanly; verified locally |
| **Customer Notifications (SMS / Email)** | `PARTIALLY_IMPLEMENTED` | Service handles logging and retries; mock SMS in place | Blocked on SMS provider credentials | Unit tests passing; production provider missing |
| **Remote Asset Storage (Cloudflare R2)** | `BLOCKED_BY_PLATFORM_ACCESS` | Upload manifest and presigned URL pipelines ready | 452 assets audited locally | Production bucket and domain CORS not provisioned |
| **Production API (Render)** | `DEFERRED` | Dockerfile & Blueprint configured | Ready for staging deployment | Paused during visual-only demo sprint |
| **Production Domain & Hosting** | `BLOCKED_BY_PLATFORM_ACCESS` | Vercel CLI pipeline operational | Client production accounts required | Blocked on `firstmemoir.in` DNS and accounts |
| **Automated CMYK PDF Engine** | `NOT_IMPLEMENTED` | Immutable RGB high-res retained in snapshots | Not required by business specification | Excluded by architectural design |
| **BullMQ / Redis Queue Infrastructure** | `NOT_IMPLEMENTED` | In-process transactional state transitions used | Not required for current traffic scale | Excluded by architectural design |

---

## C. Product Backlog

| ID | Title | Track | Priority | Status | Description |
|---|---|---|---|---|---|
| PB-01 | Client Visual Review & Feedback Intake | Track A | P0 | IN PROGRESS | Collect client feedback on `https://firstmemoir-demo.vercel.app`. |
| PB-02 | First Real Catalog Batch Definition (5–10 items) | Track B | P0 | READY | Select 5–10 items with confirmed prices for initial DB ingestion. |
| PB-03 | Missing Selling Price Resolution | Track B | P0 | BLOCKED | Obtain verified retail prices for 34 listings from client. |
| PB-04 | Product Grouping / Variant Decision | Track B | P1 | BLOCKED | Client decision on Option A (Variants) vs Option B (Collections). |
| PB-05 | SKU Pattern Approval | Track B | P1 | BLOCKED | Approve `FM-[CATEGORY]-[SLUG]` pattern for 41 missing SKUs. |
| PB-06 | Packaging Form Factor Dimensions (4 profiles) | Track E | P1 | BLOCKED | Obtain boxed L x W x H and dead weight for 4 product types. |
| PB-07 | R2 Asset Migration (Pilot Batch) | Track B | P1 | BLOCKED | Upload approved pilot images to Cloudflare R2 bucket. |
| PB-08 | Reconnect Storefront to Staging API for Pilot | Track C | P1 | DEFERRED | Re-enable dynamic API product fetching for real commerce test. |
| PB-09 | Razorpay Test Transaction Verification | Track C | P1 | DEFERRED | End-to-end checkout with Razorpay Test Mode and webhook capture. |
| PB-10 | Admin Order & Manufacturing Verification | Track E | P2 | DEFERRED | Verify order receipt, status advance, and AWB generation in Admin. |
| PB-11 | Client Production Accounts Provisioning | Track F | P2 | BLOCKED | Provision client GitHub, Vercel, Render, R2, Razorpay, Shiprocket. |
| PB-12 | Custom Domain & SSL Cutover | Track F | P2 | BLOCKED | Point `firstmemoir.in` to client Vercel project. |

---

## D. Delivery Tracks

### TRACK A — VISUAL PRODUCT EXPERIENCE
*Goal: Polish the consumer-facing shopping interface to client satisfaction.*
1. Home page presentation & hero imagery
2. Navigation drawer & category filters
3. Shop All catalog grid & layout
4. Category landing views (Frames, Posters, Bookmarks)
5. Product cards, typography, and badges
6. Product detail pages & image galleries
7. Mobile ergonomics & touch targets
8. High-resolution gallery carousel
9. Product options selector UI
10. Editorial storytelling & trust sections

### TRACK B — REAL CATALOG
*Goal: Ingest genuine client inventory using the Safe Catalog Lifecycle.*
1. Client business decisions (Grouping, SKUs, Brand clearance)
2. First 5–10 product pilot batch manifest
3. Programmatic validation & dry-run import
4. Staging DB import & Vercel verification
5. Client approval of pilot batch presentation
6. Remaining 72+ products manifest import
7. Catalog QA (image integrity, price accuracy, metadata check)

### TRACK C — REAL COMMERCE
*Goal: Activate end-to-end purchasing on verified catalog items.*
1. Database-backed product rendering on PDP
2. Real option selection & price recalculation
3. Backend-authoritative cart validation (`/api/v1/cart`)
4. Cart persistence & line item management
5. Guest checkout initialization (`/api/v1/checkout/initialize`)
6. Razorpay Test modal trigger
7. Webhook capture & HMAC signature validation (`/api/v1/webhooks/razorpay`)
8. Asynchronous order status transition (`PENDING` → `CONFIRMED`)
9. Customer order confirmation screen & receipt

### TRACK D — PERSONALIZATION
*Goal: Retain high-end custom photo upload for applicable products only.*
1. Photo upload flow
2. Image dimension & aspect ratio validation
3. Interactive canvas crop interface
4. Photorealistic mockup live preview
5. DPI warning & print quality check
6. Crop coordinate persistence
7. Cart item customization payload
8. Checkout freeze to immutable `OrderItem` snapshot
9. Manufacturing high-res asset retention

### TRACK E — OPERATIONS
*Goal: Enable order fulfillment, packaging, and shipping workflows.*
1. Admin panel order list & detail views
2. Manufacturing queue inspection
3. Production state transitions (`CONFIRMED` → `IN_PRODUCTION` → `READY_TO_SHIP`)
4. Shipment packaging snapshot extraction
5. Shiprocket order manifestation & AWB assignment
6. Webhook tracking update handler (`SHIPMENT_CREATED`, `IN_TRANSIT`, `DELIVERED`)
7. Transactional notification logs (SMS / Email)
8. Customer tracking portal (`/track-order`)
9. Return & cancellation administrative controls

### TRACK F — PRODUCTION INFRASTRUCTURE
*Goal: Stand up clean, client-owned production cloud services (post-approval).*
1. Client GitHub organization repository setup
2. Client Vercel project with production team
3. Client Render web service for API hosting
4. Managed PostgreSQL instance (Neon / Supabase / AWS RDS)
5. Client Cloudflare R2 bucket (`firstmemoir-assets`) with custom domain
6. Production CORS policy configuration
7. Razorpay LIVE account keys & webhook secret
8. Shiprocket LIVE account with verified pickup address
9. Production domain configuration (`firstmemoir.in`, `api.firstmemoir.in`)
10. SSL certificates & HTTP/2 routing
11. Health monitoring & alerting
12. Automated database backups

### TRACK G — PRODUCTION HARDENING
*Goal: Security, compliance, resiliency, and performance optimization.*
1. Authentication & RBAC enforcement
2. Secret rotation & environment variable hygiene
3. Cross-origin cookie & session security
4. API rate limiting & DDoS mitigation
5. Webhook HMAC verification & replay attack prevention
6. Fail-closed error handling & structured logging
7. Centralized application observability
8. Database migration rollback testing
9. Payment reconciliation audit script
10. Idempotent refund & payment cancellation handling
11. Courier failure & retry handling
12. Transactional email/SMS delivery guarantees
13. SEO metadata, OpenGraph cards, and Sitemap generation
14. Accessibility compliance (WCAG 2.1 AA)
15. Legal pages (Terms, Privacy, Refund, Shipping Policy)
16. Web analytics & conversion tracking
17. Core Web Vitals optimization (LCP, FID/INP, CLS)
18. Load testing under peak concurrency

### TRACK H — LAUNCH ACCEPTANCE
*Goal: Final binary go/no-go sign-off prior to commercial launch.*
- Binary Launch Checklist executed (Section M).

---

## E. Client Decisions Required

| Decision # | Area | Scope | Options | Client Action |
|---|---|---|---|---|
| **CD-01** | Product Grouping | 8 Parent Series (78 Folders) | **Option A:** 1 Product with option dropdowns.<br>**Option B:** Multiple standalone Products in a Collection. | Choose Option A or B per series. |
| **CD-02** | Missing Selling Prices | 34 Listing Folders | Provide retail prices for 20 placeholder folders and 14 unpriced folders. | Supply INR price per item. |
| **CD-03** | Missing SKUs | 41 Listing Folders | **Option 1:** Auto-generate via `FM-[CAT]-[SLUG]`.<br>**Option 2:** Client provides manual SKUs. | Approve Option 1 or supply list. |
| **CD-04** | Packaging Dimensions | 4 Form Factor Profiles | Supply box L × W × H (cm) and packed weight (kg) for 4 product types. | Fill out packaging dimensions table. |
| **CD-05** | Brand & IP Clearance | Asset Photography | Confirm rights to "PosterNet" branding, athlete names, anime, and car logos. | Written legal clearance. |
| **CD-06** | Custom Photo Products | Catalog Scope | Confirm if custom upload applies strictly to future products, not current 82 items. | Formal confirmation. |

---

## F. Business Blockers

1. **34 Missing / Placeholder Selling Prices:** Without client-confirmed prices, products cannot be legally sold or checked out.
2. **Product Variant Cardinality:** Cannot generate database seeds without knowing if Football Jerseys is 1 product or 10 products.
3. **Packaging Box Profiles:** Shiprocket shipping rates and manifestations require physical box dimensions and weights.
4. **Third-Party Watermark Clearance:** Images containing "PosterNet" and "Rajput Traders" must be authorized or replaced.

---

## G. Platform Blockers

1. **Client Razorpay LIVE Account:** KYC approval and production key generation pending client business onboarding.
2. **Client Shiprocket LIVE Account:** Live credentials and physical warehouse pickup address needed.
3. **Client Cloudflare Account:** Required for provisioning client-owned R2 bucket and setting domain CORS rules.
4. **Production Domain Access (`firstmemoir.in`):** DNS access required for Vercel and Render custom domain routing.

---

## H. Production Blockers

1. **No Production Database Provisioned:** Live orders must never be processed against local Docker or development staging DBs.
2. **No Production API Deployment:** API must be hosted on dedicated client cloud infrastructure with health monitoring.
3. **R2 Production CORS:** Cross-Origin Resource Sharing on Cloudflare R2 bucket must whitelist production origin.
4. **End-to-End Payment Verification:** Live payment capture cannot be certified until live keys are tested.

---

## I. Current Active Slice

**SLICE 1: CLIENT VISUAL REVIEW & FIRST REAL CATALOG BATCH SELECTION**
- **Objective:** Gather client feedback on the live Vercel visual demo (`https://firstmemoir-demo.vercel.app`) and select the first pilot batch of 5–10 real products with confirmed prices for initial database ingestion.
- **Scope:**
  1. Present `https://firstmemoir-demo.vercel.app` to client across Mobile and Desktop.
  2. Record all feedback in `docs/production/CLIENT_FEEDBACK_LOG.md`.
  3. Finalize retail prices and grouping for a 5–10 item pilot batch (e.g., Porsche Frame, 3 Football Jerseys, 3 Motivation Quotes, 2 Bookmarks).
  4. Prepare verified pilot manifest for Track B ingestion.
- **Acceptance Criteria:**
  - Client reviews live demo and provides structured feedback.
  - Pilot batch of 5–10 products has 100% verified prices, SKUs, and imagery.
  - No speculative architecture code written during this slice.

---

## J. Completed Slices

### Slice 0: Visual Storefront Prototype Remote Deployment (Completed Sept 28, 2026)
- **Delivered:** Public storefront deployed on Vercel at `https://firstmemoir-demo.vercel.app`.
- **Features:** 10 representative catalog products, Home, Navigation, Shop All, PDP with local mock Add-to-Cart.
- **Verification:** Verified mobile responsiveness, clean layout, no horizontal overflow, 10/10 images loading with HTTP 200.
- **Commit:** `f72ab7c`

---

## K. Client Feedback Summary

*Refer to `docs/production/CLIENT_FEEDBACK_LOG.md` for full details.*
- Initial client review session pending.

---

## L. Release History

| Version / Tag | Date | Environment | Target | Description |
|---|---|---|---|---|
| `v0.1.0-demo` | 2026-09-28 | Vercel Demo | `firstmemoir-demo.vercel.app` | Initial public storefront visual prototype for client review. |

---

## M. Launch Acceptance Checklist

A feature is considered ready for production launch ONLY when every item on this binary checklist is marked `PASS`:

### 1. Catalog & Merchandising
- [ ] Every active product has a client-approved selling price in INR.
- [ ] Strikethrough MRP pricing policy approved and verified.
- [ ] Every sellable SKU is unique and follows the approved format.
- [ ] Product photography contains no unapproved competitor watermarks.
- [ ] Categories and collections match customer browsing expectations.

### 2. Assets & Storage
- [ ] All production images hosted on client Cloudflare R2 bucket.
- [ ] Cloudflare R2 CORS whitelists `https://firstmemoir.in`.
- [ ] Image URLs served through secure CDN with cache headers.

### 3. Commerce & Transactions
- [ ] Authoritative prices calculated exclusively by API backend.
- [ ] Cart correctly applies option add-ons and enforces exclusions.
- [ ] Guest checkout captures complete shipping addresses and phone numbers.
- [ ] Razorpay LIVE keys configured and verified via test live transaction.
- [ ] Webhook HMAC signature verification verified on `/api/v1/webhooks/razorpay`.
- [ ] Frontend callback is non-authoritative; webhook reliably captures payment.
- [ ] Duplicate webhook deliveries handled idempotently (single payment recorded).
- [ ] Immutable `OrderItem` snapshot preserves dimensions, pricing, and artwork at purchase.

### 4. Fulfillment & Operations
- [ ] Shiprocket LIVE account connected with verified pickup location.
- [ ] Packed box dimensions and weights accurately snapshot per order item.
- [ ] Admin panel allows tracking order lifecycle and viewing item artwork.
- [ ] Shiprocket tracking webhook updates order state asynchronously.
- [ ] Customer tracking page (`/track-order`) renders live shipment progress.

### 5. Infrastructure & Security
- [ ] Client GitHub repository established as upstream source.
- [ ] Client Vercel project attached to custom domain `firstmemoir.in`.
- [ ] Client Render web service hosting Express API with `/health` monitor.
- [ ] Production PostgreSQL database isolated from developer staging DBs.
- [ ] All database migrations applied cleanly via `prisma migrate deploy`.
- [ ] API CORS configured strictly for `https://firstmemoir.in`.
- [ ] Rate limiting active on authentication and checkout endpoints.
- [ ] Automated database backup schedule configured and verified.

### 6. Client Final Acceptance
- [ ] Client sign-off on mobile user experience.
- [ ] Client sign-off on order confirmation and fulfillment workflow.
- [ ] Client sign-off on legal terms, privacy, and refund policies.
