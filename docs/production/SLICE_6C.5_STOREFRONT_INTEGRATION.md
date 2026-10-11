# Slice 6C.5: Storefront Integration with Verified Staging API (Stage 1 Report)

## 1. Executive Summary

This document records the empirical execution, architectural verification, and test results for **Slice 6C.5 (Stage 1: Catalogue Integration Only)**.
The storefront application has been integrated directly with the live Render Staging API (`https://firstmemoir-api-staging.onrender.com/api/v1`), verified against the live Neon PostgreSQL database (82 canonical products across 5 core categories), and guarded with robust error handling, pagination, and image fallbacks.

- **Stage 1 Verdict**: **`PASS`**
- **Monorepo Build**: **`PASS`** (5/5 packages built successfully via Turborepo)
- **Storefront Gates**: **`PASS`** (12/12 integration/contract tests passing, 0 TypeScript errors, 0 ESLint warnings)
- **Stage 2 Gate**: **`UNBLOCKED`** for upload inspection.

---

## 2. Environment & Origin Verification

### 2.1 Backend Staging API
- **Base URL**: `https://firstmemoir-api-staging.onrender.com/api/v1`
- **Environment Variable Convention**: `NEXT_PUBLIC_API_URL`
- **Local Location**: `apps/storefront/.env.local`
- **Vercel Target Environment**: Staging / Preview / Production for project `firstmemoir-demo`
- **CORS Alignment**: Confirmed `https://firstmemoir-demo.vercel.app` matches `CORS_ORIGIN` whitelist on Render Staging (verified HTTP 204 preflight).

### 2.2 Storefront Deployment Target
- **Vercel Project Name**: `firstmemoir-demo` (verified from `.vercel/project.json` and `apps/storefront/.vercel/project.json`)
- **Project ID**: `prj_im5gtdTLYT75CaWEGgk8GoYCDS0a`
- **Live URL**: `https://firstmemoir-demo.vercel.app`
- **HTTP Response**: `HTTP/2 200 OK` (Vercel edge deployment active)

---

## 3. Key Implementation Decisions & Code Changes

### 3.1 Resilient API Client Initialization (`packages/api-client/src/client.ts`)
- **Global Environment Fallback**: Initialized default `API_URL` using `(globalThis as any).process?.env?.NEXT_PUBLIC_API_URL` with fallback to `http://localhost:3001/api/v1`.
- **Cross-Framework Portability**: Safely accessed through `globalThis` to prevent TypeScript `Cannot find name 'process'` (TS2591) errors in Vite/browser packages like `apps/admin`.

### 3.2 Canonical Category Slug Harmonization
- **Issue**: Historical prototype links used `category=frames-8x12`. The live database schema and seeded catalogue established in Slice 6C.3 define canonical slug `frames`. Querying `frames-8x12` against the staging API returned 0 products.
- **Fix**: Updated `Navbar.tsx`, `NavMobileMenu.tsx`, and `app/page.tsx` links to use canonical slug `frames` (which returns 49 products).

### 3.3 Products Page Pagination & Schema Validation (`apps/storefront/app/products/page.tsx`)
- **Pagination**: Implemented `page` search parameter handling and clean pagination controls (`Previous`, `Page X of Y`, `Next`) preserving active `category` and `sort` query filters.
- **Backend Limit Compliance**: The backend API schema validates `limit <= 50`. The storefront requests `limit: 50` and leverages the backend's `meta` envelope (`total: 82`, `page: 1`, `limit: 50`, `totalPages: 2`).
- **Sort Alignment**: Only forwards backend-supported sort values (`newest`, `price_asc`, `price_desc`).
- **Resilience**: Wrapped API requests in try-catch; on failure, displays a graceful, user-friendly `EmptyState` without leaking internal database strings or technical errors.
- **Lint Fix**: Resolved `prefer-const` warning on `products`.

### 3.4 Image Domain Whitelisting & Graceful Fallbacks (`next.config.js`, `ProductCard.tsx`, `ProductImageGallery.tsx`, `ProductLivePreview.tsx`)
- **Next.js Remote Patterns**: Whitelisted `pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev` (staging R2 public bucket), `pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev` (dev), `*.r2.dev` wildcard, and dynamic `NEXT_PUBLIC_R2_PUBLIC_URL`.
- **Image Error Boundaries**: Added `onError` handlers across `ProductCard`, thumbnail galleries, and `ProductLivePreview` to gracefully substitute a fallback placeholder if an R2 public asset is unavailable or fails to load, preventing UI breakage.

