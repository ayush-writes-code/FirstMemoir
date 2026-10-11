# FirstMemoir — Cart Failure Investigation & Resolution Report

**Milestone:** Slice 6C.5 Storefront Integration  
**Focus:** Cart Network Failure & PDP Add-to-Cart Flow Investigation  
**Target Environments:**
- Storefront: `https://firstmemoir-demo.vercel.app`
- Staging API: `https://firstmemoir-api-staging.onrender.com`
- Database: Neon PostgreSQL (AWS Singapore Staging)

---

## 1. Executive Summary

A critical issue was reported on the deployed FirstMemoir demo:
- Navigating to `https://firstmemoir-demo.vercel.app/cart` or interacting with product pages such as `/products/porsche-gt3-rs-frame` resulted in **"Failed to fetch"** on the cart page.
- Adding items on the prototype PDP did not populate the cart.

A focused, zero-regression debugging slice was conducted to isolate the failure, audit the architectural flow, and implement permanent fixes without weakening authentication, CORS, cookie security, or server-authoritative pricing.

All fixes have been implemented, tested, and validated. Storefront tests pass **21 / 21 (100%)**, monorepo typecheck reports 0 errors, and Turborepo builds 5 / 5 packages cleanly.

---

## 2. Root Cause Analysis

Tracing the end-to-end request lifecycle revealed three intersecting root causes:

### Root Cause 1: Unset `NEXT_PUBLIC_API_URL` Defaulting to Localhost in Production
- **Mechanism:** In `packages/api-client/src/client.ts` and `apps/storefront/src/lib/api-client.ts`, the client initialized with:
  ```ts
  let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  ```
- **Vercel Build State:** On Vercel, the environment configuration lacked `NEXT_PUBLIC_API_URL`. At build time, Next.js inlined `http://localhost:3001/api/v1` into the production client bundle.
- **Client Failure:** When any user visited `/cart` in a browser, `useCartStore` attempted to execute:
  ```ts
  fetch('http://localhost:3001/api/v1/cart', { credentials: 'include' })
  ```
  Because the user's local machine has no Express service listening on port 3001, the browser immediately aborted the request with:
  `TypeError: Failed to fetch`.

### Root Cause 2: Outdated Vercel Deployment with Prototype Add-to-Cart Mock
- **Mechanism:** The live Vercel demo (`https://firstmemoir-demo.vercel.app`) was serving a previous build from commit `618f623` (predating the Slice 6C.5 integration).
- **Behavior:** In that version, the PDP rendered `<PrototypeAddToCart>`, an isolated UI component that only managed local toggle state (`"Adding..."` -> `"Added!"`) without calling `useCartStore` or the backend API.

### Root Cause 3: Legacy vs. Canonical Catalogue Product Slugs
- **Mechanism:** Prototype mock data referenced `/products/porsche-gt3-rs-frame`.
- **Catalogue Reality:** In PostgreSQL (ingested in Slice 6C.4), the canonical database product is `porsche-gt3-rs-wall-frame-set` (SKU `FM-FRM-POR-GT3`, base price ₹249).
- **Impact:** Requests to fetch `porsche-gt3-rs-frame` directly against the API returned 404 Not Found, preventing customizer and cart actions for legacy links.

---

## 3. Exact Fix Implemented

### 1. Production Staging API Fallback (`packages/api-client` & `apps/storefront`)
- Updated `packages/api-client/src/client.ts` and `apps/storefront/src/lib/api-client.ts`:
  ```ts
  const DEFAULT_API_URL = process.env.NODE_ENV === 'production'
    ? 'https://firstmemoir-api-staging.onrender.com/api/v1'
    : 'http://localhost:3001/api/v1';

  let API_URL = envApiUrl || DEFAULT_API_URL;
  ```
- If `NEXT_PUBLIC_API_URL` is omitted in Vercel or any production deployment, the bundle now safely connects to the live Render staging backend instead of failing on `localhost:3001`.
- Added an in-memory session cookie jar to `fetchClient` for non-browser/Node.js environments, ensuring integration tests and server-side operations maintain session cookies across requests just like browsers.

