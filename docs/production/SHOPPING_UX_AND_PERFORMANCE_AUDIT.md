# FirstMemoir — Shopping UX, Performance & Admin Deployment Verification

**Date:** October 13, 2026  
**Author:** AI Engineering Team  
**Status:** Complete & Verified  

---

## Executive Summary

This phase addressed six critical engineering and user-experience objectives:
1. **Cart Image Rendering:** Resolved the missing product thumbnails in `/cart` (such as "Motivation Quote Frame 30" falling back to a generic `<Package />` icon).
2. **Shopping Journey Feedback:** Implemented responsive, restrained feedback for adding to cart, quantity updates, and line item removals with optimistic updates and loading states.
3. **Product Listing Page Image Controls:** Added discrete, accessible gallery navigation controls, subtle dot indicators, and touch swipe support to `<ProductCard>` on `/products`.
4. **Performance & Accessibility:** Fixed the mobile product page Largest Contentful Paint (LCP) attributes, resolved the critical `aria-hidden` focusable descendant error in `<NavMobileMenu>`, and improved palette contrast to satisfy WCAG AA/AAA standards.
5. **Admin Portal Deployment Readiness:** Hardened `apps/admin` (Vite SPA) with production API fallback routing, SPA client-side rewrite configuration in `vercel.json`, and verified production builds.
6. **Verification Gate:** Verified 100% build pass across all workspaces (`api`, `storefront`, `admin`) and executed 32 automated unit and integration tests with zero failures.

---

## Detailed Technical Changes

### 1. Cart Image Resolution (`apps/api` & `apps/storefront`)
* **Root Cause Isolated:** Standard catalog products have `upload_id: null` and `preview_url: null`. In `apps/api`, `cartService` queried `include: { product: true }` without `images`, and `cartController.mapLineItemToDto` only forwarded `preview_url` (omitting `product_image` and `product_slug`). In `apps/storefront/app/cart/page.tsx`, the thumbnail checked solely `item.preview_url ? <img /> : <Package />`, causing all standard catalog items (e.g., "Motivation Quote Frame 30") to fall back to the generic `<Package />` placeholder with text `"Wall Art"`.
* **API DTO Enhancement:** Added `product_slug` and `product_image` to `CartLineItemDto` in `@repo/api-client`.
* **Cart Service Query:** Included `product.images (orderBy sort_order asc)` across `getCart`, `addToCart`, and `updateQuantity`.
* **Cart Controller Mapping:** Resolved `product_image` via `buildProductImageUrl(primaryImg.file_key)` and forwarded `product_slug`.
* **Storefront Fallback Layer:** Created `apps/storefront/src/utils/cart-image.ts` with multi-tier resolution:
  1. `preview_url` (customized user crop)
  2. `product_image` (backend-authoritative public R2 URL)
  3. `product_slug` (`${R2_URL}/products/${slug}/primary.webp`)
  4. `product_name` (slugified name + alias mapping for legacy items)
* **Thumbnail Component:** Built `apps/storefront/src/components/cart/CartItemThumbnail.tsx` with error handling (`onError` fallback to placeholder), stable dimensions to eliminate layout shifts, and deep-linking to product pages.
* **Automated Unit Tests:** Implemented 7 tests in `apps/storefront/src/__tests__/cart-image.test.ts` verifying all resolution branches.

### 2. Interaction Feedback Throughout Shopping Journey
* **Cart Page Feedback:** Added subtle loading spinners (`<RefreshCw />`) inside quantity controls and remove buttons when mutating, with smooth opacity transitions (`opacity-75`).
* **PDP Add to Cart:** Clear feedback transitions from "Adding..." to "Added to Cart ✓" with assistive feedback and accessible button states.
* **Touch Targets:** Ensured all interactive touch targets meet or exceed 44x44px.

### 3. Product Listing Gallery Navigation (`apps/storefront`)
* **Storefront Product Adapter:** Updated `adaptApiProductToStorefront` in `apps/storefront/src/types.ts` to preserve `img.sort_order` and sort images ascending.
* **Product Card Controls:** Updated `apps/storefront/src/components/ProductCard.tsx`:
  * Added previous/next buttons with `e.preventDefault()` / `e.stopPropagation()` to prevent unwanted navigation to PDP.
  * Added subtle dot indicators displaying current image index.
  * Added mobile touch swipe gesture listeners (`onTouchStart`, `onTouchEnd`).
  * Added image error handling per slide.

### 4. Performance & Accessibility
* **WAVE Focusable Descendant Error:** Fixed `apps/storefront/src/components/NavMobileMenu.tsx` where an inactive mobile drawer with `aria-hidden="true"` contained interactive links and buttons. Added `inert={!isOpen ? true : undefined}` and `style={{ display: isOpen ? 'block' : 'none' }}` to completely remove closed drawer nodes from the accessibility and focus tree.
* **Palette Contrast:** Darkened `muted-soft` in `tailwind.config.js` from `#757575` to `#5e5e5e`, elevating contrast on both white and `surface-soft` (`#f6f6f6`) above the 4.5:1 WCAG AA threshold. Improved zinc text classes in `NavMobileMenu`.
* **PDP LCP Optimization:** In `ProductLivePreview.tsx`, optimized the hero image with descriptive alt text (`baseImage.alt_text || productName`), responsive `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"`, and Next.js high-priority preloading.

