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

## 11. Stabilization Acceptance (Sept 20, 2026)
This audit explicitly verifies the following against commit `a1c0dae`:

- **Commit SHA:** `a1c0dae`
- **Verified Quality Gates:** 
  - `check-types`: Passed (0 errors)
  - `lint`: Passed (0 errors)
  - `build`: Passed (all 9 packages)
  - `test`: Passed (API integration & unit tests, 110 tests total)
- **Browser Verification Scope:** Verified Home → Product → Customize → Upload → Crop → Save → Preview via Playwright script using local R2 upload logic. 
- **R2 Status:** Local proxying is VERIFIED. Production/Vercel CORS is BLOCKED (Cloudflare CORS responds with `403 Forbidden` for Vercel origin `https://firstmemoir-storefront.vercel.app`, but works for `http://localhost:3000`).
- **Database Safety Status:** VERIFIED. Local `.env` correctly targets `localhost:54320/test_db`. `npm run db:reset` is fail-closed. No production secrets or Neon connection strings are tracked by Git. Local DB data persists correctly across container restarts using the `postgres-test-data` volume.
- **Health Endpoints:**
  - `/api/health/live`: Liveness probe (process is up).
  - `/api/health/ready`: Readiness probe (database is reachable).
  - `/api/v1/health`: Does not exist.
- **Remaining Blockers:** R2 CORS on Cloudflare, missing physical product dimensions, actual SKUs, pricing, Print geometry guidelines, and Shiprocket credentials.
- **Explicit Statement:** The full purchase-to-fulfillment flow (including Razorpay production, CMYK/PDF generation, and live Shiprocket AWB generation) is NOT yet fully verified. No BullMQ/Redis pipelines exist.

## 12. Pre-Meeting Completion Sprint (Sept 20, 2026)
This sprint successfully removed temporary architectural hardcoding to make the catalog system entirely data-driven ahead of the final product matrix meeting.

### What was completed:
- Extended Prisma `Product` schema with `mockup_metadata` and `manufacturing_metadata` JSON fields.
- Removed hardcoded mockup fallbacks (`anniversary-canvas`, `family-portrait-frame`) from frontend source (`mockupCoordinates.ts`), migrating them entirely to `ProductLivePreview` JSON-driven logic.
- Upgraded `ProductImageGallery` and `PersonalizationWorkspace` to pass `mockup_metadata` dynamically.
- Extended `ProductDto` and API schemas (`createProductSchema`, `updateProductSchema`) to officially accept metadata JSON.
- Engineered dynamic packaging integration: `checkout.service.ts` now automatically extracts `packaging` metadata from the `Size` option and immutably snapshots it into the `OrderItem`'s `customization_data`.
- Removed the strict `PACKAGE_FULFILLMENT_METRICS_UNDEFINED` throw in `shiprocket.service.ts` in favor of parsing the immutable snapshot data `length`, `width`, `height`, `weight_kg`.
- Established `docs/catalog-onboarding/CATALOG_DATA_CONTRACT.md`.

### What remains dependent on meeting data:
- Final categories, products, SKUs, and pricing.
- Exact packaging dimension inputs for Shiprocket.
- Real mockup assets and coordinate configurations.

### Schema gaps / Technical Blockers:
- No currently known schema gaps based on requirements available as of September 20, 2026.

## 13. Pre-Meeting Forensic Audit & Admin Catalog Readiness (Sept 20, 2026)
A thorough forensic audit was conducted on the architecture introduced in the Pre-Meeting sprint, and the remaining admin catalog editing gap was closed.

### Completed Engineering Capabilities
* **Admin Metadata Management**:
  - `ProductForm` upgraded with a dedicated "Mockup & Metadata" tab (in Edit mode) and expandable advanced section (in Create mode).
  - Admins can configure and edit `mockup_metadata` using preset templates (3-Layer Scene, Coordinates) with real-time JSON validation matching backend rules.
  - Admins can configure and edit passive `manufacturing_metadata` JSON.
  - `ProductOptionsEditor` upgraded with structured physical dimension inputs (width, height, unit), packaging courier inputs (L×W×H, weight), and raw JSON mode.
  - Added option value editing without requiring record deletion (`PUT /api/v1/products/:id/options/:optionId/values/:valueId`).
  - Added backend validation for option value metadata (`optionValueMetadataSchema`) preventing negative or malformed metrics.
