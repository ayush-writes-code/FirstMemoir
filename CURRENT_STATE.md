# Current State of FirstMemoir.in (as of final week stabilization)

This document represents the authoritative current state of the FirstMemoir project. It supersedes older claims in `PROJECT_STATE.md` and phase documentation. 

**IMPORTANT CLARIFICATIONS:**
- **No Production Readiness Claim:** The codebase is NOT currently considered "production ready." It requires real client data and proper infrastructure credentials to be fully tested and deployed.
- **No BullMQ / Redis:** There is NO BullMQ or Redis implementation in the repository. Do not build or assume these exist unless specifically requested.
- **No Automated CMYK Generation:** There is NO automated CMYK PDF print pipeline currently implemented.
- **No Mock R2 Credentials:** The app requires a real remote Cloudflare R2 bucket to function. The old "mock credentials" claims are false.

## 1. Codebase & Git Status
- **Exact HEAD commit:** `8e9d826`
- **Working Tree:** Clean (all stabilization fixes for `ProductCustomizer`, `ProductPreviewContext`, `notification.service.test.ts`, and `docker-compose.test.yml` committed).
- **Branch:** `phase-3-2-categories`

## 2. Local Environment Setup
- **Storefront:** Runs on `localhost:3000` via `npm run dev`. Connects to `localhost:3001/api/v1`.
- **API:** Runs on `localhost:3001` via `npm run dev` (ts-node). 
- **Database:** Local Docker PostgreSQL running on `localhost:54320` (`test_db`).
- **Tests:** Run via `npm run test` ensuring quality gates are met. Tests cover Razorpay, Shiprocket webhooks, and Notifications securely.

## 3. Database Environment Rules
- Local development strictly defaults to the local Docker database (`localhost:54320/test_db`). 
- **Docker-Compose:** The `docker-compose.test.yml` includes a persistent named volume (`postgres-test-data`) to retain seeded data across restarts.
- **Neon Staging:** The production/staging Neon database (`ep-wispy-glitter-axsmkbyo`) must NOT be targeted during normal local development to prevent data pollution. Explicit overrides (e.g. `.env.staging`) are required to target Neon.

## 4. Current Catalog State
- The local Docker DB is seeded with 6 categories, 6 frame materials, and 9 premium products (featuring realistic options and exclusions). These are placeholders.
- Real client product data is required before proceeding.

## 5. Verified Customer Flow
- The local browser flow has been manually evaluated and structurally checked via Playwright logic.
- **Render Loop Fixed:** The `ProductPreviewContext` was fixed to use a memoized `setUploadData` and correctly synchronizes upload ID back to local component state on "Done".
- **Flow:** HOME → PRODUCT → CONFIGURE → UPLOAD → CROP → PREVIEW → CONFIRM → CART → CHECKOUT can progress correctly, given valid R2 configuration.

## 6. Test Results (Quality Gates)
- **`npm run check-types`:** Passing (0 errors across all workspaces).
- **`npm run lint`:** Passing (6 minor unused variables/exhaustive deps warnings in Admin, but 0 errors).
- **`npm run build`:** Passing successfully for Database, UI, Shared, Storefront, Admin, and API.
- **API Unit/Integration Tests:** 110/110 tests passing (0 failures). Deterministic polling was introduced to fix the `NotificationService` asynchronous test flake.

## 7. R2 Status
- **Local:** Presigned URLs, `PUT` requests, and `Sharp` preview generation are fundamentally functional when valid credentials are provided in `.env`.
- **Vercel / Production:** R2 CORS currently returns 403 on the Vercel deployed origin because the Vercel origin is not whitelisted in the Cloudflare bucket settings.

## 8. Deployment Status
- **Storefront:** Initial deployment to `https://firstmemoir-storefront.vercel.app` (currently broken due to R2 CORS and missing Render API).
- **API (Render):** Intentionally deferred.
- **Database (Neon):** Exists, but currently isolated from local development.

## 9. Client-Data Requirements (Blockers)
The project is strictly blocked from advancing into a production state until the client provides:
- Product list, names, and SKUs
- Real prices and categories
- Frame/material and glass/paper options
- Physical dimensions, package dimensions, and product/package tare weights
- Product photography and mockup assets
- Print geometry requirements and manufacturing requirements
- Shiprocket pickup information
- Legal/business information

## 10. Next Milestone
The immediate next milestone is **Catalog Onboarding**. We must wait for the client to deliver the data listed above, and map it directly into the existing architecture rather than inventing new systems or redesigning the schema.
