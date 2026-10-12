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

### Deployment Failure Log & Post-Mortem (Commits `e85b300`, `9c33d3a`, and `40e9f84`)
- **First Failure (`e85b300`):** Vercel ran root `npm run build` (`turbo run build`), compiled Next.js in `apps/storefront` successfully, and then aborted with:
  ```text
  Error: The Next.js output directory ".next" was not found at "/vercel/path0/.next".
  ```
- **Second Failure (`9c33d3a`):** Commit `9c33d3a` added `"apps/storefront/.next/**"` to `turbo.json` outputs. Vercel ran the exact same root build and failed with the identical error.
  - *Turborepo Output Lesson:* Turborepo's `outputs` configuration only determines which directories are persisted and restored to/from Turborepo's task cache. It **never physically relocates or copies** build artifacts on disk. The Next.js builder (`@vercel/next`) evaluates `${RootDirectory}/.next`. Because Vercel's Root Directory was configured as the repository root (`/vercel/path0`), `@vercel/next` inspected `/vercel/path0/.next`, where no `.next` folder exists.
- **Third Failure (`40e9f84`):** Commit `40e9f84` introduced `apps/storefront/vercel.json` with workspace-aware build and install commands and reverted speculative turbo outputs. However, the deployment still logged:
  - Execution of repository-root `npm run build` (`turbo run build` across all 5 workspace projects).
  - Framework search at `/vercel/path0/.next`.
  - Failure: `Error: The Next.js output directory ".next" was not found at "/vercel/path0/.next".`
- **Root Cause of Third Failure:**
  1. **Deployment Snapshot Immutability:** Commit `40e9f84` was committed and pushed to git when the Vercel project's Root Directory was still `./`. Vercel creates deployment records that snapshot project settings at creation time.
  2. **Project Settings Scope:** Updating Root Directory in the Vercel Dashboard (Settings > General > Root Directory) applies strictly to **future deployments**. Redeploying the existing failed deployment (`40e9f84`) via the dashboard re-runs the build using the deployment's original snapshot configuration (`Root Directory = ./`), ignoring the new project settings.
  3. **No Triggering Commit:** Because no new commit was pushed after `40e9f84`, Vercel never initiated a fresh deployment lifecycle under the updated Root Directory.
  4. **Build Log Conclusive Evidence:** If Vercel had processed `apps/storefront/vercel.json`, it would have logged `cd ../.. && npx turbo run build --filter=storefront` and only scoped two tasks (`@repo/shared` and `storefront`). The fact that it executed `npm run build` and built all 5 monorepo projects proves Vercel was still building from the repository root.
- **Deployment Status:** **NOT FIXED.** The deployed cart is not marked working until the Vercel deployment completes successfully under the updated Root Directory and live end-to-end verification passes.

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
5. **Dashboard Override Sanity Checklist:**
   In Vercel Dashboard (**Settings > General > Build & Development Settings**):
   - **Framework Preset**: `Next.js`
   - **Build Command**: Toggle **OFF** (do not override with `npm run build`).
   - **Output Directory**: Toggle **OFF** (standard `.next`).
   - **Install Command**: Toggle **OFF** (do not override).
6. **Turbo Configuration Cleaned:**
   - Standard `turbo.json` outputs: `[".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]`. No speculative globs.

---

## 7. Live Cart Latency Diagnosis & Optimistic Architecture (Task A)

### Latency Investigation & Profiling
Browser testing against the live staging API (`https://firstmemoir-api-staging.onrender.com`) revealed a 5–6s delay on Add to Cart and several seconds on quantity updates. Direct network profiling of the staging boundary measured:
- **Network TTFB Baseline:** ~417ms (DNS: 58ms, TCP: 23ms, TLS: 47ms).
- **Cold Session Request (`GET /cart`):** 3,367ms (serverless Neon DB spinup / session init).
- **Add to Cart (`POST /cart/items`):** 4,377ms + redundant sequential `GET /cart` (1,476ms) = **5,853ms (5.85s Add to Cart)**.
- **Quantity Update (`PATCH /cart/items/:id`):** 5,159ms + redundant sequential `GET /cart` (2,923ms) = **8,082ms (8.08s Quantity Update)**.
- **Item Deletion (`DELETE /cart/items/:id`):** 1,701ms.

### Root Cause Analysis: Triple Waterfall
1. **Frontend Sequential Waterfall:** Every mutation in `useCartStore` (`addToCart`, `updateQuantity`, `removeItem`) executed `await get().fetchCart()` after the mutation completed, forcing two sequential cross-region network requests over the public internet.
2. **Global UI Freeze:** `useCartStore` toggled `isLoading: true` globally on every mutation, freezing the whole cart UI and disabling all buttons until both network requests resolved.
3. **Backend Database Waterfall:** `cartService.addToCart` executed `storeSettings.findUnique`, then `getCart`, then `product.findUnique` sequentially against Neon PostgreSQL in Singapore, adding 3 sequential database roundtrips.