### 2. Legacy Slug Aliasing & Canonical Redirection (`apps/storefront`)
- Created `apps/storefront/src/config/slug-aliases.ts` to map legacy/prototype URLs to canonical catalogue slugs:
  - `porsche-gt3-rs-frame` &rarr; `porsche-gt3-rs-wall-frame-set`
  - `toyota-supra-wall-frame` &rarr; `ff-supra-frame`
  - `hustle-hard-motivation-frame` &rarr; `motivation-quote-frame-03`
  - `focus-motivation-frame` &rarr; `motivation-quote-frame-09`
  - `ronaldo-real-madrid-split-poster` &rarr; `ronaldo-real-madrid-club-split-poster`
- In `apps/storefront/app/products/[slug]/page.tsx`:
  - Added an HTTP 307 `redirect()` so legacy URLs seamlessly transfer users to the canonical catalogue page.
  - Resolved `generateMetadata` to use the canonical slug for SEO and OpenGraph tags.

### 3. Cart Page Resilience & Standard Item Thumbnail Handling (`apps/storefront/app/cart/page.tsx`)
- Replaced the unstyled `{error}` string with a structured "Unable to Load Cart" recovery screen featuring:
  - Clear user-facing message explaining the connection failure.
  - Interactive "Try Again" retry action (`fetchCart()`).
  - "Browse Collections" navigation link.
- Handled standard catalogue products lacking a custom photo crop (`preview_url: null`):
  - Rendered a fallback icon container (`Package` icon with "Wall Art" label) instead of a broken empty box or "No Preview" placeholder.

### 4. Immediate Add-to-Cart Visual Feedback (`apps/storefront/src/components/ProductCustomizer.tsx`)
- Added transient `justAdded` feedback state:
  - Desktop CTA displays **"Added to Cart ✓"** for 2 seconds upon successful API response before resetting.
  - Sticky mobile bar CTA displays **"Added ✓"** for 2 seconds.

### 5. Automated Regression Test Suite (`apps/storefront/src/__tests__/cart-integration.test.ts`)
- Added 9 automated integration and live contract tests:
  1. Default to staging API URL in production when `NEXT_PUBLIC_API_URL` is unset.
  2. Prioritize explicit `NEXT_PUBLIC_API_URL` when provided.
  3. Resolve prototype slug `porsche-gt3-rs-frame` to `porsche-gt3-rs-wall-frame-set`.
  4. Fetch canonical Porsche product from live staging API (`GET /products/porsche-gt3-rs-wall-frame-set`).
  5. Fetch active cart session (`GET /cart`).
  6. Add standard product to cart with backend-authoritative pricing (`POST /cart/items`).
  7. Verify subtotal calculation.
  8. Update line item quantity (`PATCH /cart/items/:id`).
  9. Remove item from cart cleanly (`DELETE /cart/items/:id`).
- Configured `--test-concurrency=1` in `apps/storefront/package.json` to prevent TLS reset flakiness on Render staging during automated suites.

---

## 4. Verification Evidence

### Monorepo Quality Gates
| Check | Command | Result | Details |
|---|---|---|---|
| **Storefront Tests** | `npm --workspace=storefront run test` | **21 / 21 PASS (100%)** | 12 catalogue tests + 9 cart integration tests |
| **Storefront Typecheck** | `npm --workspace=storefront run check-types` | **PASS** | 0 TypeScript errors |
| **Monorepo Typecheck** | `npm run check-types` | **PASS** | Checked `admin`, `api`, `storefront`, `@repo/*` |
| **Monorepo Lint** | `npm run lint` | **PASS** | 0 ESLint warnings, 0 errors |
| **Storefront Build** | `npm --workspace=storefront run build` | **PASS** | Compiled clean via Next.js Turbopack |
| **Monorepo Build** | `npx turbo run build` | **PASS** | 5 / 5 packages built successfully |