* **Product metadata is data-driven**: The API enforces a strict Zod schema for `mockup_metadata` rejecting malformed/impossible coordinates before reaching the DB.
* **Mockup hardcoding was removed**: Verified that no `anniversary-canvas` or `family-portrait-frame` legacy logic runs in the application; only valid seed fixtures remain.
* **Order snapshots remain immutable**: Cart extraction to `customization_data` safely copies state once and ignores subsequent catalog modifications.
* **Packaging flows cleanly to fulfillment**: `shiprocket.service.ts` reads packaging metrics directly from the immutable snapshot with strict positive-number validation, rejecting missing/invalid values cleanly without fabricated fallback defaults.

### Readiness Status
Engineering-side catalog configuration is prepared as far as current known requirements allow. Remaining unknowns are business/product decisions that must come from the client meeting.

### Still unknown until meeting
* **Packaging cardinality**: It is UNKNOWN whether packaging box dimensions and weights vary purely by Size, or by combinations of Size + Frame, or per product variant.
* **Exact manufacturing metadata**: `manufacturing_metadata` is currently a passive storage field with no assumptions hardcoded.
* **Final mockup structure/assets**: Awaiting real geometry and image URLs.
* **Real product variants**: Awaiting the final SKU/pricing matrix.
* **Manufacturer output requirements**: Still waiting on real-world partner constraints.

## 14. Production Conversion Sprint — Catalog Forensics (Sept 23, 2026)

Client provided real listing data at `/Users/ayushtomar/Downloads/listingx for website/`.

### Verified Counts
* **452** image/asset files, **68** info.txt metadata files, **82** leaf folders
* **14** folders have NO metadata at all (F&F Cars: 8, Split Anime: 6)
* **48** listings have verified selling prices (₹249–₹299)
* **13** listings have placeholder prices (`[Generate XXX rupees bank settlement]`)
* **41** folders have SKUs, **41** do not

### Product Classification
* 82 leaf folders do NOT represent 82 unique products
* 4 standalone products, 4 pack-size variants, 67 design variants, 8 asset groups with no metadata
* Estimated sellable units: 12–82 depending on how design variants are modeled
* **ZERO** personalization/custom photo upload products in supplied data

### Categories Identified
* Wall Frames (8×12 framed prints): Football, Motivational Quotes, Cars, Porsche
* Posters & Wall Art: Anime, Car Split, Ronaldo Split, Split Anime, Football, Cars
* Bookmarks: Animal, Anime, Panda/Quotes

### Business Decisions Still Required
* Design variant modeling: separate Products vs. Options on a parent Product
* MRP/strikethrough pricing: whether to display on website
* SKU format and assignment policy
* Brand name: PosterNet (marketplace) vs. FirstMemoir (website)
* Real selling prices for 27 listings without verified prices
* Packaging cardinality (unchanged from previous)

### Documentation Created
* `docs/catalog-onboarding/REAL_CATALOG_INVENTORY.md` — corrected forensic inventory
* `docs/catalog-onboarding/CATALOG_SOURCE_MAPPING.md` — source-to-schema mapping
* `docs/catalog-onboarding/SKU_POLICY.md` — proposed SKU format
* `docs/production/PRODUCTION_READINESS.md` — production readiness tracker

### Navigation Updated
* Desktop and mobile navigation updated with real categories: Shop All, Frames, Posters
* Committed as `feat: implement firstmemoir info architecture in navigation`

### Schema Assessment
* No schema changes required for current catalog
* MRP/compare-at pricing requires a schema addition ONLY if business confirms strikethrough display
* Existing `Product`, `ProductOption`, `ProductOptionValue`, `ProductImage` models handle all supplied product types

## 15. Production Conversion Sprint — Shop Page & Asset Branding (Sept 23, 2026)

### Shop / Category Implementation
* Implemented `/products` Shop page using a static **PROTOTYPE_CATALOG** subset (10 products) instead of polluting the DB.
* Customer-facing taxonomy established: Frames, Posters, Bookmarks.
* Product Cards properly handle products with verified prices vs "Price coming soon".
* Functional real-time sorting (Newest, Price Low-High, Price High-Low) and category filtering.
* Adhered strictly to Naysha/Zoomin editorial direction (no noisy badges, no fake reviews).
* **Personalization Architecture Preserved**: The source catalog contains no upload/custom products, but the storefront personalization UI remains intact for future standard vs. personalized split.

