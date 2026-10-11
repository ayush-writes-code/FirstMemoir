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
- **Stage 3 Gate:** **UNBLOCKED** (Checkout & Razorpay sandbox integration).

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
| **RAZORPAY STAGING** | `CONFIGURED_TEST_MODE` | Test mode credentials injected in Render; ready for Stage 3 sandbox checkout verification. |
| **END-TO-END STAGING** | `NEXT_GATE` | Stage 1 & Stage 2 PASS; Stage 3 (sandbox checkout) next. |
| **PRODUCTION** | `NOT APPROVED` | - |
