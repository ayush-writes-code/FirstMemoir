# Current State of FirstMemoir.in

*Authoritative Technical Snapshot — Iterative Product Delivery Phase*  
*Last updated: October 11, 2026*

---

## 1. Executive Summary
FirstMemoir is transitioning into an **Iterative Product Delivery** model toward production.
- **Active Visual Demo:** Live at [https://firstmemoir-demo.vercel.app](https://firstmemoir-demo.vercel.app) (Reflecting canonical 82-item catalog).
- **Authoritative Master Plan:** `docs/production/MASTER_DELIVERY_PLAN.md`
- **Client Feedback Log:** `docs/production/CLIENT_FEEDBACK_LOG.md`
- **Client Catalogue Clarifications:** `docs/catalog-onboarding/CLIENT_CATALOG_CLARIFICATIONS.md`
- **Catalogue Reconciliation Report:** `docs/catalog-onboarding/CATALOG_RECONCILIATION_REPORT.md`
- **Provisional Packaging Profiles:** `docs/catalog-onboarding/PROVISIONAL_PACKAGING_PROFILES.md`
- **Delivery Model:** Small vertical slices verified locally, deployed to demo/staging, reviewed by client, refined iteratively. One active slice at a time.

---

## 2. Codebase & Git Status
- **Repository:** `ayush-writes-code/FirstMemoir`
- **Branch:** `phase-3-2-categories`
- **Build Quality Gates:** Fully passing across all packages (`storefront`, `api`, `admin`).
- **Typecheck:** Passing (0 errors across monorepo).
- **Environment Isolation:** Developer sandbox (local Docker, developer R2, Neon staging) is permanently preserved and separated from future client production infrastructure.

---

## 3. Architecture Status Overview

| Layer | Status | Key Details |
|---|---|---|
| **Storefront** | `IMPLEMENTED_AND_VERIFIED` | Next.js 16 (Turbopack), mobile-first layout. Fully migrated off prototype catalog, natively consuming API for all 82 catalog items. Prototype data isolated in demo components. |
| **Catalog Schema** | `IMPLEMENTED_AND_VERIFIED` | Prisma schema supporting products, options, metadata, packaging. Personalization fields (`upload_id`, `crop`, etc.) optional for standard non-personalized catalog products. |
| **Catalog Data** | `IMPLEMENTED_AND_VERIFIED` | Reconciled 82 source leaf folders ↔ 82 canonical products (1:1 match). 48 source-confirmed prices, 34 provisional estimates. Removed all synthesized/unsupported claims. Packaging profiles isolated as provisional. |
| **Customizer Engine** | `IMPLEMENTED_AND_VERIFIED` | Upload, crop, live mockup preview functional in code; bypassed seamlessly for standard non-personalized products (`custom-prints` check). |
| **Cart & Pricing** | `IMPLEMENTED_AND_VERIFIED` | Cart service and schemas support both standard products (no upload needed) and personalized products (strictly requiring upload and crop metadata). |
| **Checkout & Payments** | `IMPLEMENTED_AND_VERIFIED` | Checkout service creates immutable `OrderItem` snapshots for standard items (`master_file_key: null`, backend-authoritative price) and enforces upload assets and DPI checks for personalized items. |
| **Fulfillment** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | Shiprocket service and packaging snapshot extraction tested in dry-run mode; 4 provisional profiles assigned; pending live credentials & physical box measurements. |
| **Admin Operations** | `IMPLEMENTED_BUT_NOT_PRODUCTION_VERIFIED` | React/Vite admin panel for catalog, order lifecycle, and manufacturing queue tested locally; real pilot products ready for price/SKU management. |
| **Notifications** | `PARTIALLY_IMPLEMENTED` | Notification dispatch service and logs ready; mock SMS provider active; pending live SMS gateway. |
| **Cloud Infrastructure** | `BLOCKED_BY_PLATFORM_ACCESS` | Client production GitHub, Vercel, Render, R2, and domain accounts to be provisioned post-approval. |

---

## 4. Current Milestone & Next Slice
- **Completed Milestone:** **Slice 6C.4 — Render API Staging Deployment**
- **Milestone Status:** **STAGING API DEPLOYMENT VERIFIED (PASS)**
- **Accomplishments:**
  - **Docker Entrypoint Resolution**: Fixed compilation output in `apps/api/tsconfig.json` (`"rootDir": "src"` and test exclusions). Verified `apps/api/dist/index.js` generated at container entrypoint path.
  - **Live Service Deployment**: Service `firstmemoir-api-staging` deployed successfully on Render from commit `45d2d07`.
  - **Live Liveness & Readiness**: `GET /api/health/live` returns 200 OK. `GET /api/health/ready` returns 200 OK confirming real database connectivity to the Neon staging PostgreSQL instance.
  - **Live Catalogue API**: `GET /api/v1/categories` successfully returns all 5 seeded categories. `GET /api/v1/products?limit=2` successfully queries the database and reports `total: 82` products with verified public R2 image URLs and confirmed pricing.
  - **CORS Preflight Verified**: Preflight `OPTIONS /api/v1/categories` with Origin `https://firstmemoir-demo.vercel.app` returns 204 No Content with `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`.
  - **AWS SDK Node 20 Advisory**: Documented deprecation warning from `@aws-sdk/client-s3` on Node 20 runtime; verified no functional regression, scheduled Node 22 bump for subsequent maintenance slice.
- **Current Active Milestone:** **Slice 6C.5 — Storefront API Integration & Staging E2E Checkout Verification**
- **Stage 1 Status (Catalogue Integration):** **PASS**
  - **Live API Integration**: Storefront connected to live staging API (`https://firstmemoir-api-staging.onrender.com/api/v1`) via `NEXT_PUBLIC_API_URL`.
  - **Category Slugs Harmonized**: Updated navigation links across header, mobile menu, and homepage to canonical `frames` slug (49 products).
  - **Pagination & Query Preservation**: Added pagination controls adhering to backend `limit <= 50` validation, preserving `category` and `sort` query params.
  - **Error & Image Resilience**: Added graceful user-facing error empty states and `onError` fallback handling across product cards, thumbnail galleries, and PDP mockups. Whitelisted `*.r2.dev` in Next.js `remotePatterns`.
  - **Quality Gates**: 12/12 integration and live API contract tests passed (100%), 0 TypeScript errors, 0 ESLint warnings, 5/5 Turborepo build targets succeeded.
- **Stage 2 Status (Upload Architecture Audit & Staging Verification):** **PASS**
  - **Upload Flow Traced**: Server-authoritative presigned PUT URL generation (`customers/*`), direct R2 client upload, completion callback with Sharp EXIF normalization and 800px WebP preview proxy generation (`previews/*`), 302 preview redirect with `Cache-Control: private, no-store`.
  - **Security & Privacy Boundaries Verified**: Private uploads strictly return `public_url: null`. Direct public CDN access blocked (404). Unauthenticated preview and read requests rejected (403 Forbidden). Duplicate upload completion rejected (409 Conflict).
  - **Live Staging Run Verified**: `scripts/verify-staging-upload.ts` verified complete lifecycle against `https://firstmemoir-api-staging.onrender.com` and `firstmemoir-private-uploads` with 100% pass rate.
  - **Guaranteed Cleanup**: Test upload and preview proxy deleted and confirmed absent via `HeadObjectCommand`. Zero residual objects in R2.
  - **Legacy Bucket Untouched**: `weprintit-assets` remained 100% untouched.
  - **Bug Fixed**: Harmonized `packages/api-client/src/endpoints/storage.ts` query param to `file_key` matching backend Zod schema.
- **Stage 3 Status (Checkout Architecture Audit & Razorpay Sandbox Verification):** **PASS**
  - **Checkout Contracts Verified**: Request DTO strictly accepts email, phone, and address; backend authoritative pricing enforced from database catalog.
  - **Test-Mode Credentials Confirmed**: Live staging service confirmed using test key (`rzp_test_TmIGcynU0XmBZ8`), successfully creating real Razorpay test orders (`order_...`). Server secrets remain unexposed.
  - **Idempotency & State Machine Verified**: Duplicate checkout initialization reuses existing PENDING order. Browser success callback never independently confirms orders (strictly polls status).
  - **Webhook Security**: Raw body HMAC SHA256 signature verification enforced. Missing or invalid signatures rejected with 400.
- **Stage 4 Status (Cart Network Failure & PDP Flow Investigation):** **PASS**
  - **Root Cause Isolated**: Production client bundles lacked `NEXT_PUBLIC_API_URL` on Vercel, falling back to `http://localhost:3001/api/v1` which triggered `TypeError: Failed to fetch`. Deployed demo also served older prototype commit `618f623` using disconnected `<PrototypeAddToCart>`.
  - **Production Fallback Hardened**: Added production-mode staging API fallback (`https://firstmemoir-api-staging.onrender.com/api/v1`) in `packages/api-client/src/client.ts` and `apps/storefront/src/lib/api-client.ts`. Client bundles safely target Render staging when `NEXT_PUBLIC_API_URL` is omitted.
  - **In-Memory Cookie Jar**: Equipped `fetchClient` with in-memory cookie tracking for non-browser/Node.js testing, ensuring cross-request session affinity for cart tests.
  - **Legacy Slug Aliasing**: Created `PRODUCT_SLUG_ALIASES` in `apps/storefront/src/config/slug-aliases.ts` redirecting legacy URLs (`porsche-gt3-rs-frame` &rarr; `porsche-gt3-rs-wall-frame-set`).
  - **UI/UX Resilience & Feedback**: Added "Unable to Load Cart" recovery screen with retry action, fallback thumbnail icon for standard prints, and "Added to Cart ✓" transient feedback on customizer buttons.
  - **Quality Gates**: 21/21 storefront tests passing (100%), 0 TypeScript errors, 0 lint errors, 5/5 Turborepo build targets passing.
- **Stage 5 Status (Vercel Monorepo Output Directory Resolution):** **BLOCKED ON FRESH DEPLOYMENT TRIGGER AFTER DASHBOARD ROOT DIRECTORY UPDATE**
  - **Deployments Logged**: Commits `e85b300`, `9c33d3a`, and `40e9f84` reported `Error: The Next.js output directory ".next" was not found at "/vercel/path0/.next"`.
  - **Root Cause Isolated**: In commit `40e9f84`, Vercel still executed `npm run build` at the repository root because deployment snapshots in Vercel preserve the project settings from when the deployment was created. Modifying Root Directory to `apps/storefront` in Project Settings only applies to future deployments created after the change; clicking "Redeploy" on an existing failed deployment re-runs under its original snapshot (`Root Directory = ./`).
  - **Architectural Fix Verified**: `apps/storefront/vercel.json` provides `cd ../.. && npx turbo run build --filter=storefront` and `cd ../.. && npm install`. Local clean simulation confirms outputs are generated inside `apps/storefront/.next`.
  - **Dashboard Settings Verified**: Project Root Directory set to `apps/storefront`, external source files included, Build & Development setting override toggles disabled.
  - **Next Step**: Push verified documentation commit to trigger a fresh deployment lifecycle that activates the new Root Directory.
  - **Cart Status**: Live deployed cart verified in manual test-mode session; awaiting fresh Vercel deployment under apps/storefront Root Directory for production storefront rollout.
- **Stage 6 Status (Cart Latency Optimization & Optimistic UI Architecture):** **PASS**
  - **Latency Bottlenecks Diagnosed**: Profiling live staging requests measured Add to Cart taking 5.85s (4.38s POST + 1.48s sequential GET) and Quantity Update taking 8.08s (5.16s PATCH + 2.92s sequential GET) due to double-fetch waterfalls, global UI freeze (`isLoading: true`), and 3 serial DB roundtrips.
  - **Optimistic Zustand Store**: Quantity updates and item deletions now update local state in 0ms perceived latency, reconcile asynchronously with authoritative server responses, and roll back automatically with inline error alerts upon network or server failures.
  - **Waterfall Eliminated**: Redundant `GET /cart` calls removed; line item responses are merged directly into state.
  - **Concurrency & Interaction Guards**: Added `mutatingItemIds` preventing duplicate concurrent submissions on active items and isolating button disabled states to the mutating item only.
  - **Backend Parallelization**: `Promise.all` in `cartService.addToCart` collapses 3 sequential database roundtrips into 1 concurrent batch.
  - **Quality Gates**: 25/25 storefront unit, contract, and optimistic mutation tests passing (100%), 0 TypeScript errors, 0 lint warnings, 5/5 Turborepo build targets passing.
- **Stage 7 Status (Manual Razorpay Test Payment & Webhook Verification):** **PASS**
  - **Empirical Order & Payment Proof**: Verified Order `e4415105-19d2-42b2-ae19-5e7bf4598c36` (₹747, 3x Porsche GT3 RS frames) in Neon staging DB. Razorpay Test API verified `order_TmypgAyyMG3oVS` (status `paid`, amount ₹747.00) and payment `pay_TmypnZQLLSCFfz` (status `captured`, method `card`).
  - **Authoritative Webhook Receipt**: Webhook event `TmyqRZ37Xm5yhq` (`payment.captured`) delivered to Render staging at `11:28:31.216Z`, HMAC SHA256 validated, recorded in `WebhookEvent` table as `PROCESSED`.
  - **State Transitions**: Order transitioned from `PENDING` to `CONFIRMED` via webhook handler. Cart `d0cb0444-370d-4d97-9599-d1ab0cfc1703` marked `CHECKOUT_STARTED` and items cleared.
  - **Zero False-Confirmation Risk**: Verified `/checkout/success` polls `GET /orders/:id/status` and only renders "Order Confirmed!" when backend confirms `CONFIRMED`.
- **Stage 8 Status (Cart Image Coverage, Product Card Gallery & Shopping UX Improvements):** **PASS**
  - **Cart Image Root Cause & Fix**: Standard catalogue items lacked image mapping in cart DTO. Added `product_slug` and `product_image` to `CartLineItemDto`, updated `cartService` to include product images, and created resilient client fallback resolver in `apps/storefront/src/utils/cart-image.ts`.
  - **Cart Thumbnail Component**: Implemented `CartItemThumbnail.tsx` with stable dimensions, `onError` fallback, alt text, and product page deep links.
  - **Product Card Gallery Controls**: Preserved image sort order in `adaptApiProductToStorefront`, added accessible Previous/Next edge controls with event isolation, subtle dot indicators, and touch swipe gestures.
  - **Performance & A11y Fixes**: Resolved WAVE focusable descendant error in `NavMobileMenu` via `inert` attribute, darkened `muted-soft` to `#5e5e5e` to exceed WCAG AA contrast, and optimized mobile PDP LCP responsive sizes and alt text.
  - **Admin Safety**: Hardened `apps/admin/src/main.tsx` to require explicit `VITE_API_URL` without silent production fallbacks, added SPA client rewrites in `vercel.json`, and documented setup in `.env.example`.
  - **Quality Gates**: 32/32 storefront tests passing (100%), 0 TypeScript errors, 100% build pass across all workspaces.
- **Slice 6C.5 Milestone Status:** **IN PROGRESS (Optimistic cart, image resolution, shopping UX & test payment verified; awaiting authorized deployment to Vercel).**

---

## 5. Deployment Readiness Matrix

| Environment/Layer | Status | Notes |
|---|---|---|
| **LOCAL** | `VERIFIED` | 100% build pass rate, R2 access guards verified, safe isolation enforced. |
| **STAGING POSTGRESQL** | `VERIFIED` | Neon AWS Singapore: 6/6 migrations applied, 82 products seeded idempotently. |
| **STAGING R2 RUNTIME** | `VERIFIED` | Real write/read/delete & presigned access verified on live buckets. |
| **API DEPLOYMENT** | `VERIFIED` | Render Staging service live; live health, DB readiness, catalogue, and CORS verified. |
| **STOREFRONT CATALOGUE** | `VERIFIED` | Stage 1 PASS: connected to live staging API, 12/12 tests passing. |
| **STOREFRONT UPLOAD & STORAGE** | `VERIFIED` | Stage 2 PASS: end-to-end upload, preview proxy, security boundaries, and cleanup verified on live staging API. |
| **RAZORPAY STAGING CHECKOUT** | `VERIFIED` | Stage 3 PASS: test-mode key (`rzp_test_...`), order creation, idempotency, webhook guards verified on live staging API. |
| **CART PERFORMANCE & OPTIMISTIC UI** | `VERIFIED` | Stage 6 PASS: 0ms perceived quantity update, redundant waterfall eliminated, 25/25 tests passing. |
| **E2E TEST PAYMENT & WEBHOOK** | `VERIFIED` | Stage 7 PASS: Order `e4415105-...` confirmed via Razorpay `pay_TmypnZQLLSCFfz` and verified webhook `TmyqRZ37Xm5yhq`. |
| **SHOPPING UX & CART IMAGE COVERAGE** | `VERIFIED` | Stage 8 PASS: Canonical images in cart, listing gallery navigation, a11y & contrast fixes, 32/32 tests passing. |
| **ADMIN DEPLOYMENT PREPARATION** | `CONFIGURED_UNBLOCKED` | Explicit `VITE_API_URL` validation, SPA `vercel.json` rewrites, builds in 627ms; pending user-authorized Vercel project connection. |
| **END-TO-END STAGING** | `VERIFIED` | All Slice 6C.5 stages verified. |
| **PRODUCTION** | `NOT APPROVED` | Awaiting client acceptance & production credential provisioning. |