---

## 4. Empirical Test & Verification Results

### 4.1 Automated Test Suite (`apps/storefront/src/__tests__/catalogue-integration.test.ts`)
Executed with Node.js test runner against live Render staging API:
- `1.1: Storefront Product Adapter maps complete ProductDto`: **PASS**
- `1.2: Storefront Product Adapter handles sparse/null optional fields`: **PASS**
- `2.1: Categories API returns 5 canonical categories`: **PASS** (`bookmarks`, `custom-prints`, `frames`, `posters`, `wall-art`)
- `2.2: Products API page 1 returns 50 products with total: 82, totalPages: 2`: **PASS**
- `2.3: Products API page 2 returns 32 products`: **PASS**
- `2.4: Filtering category 'frames' returns 49 products`: **PASS**
- `2.5: Filtering category 'posters' returns 27 products`: **PASS**
- `2.6: Filtering category 'bookmarks' returns 6 products`: **PASS**
- `2.7: Filtering category 'custom-prints' returns 0 products (stock catalogue only)`: **PASS**
- `2.8: Filtering category 'wall-art' returns 55 products`: **PASS**
- `2.9: Fetching single product by slug returns valid product DTO`: **PASS** (`one-piece-wanted-posters-pack-of-10`)
- `2.10: Adapting all live page 1 products produces valid StorefrontProduct instances`: **PASS**
- **Total Tests**: **12 / 12 PASS (100%)**

### 4.2 Monorepo Quality Gates
| Command | Target | Result | Notes |
|---|---|---|---|
| `npm --workspace=storefront run check-types` | `apps/storefront` | **PASS** | 0 TypeScript errors |
| `npm --workspace=storefront run lint` | `apps/storefront` | **PASS** | 0 ESLint errors, 0 warnings |
| `npm --workspace=storefront run test` | `apps/storefront` | **PASS** | 12/12 tests passed |
| `npm --workspace=storefront run build` | `apps/storefront` | **PASS** | Next.js 16.2.0 Turbopack build succeeded |
| `npx turbo run build` | Monorepo (5 packages) | **PASS** | All 5 packages built cleanly (`admin`, `api`, `storefront`, `@repo/shared`, `@repo/database`) |
| `git diff --check` | Repository | **PASS** | 0 trailing whitespace or merge conflict errors |

---

## 5. Summary of Files Changed

| File | Change Description |
|---|---|
| `packages/api-client/src/client.ts` | Default `API_URL` to `process.env.NEXT_PUBLIC_API_URL` via `globalThis` safely. |
| `apps/storefront/next.config.js` | Added staging R2 bucket domain and `*.r2.dev` to `images.remotePatterns`. |
| `apps/storefront/package.json` | Added `"test": "node --env-file=.env.local --import tsx --test 'src/**/*.test.ts'"`. |
| `apps/storefront/app/page.tsx` | Harmonized category links from `frames-8x12` to canonical `frames`. |
| `apps/storefront/src/components/Navbar.tsx` | Harmonized desktop header link to `frames`. |
| `apps/storefront/src/components/NavMobileMenu.tsx` | Harmonized mobile navigation link to `frames`. |
| `apps/storefront/app/products/page.tsx` | Added pagination controls, API sort alignment, error resilience, and fixed `prefer-const` lint. |
| `apps/storefront/src/components/ProductCard.tsx` | Added `imgSrc` state and `onError` image fallback. |
| `apps/storefront/src/components/ProductImageGallery.tsx` | Added `onError` fallback on thumbnail previews. |
| `apps/storefront/src/components/ProductLivePreview.tsx` | Added `baseImgSrc` state and `onError` fallback on mockup base layer. |
| `apps/storefront/src/__tests__/catalogue-integration.test.ts` | Created focused unit and live API contract test suite (12 tests). |

---

## 6. Next Steps & Stage 2 Gate

- **Stage 1 Status**: **`PASS`**
- **Stage 2 Gate**: **`UNBLOCKED`**
- **Next Planned Action**: Inspect the existing upload implementation, API contracts, session/ownership requirements, R2 key boundaries, and frontend upload flow before performing a harmless staging test upload.