### Asset Branding Audit
* Verified that "PosterNet" is NOT embedded in the binary EXIF/metadata of the catalog images.
* OCR (Tesseract) on representative images did not find "PosterNet" text pixels.
* **Result**: Assets classified as *SAFE FOR STOREFRONT (Prototype Phase)*, but marked as *REQUIRES CLIENT CONFIRMATION (Production Phase)* to visually rule out subtle watermarks.
* Documented in `docs/catalog-onboarding/ASSET_BRANDING_AUDIT.md`.

## 16. Production Conversion Sprint — PDP & Prototype Data Boundary (Sept 23, 2026)

### Data Architecture Cleanup
* Replaced unsafe `as unknown as ProductDto` cast with a stable UI-facing `StorefrontProduct` model.
* Moved the 10-item static subset to a dedicated `lib/prototype-data.ts` to enforce a strict boundary between verified database data and prototype visual data.

### Product Detail Page (PDP)
* Refactored `/products/[slug]/page.tsx` to serve BOTH the prototype subset (standard prints) and real API database data (personalized/custom products).
* Built a responsive `ProductGallery` component for the prototype products.
* Followed editorial design guidelines (minimal controls, premium whitespace, no fake badges).
* **Cart Isolation**: Added an isolated `PrototypeAddToCart` component to prevent the prototype catalog from performing fake/broken transactions against the real database cart.
* Missing prices gracefully disable the Add to Cart flow.

## 17. Production Pipeline Foundation (Sept 23, 2026)

### Production Prototype Gating & Clean Exit Plan
* Explicitly disabled `PROTOTYPE_CATALOG` from rendering in production builds (`NODE_ENV === 'production'`).
* `PrototypeAddToCart` fake success is disabled in production environments.
* **Exit Plan**: When Track A business decisions are complete, we will execute the dry-run importer in mutation mode to hydrate the DB. Then `lib/prototype-data.ts` and `<PrototypeAddToCart />` will be safely deleted. The storefront will natively fallback to `ProductDto` → `StorefrontProduct` adapter → Shop/PDP.

### Catalog Import & R2 Manifest Pipeline
* Created a deterministic **Dry-Run Catalog Importer** (`apps/api/scripts/dry-run-importer.ts`) that reads the source directory, classifies 80 distinct leaf folders, and generates an ingest report without touching the database.
* Importer outputs an automated `R2_ASSET_MIGRATION_MANIFEST.md` establishing the exact mapping of source images to Cloudflare R2 keys.
* Formalized the `CATALOG_IMPORT_CONTRACT.md` detailing how raw source fields map to the Prisma database schema.

### Blocker Triaging
* Separated development workflow into Track A (Business Dependent) and Track B (Engineering Executable).
* Created `docs/production/PRODUCTION_BLOCKERS.md` to isolate remaining client decisions (Variant Grouping, Missing Prices, Packaging Rules, SKU Policy, PosterNet Visual Clearance) from actionable engineering configurations.

## 18. Final Pre-Client Handoff State (Sept 23, 2026)

**Engineering:**
- LOCAL VERIFIED: Core startup, API health checks, and webhook security.
- CONFIGURATION VERIFIED: Docker migration contract, Render/Vercel ENV routing.
- REMOTE DEPLOYMENT NOT VERIFIED: Remote deployment is intentionally blocked pending client platform access.

**Catalog:**
- 82 source leaf folders reconciled.
- DRY-RUN VERIFIED ONLY: Importer explicitly parses data safely without database writes.
- NO PRODUCTION MUTATION: Seed records and UI mockups remain segregated from the production environment.

**Assets:**
- 452 source assets identified.
- NO PRODUCTION UPLOAD: Asset migration is blocked pending visual/legal approval.

**Business (Client Inputs Required):**
- **Product Structure:** Ambiguous variant cardinality (78 cases).
- **Pricing:** 14 missing prices, 20 instructional placeholder prices.
- **SKU:** 41 missing SKUs.
- **Fulfillment:** 82 missing packaging dimension/weight sets.
- **Mockups:** 82 missing coordinate geometries.
- **Clearance:** PosterNet branding and commercial license verification.

**Platform (Access Required):**
- **Deployment:** Render CLI / Dashboard access, Vercel Dashboard access.
- **Cloudflare:** R2 CORS bucket configuration access.
- **Credentials:** Live Razorpay API Keys, Live Shiprocket account credentials.

*(See `docs/catalog-onboarding/CLIENT_CATALOG_INPUT_CHECKLIST.md` for the explicit handover contract).*