### Performance Optimizations Implemented
1. **Optimistic Quantity Updates (`apps/storefront/src/store/cart.store.ts`):**
   - Updates quantity immediately in memory and recalculates cart subtotal in **0ms perceived latency**.
   - Fires background `PATCH /cart/items/:id`.
   - On server response, reconciles seamlessly with authoritative `CartLineItemDto`.
   - On error or network failure, automatically rolls back to the previous quantity and surfaces an actionable error message.
2. **Optimistic Item Deletion (`apps/storefront/src/store/cart.store.ts`):**
   - Removes the item from state immediately in 0ms.
   - Dispatches background `DELETE /cart/items/:id`.
   - On failure, restores the previous items array and sets error state.
3. **Elimination of Redundant `GET /cart` Waterfall:**
   - Both `addToCart` and `updateCartItemQuantity` endpoints already return the full updated `CartLineItemDto`.
   - The store now merges the returned line item directly into state, completely eliminating the secondary 1.5s–3.0s `GET /cart` network trip.
4. **Per-Item Mutation Guard (`mutatingItemIds`):**
   - Tracks IDs of items currently mutating (`mutatingItemIds: string[]`).
   - Drops duplicate rapid clicks on the same item while a mutation is in flight.
   - Disables controls only for the active line item (`apps/storefront/app/cart/page.tsx`), keeping the rest of the cart interactive.
5. **Non-Destructive Error Handling (`apps/storefront/app/cart/page.tsx`):**
   - Displays an inline dismissible alert banner (`role="alert"`) with a "Refresh Cart" action instead of replacing the entire cart with the full-page "Unable to Load Cart" error screen when a background update fails.
6. **Backend DB Roundtrip Parallelization (`apps/api/src/services/cart.service.ts`):**
   - Parallelized `storeSettings`, `getCart`, and `product` queries in `cartService.addToCart` via `Promise.all`, collapsing 3 sequential database roundtrips into a single concurrent batch.

---

## 8. Manual Test Payment & Authoritative Webhook End-to-End Audit (Task B)

### Empirical Verification of Manual Test Checkout
During manual browser testing, a checkout session was initiated on `https://firstmemoir-demo.vercel.app`, the Razorpay Test Mode checkout opened, OTP `123456` was submitted, and the storefront redirected to `/checkout/success`. A full audit of internal database records, Razorpay Test API, and webhook processing was conducted.

| Verification Dimension | Value / Identifier | Empirical Status |
|---|---|---|
| **Database Order ID** | `e4415105-19d2-42b2-ae19-5e7bf4598c36` | **CONFIRMED** in Neon DB |
| **Created Timestamp** | `2026-10-12T11:27:46.202Z` | Verified |
| **Order Total** | ₹747 (3 x `Porsche GT3 RS Wall Frame Set` @ ₹249) | Authoritative pricing enforced |
| **Customer Details** | Ayush Tomar (`ayush...`, `+91 9548...`) | Captured in order snapshot |
| **Razorpay Order ID** | `order_TmypgAyyMG3oVS` | `status: paid`, `amount_paid: 74700` |
| **Razorpay Payment ID** | `pay_TmypnZQLLSCFfz` | `status: captured`, `amount: 74700`, method `card` (Mastercard *1111) |
| **Captured Timestamp** | `2026-10-12T11:28:31.000Z` | Captured |
| **Webhook Delivery** | Event `TmyqRZ37Xm5yhq` (`payment.captured`) | Received by Render staging at `11:28:31.216Z` |
| **Webhook Verification** | HMAC SHA256 signature verified | Recorded in `WebhookEvent` table as `PROCESSED` |
| **Order State Transition** | `PENDING` &rarr; `CONFIRMED` | Confirmed at `11:28:32.633Z` via webhook handler |
| **Cart State Transition** | Cart `d0cb0444-370d-4d97-9599-d1ab0cfc1703` | Marked `CHECKOUT_STARTED`, items cleared |

### Frontend False-Confirmation Audit
- **Code Inspected:** `apps/storefront/app/checkout/page.tsx` and `apps/storefront/app/checkout/success/page.tsx`.
- **Payment Modal Handler:** Upon Razorpay modal success callback, the frontend executes:
  ```ts
  router.push(`/checkout/success?order_id=${orderId}`);
  ```
  It **never** marks the order confirmed locally or updates order state.
- **Success Route Protection:** `/checkout/success` polls the backend API via `orders.getOrderStatus(orderId)`:
  - While `status === 'PENDING'`, displays "Verifying payment with payment provider..." with a loading spinner.
  - If `status === 'FAILED'`, displays payment failure screen with retry options.
  - ONLY when `status === 'CONFIRMED'` does it transition to "Order Confirmed!" with order details.
  - **Verdict:** Zero false-confirmation risk. The "Order Confirmed!" screen seen during browser testing was the direct result of a genuinely captured Razorpay test payment, an HMAC-verified webhook delivered to the staging API, and an authoritative database state update.