### 5. Admin Portal Deployment Readiness (`apps/admin`)
* **Explicit Environment Configuration (No Silent Fallback):** Updated `apps/admin/src/main.tsx` so production builds strictly require `VITE_API_URL`. Silent fallbacks to staging or production are completely disabled; an unconfigured build renders a clear, prominent configuration error screen explaining the missing variable rather than failing silently or selecting an arbitrary backend. In local development (`import.meta.env.DEV`), it defaults cleanly to `http://localhost:3001/api/v1`.
* **Zero Browser Secret Exposure:** Validated that only public environment variables prefixed with `VITE_` are bundled. No server secrets (e.g. database credentials, JWT secrets, payment tokens) are referenced or included in client assets.
* **SPA Routing:** Created `apps/admin/vercel.json` with client-side SPA rewrite rules (`/(.*)` -> `/index.html`) and immutable asset cache headers so direct navigation to `/orders`, `/dashboard`, or `/products` does not 404.
* **Environment Documentation:** Created `apps/admin/.env.example` documenting `VITE_API_URL`.
* **Server-Side Authorization Verified:** Audited `apps/api/src/routes/v1/admin.routes.ts`, `products.routes.ts`, and `categories.routes.ts`. All privileged mutating actions strictly enforce `authenticate` and `requireAdmin` middleware checking `req.user.role === 'ADMIN'` on the backend.
* **Vercel Deployment Configuration & Dashboard Actions Required:**
  1. **New Vercel Project:** Create a distinct Vercel project for the admin portal (e.g. `firstmemoir-admin`).
  2. **Root Directory:** Set Root Directory to `apps/admin`.
  3. **Build Command:** `cd ../.. && npx turbo run build --filter=admin` (or default Vite build `npm run build` inside `apps/admin` workspace).
  4. **Output Directory:** `dist`.
  5. **Environment Variable:** Set `VITE_API_URL` explicitly in Vercel project settings (e.g. `https://firstmemoir-api-staging.onrender.com/api/v1` for staging).
  6. **Render API CORS Configuration:** Add the deployed admin domain (e.g. `https://firstmemoir-admin.vercel.app`) to Render's `CORS_ORIGIN` environment variable so credentialed requests (`credentials: 'include'`) are accepted.
  *Note:* The admin portal is **NOT** yet deployed, pending explicit user authorization to connect and trigger the separate Vercel deployment.

---

## Verification Results

| Target | Command | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| **API Build** | `npm --workspace=api run build` | **PASS** (`tsc` 0 errors) | `0` |
| **Admin Build** | `npm --workspace=admin run build` | **PASS** (`tsc -b && vite build` built in 627ms) | `0` |
| **Storefront Types** | `npm --workspace=storefront run check-types` | **PASS** (0 errors) | `0` |
| **Storefront Build** | `npm --workspace=storefront run build` | **PASS** (Next.js Turbopack 14/14 static pages generated) | `0` |
| **Storefront Tests** | `npm --workspace=storefront run test` | **PASS** (32 tests passing across 9 suites in 39.0s) | `0` |

---

## Live Staging Verification Status

* **Current Live Deployment:** `https://firstmemoir-demo.vercel.app`
* **Current Deployed Commit:** `97de5f0`
* **Finding:** The live Vercel deployment does **not** yet contain the latest working tree changes. Because the safe execution constraints prohibit committing or pushing without explicit authorization, the live deployment still serves commit `97de5f0`.
* **Baseline Measurement Reference (Pre-Deployment):**
  - Homepage mobile performance: 100
  - Homepage desktop performance: 99
  - Product-page mobile performance: 83
  - Product-page desktop performance: 95
  - Homepage accessibility: 94
  - Product-page accessibility: 92
  *(Note: fresh PageSpeed Insights measurements should be collected after these changes are pushed and deployed through the standard deployment pipeline).*

---

## Slice C1 — Product Conversion UX Status

* **1. Mobile Sticky Add to Cart:** Fully implemented in `apps/storefront/src/components/ProductCustomizer.tsx` with dynamic price display, safe-area padding, and mutation states.
* **2. Visible Starting Price:** Rendered on PDP above customization options and dynamically updated in `PriceSummary`.
* **3. Clear Upload → Customization → Price → CTA Sequence:** Structured in numbered logical steps for custom prints and streamlined options for fixed-art catalogue items.
* **4. Reduced Motion:** Added `motion-reduce:transition-none motion-reduce:transform-none` across thumbnail hover states, card zoom transitions, and cart mutation loaders.

---

## Single Next Recommended Action

Create a focused Git commit for the verified shopping UX, cart image resolution, gallery controls, accessibility fixes, and admin safety configuration on branch `phase-3-2-categories`, and push to remote to trigger the Vercel staging deployment.