### Live Backend Verification
- `GET https://firstmemoir-api-staging.onrender.com/api/health/live` &rarr; HTTP 200 `{"status":"ok"}`
- `GET https://firstmemoir-api-staging.onrender.com/api/health/ready` &rarr; HTTP 200 `{"status":"ready","database":"connected"}`
- `OPTIONS https://firstmemoir-api-staging.onrender.com/api/v1/cart` &rarr; HTTP 204 No Content with `Access-Control-Allow-Origin: https://firstmemoir-demo.vercel.app` and `Access-Control-Allow-Credentials: true`.
- `POST https://firstmemoir-api-staging.onrender.com/api/v1/cart/items` &rarr; HTTP 201 Created with authoritative price ₹249 and signed `cart_session` cookie (`SameSite=None; Secure; HttpOnly`).

---

## 5. Deployment Status & Action Items

### Local & Staging Codebase
- **Status:** **VERIFIED & READY**
- The codebase correctly defaults to the Render staging API in production and handles cart sessions, canonical product slugs, and cart error recovery.

### Vercel Production Demo (`firstmemoir-demo.vercel.app`)
- **Status:** **AWAITING REDEPLOYMENT**
- The live Vercel deployment is running an older commit (`618f623`) which does not contain:
  1. The Slice 6C.5 storefront integration.
  2. The production fallback to `https://firstmemoir-api-staging.onrender.com/api/v1`.
  3. The canonical slug redirection for `porsche-gt3-rs-frame`.
- **Action Required to Complete Deployment:**
  1. Push current commit to `phase-3-2-categories`.
  2. In Vercel Project Settings (`firstmemoir-demo`), set:
     ```env
     NEXT_PUBLIC_API_URL=https://firstmemoir-api-staging.onrender.com/api/v1
     ```
  3. Trigger a redeploy of `firstmemoir-demo` on Vercel.
  4. Once deployed, verify in browser at `https://firstmemoir-demo.vercel.app/cart`.

---

## 6. Vercel Monorepo Build Failures & Architectural Resolution

### Deployment Failure Log & Post-Mortem (Commits `e85b300` & `9c33d3a`)
- **First Failure (`e85b300`):** Vercel ran root `npm run build` (`turbo run build`), compiled Next.js in `apps/storefront` successfully, and then aborted with:
  ```text
  Error: The Next.js output directory ".next" was not found at "/vercel/path0/.next".
  ```
- **Second Failure (`9c33d3a`):** Commit `9c33d3a` added `"apps/storefront/.next/**"` to `turbo.json` outputs. Vercel ran the exact same root build and failed with the identical error.
- **Why `turbo.json` Did Not Resolve the Issue:**
  Turborepo's `outputs` configuration only determines which directories are persisted and restored to/from Turborepo's task cache. It **never physically relocates or copies** build artifacts on disk. The Next.js builder (`@vercel/next`) evaluates `${RootDirectory}/.next`. Because Vercel's Root Directory was configured as the repository root (`/vercel/path0`), `@vercel/next` inspected `/vercel/path0/.next`, where no `.next` folder exists.
- **Deployment Status:** **NOT FIXED.** The deployed cart is not marked working until the Vercel project configuration is corrected and live end-to-end verification passes.

### Correct Monorepo Architecture: Root Directory = `apps/storefront`
Vercel's intended architecture for deploying a single Next.js application within a monorepo is to set the project's **Root Directory** to the application package itself:

1. **Root Directory:** `apps/storefront`
   - Vercel evaluates the output directory relative to `apps/storefront`, resolving `.next` to `/vercel/path0/apps/storefront/.next`.
   - This matches Next.js's native build output with zero path discrepancy.
2. **Access to Monorepo Workspace Packages:**
   - Setting: "Include source files outside of the Root Directory in the Build Step" is **ENABLED**.
3. **Workspace-Aware Commands:**
   - **Install Command:** `cd ../.. && npm install` (installs from root so workspaces `@repo/*` are linked).
   - **Build Command:** `cd ../.. && npx turbo run build --filter=storefront` (builds upstream dependency `@repo/shared` via Turborepo, then compiles `storefront`).
4. **File-Based Configuration (`apps/storefront/vercel.json`):**
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "nextjs",
     "buildCommand": "cd ../.. && npx turbo run build --filter=storefront",
     "installCommand": "cd ../.. && npm install"
   }
   ```
5. **Turbo Configuration Cleaned:**
   - Reverted speculative `apps/storefront/.next/**` declarations in `turbo.json` back to standard `[".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]`.


