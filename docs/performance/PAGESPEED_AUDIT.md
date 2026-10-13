# FirstMemoir — PageSpeed Insights Audit & Performance Optimization Report

**Date:** October 13, 2026
**Auditor:** Senior Performance & Security Engineering
**Target Environment:** Storefront Demo (`https://firstmemoir-demo.vercel.app`)
**Status:** Verification Complete & Guardrails Enforced

---

## 1. Executive Summary & Verification of Reports

Two PageSpeed Insights audit reports were supplied and independently inspected:
- `mobile_report.html` (Saved from `https://pagespeed.web.dev/analysis/https-firstmemoir-demo-vercel-app/8pf7qw7kah?form_factor=mobile`)
- `desktop_report.html` (Saved from `https://pagespeed.web.dev/analysis/https-firstmemoir-demo-vercel-app/8pf7qw7kah?form_factor=desktop`)

Both reports originate from PageSpeed Insights analysis ID `8pf7qw7kah` running **Lighthouse version 13.5.0** against the live storefront homepage (`https://firstmemoir-demo.vercel.app`). Each report contains two distinct tabpanels (`mobile_tab` and `desktop_tab`).

### Verified Device-to-Group Mapping

| Metric / Score | Group A: Mobile (`mobile_tab`) | Group B: Desktop (`desktop_tab`) | Status |
| :--- | :---: | :---: | :--- |
| **Performance Score** | **98** / 100 | **89** / 100 | **Verified** |
| **Accessibility Score** | **94** / 100 | **94** / 100 | **Verified** |
| **Best Practices Score** | **96** / 100 | **96** / 100 | **Verified** |
| **SEO Score** | **100** / 100 | **100** / 100 | **Verified** |
| **First Contentful Paint (FCP)** | **0.9 s** (901 ms) | **0.2 s** (241 ms) | **Verified** |
| **Largest Contentful Paint (LCP)** | **2.3 s** (2,251 ms) | **0.7 s** (650 ms) | **Verified** |
| **Total Blocking Time (TBT)** | **0 ms** (5 ms) | **40 ms** (35 ms) | **Verified** |
| **Cumulative Layout Shift (CLS)** | **0.00** (0.000) | **0.22** (0.220) | **Verified Culprit** |
| **Speed Index (SI)** | **2.2 s** (2,213 ms) | **1.0 s** (1,004 ms) | **Verified** |
| **Time to Interactive (TTI)** | 3.1 s (3,070 ms) | 0.8 s (752 ms) | **Verified** |

> [!IMPORTANT]
> **Resolution of Preliminary Question:**
> - **Group A is Mobile** (Performance: 98, FCP: 0.9s, LCP: 2.3s, CLS: 0.00).
> - **Group B is Desktop** (Performance: 89, FCP: 0.2s, LCP: 0.7s, CLS: 0.22).
> The 0.22 CLS and degraded 89 performance score are isolated strictly to **Desktop**.

---

## 2. Top Five Verified Findings & Root Cause Analysis

### Finding 1 (Critical): Desktop Cumulative Layout Shift (CLS 0.220)
- **Report Evidence:** Lighthouse Desktop flags `Cumulative Layout Shift: 0.22` and identifies `<footer class="bg-canvas border-t border-hairline mt-24 pt-20 pb-10 sm:pt-28 sm:pb-12">` shifting by `0.220`.
- **Root Cause Isolated:**
  In `apps/storefront/app/page.tsx`, the server component executed an unused API call `await categoriesApi.getCategories()` and was marked with `export const dynamic = 'force-dynamic'`. This caused Next.js App Router to wrap the homepage in a React Suspense boundary whose fallback was `loading.tsx` (`GlobalLoading`, height ~564px).
  In the initial streamed HTML on desktop (viewport height 940px), the footer rendered immediately below the skeleton at Y = 732px in plain sight. Once the API call finished over the network, the full 4000px+ homepage replaced the skeleton, shifting the footer down violently by multiple viewports and incurring a massive **0.220 CLS** penalty.

### Finding 2: Unnecessary 401 Browser Errors & Cascading Refresh Storm
- **Report Evidence:** Both reports failed the Best Practices audit `[Browser errors were logged to the console]` with:
  - `GET .../auth/me Failed to load resource: the server responded with a status of 401 (Unauthorized)`
  - `POST .../auth/refresh Failed to load resource: the server responded with a status of 401 (Unauthorized)`
- **Root Cause Isolated:**
  In `apps/storefront/src/store/auth.context.tsx`, `AuthProvider` mounted on initial page load and called `auth.getMe()` indiscriminately for all visitors. For anonymous visitors, the backend returned 401 Unauthorized. Furthermore, in `packages/api-client/src/client.ts`, the 401 interceptor automatically intercepted any 401 response and attempted `POST /auth/refresh`, triggering a second consecutive 401 failure and logging two browser errors for every anonymous page view.

### Finding 3: WCAG AA Color Contrast Violations
- **Report Evidence:** Both reports failed the Accessibility audit `[Background and foreground colors do not have a sufficient contrast ratio]`:
  - `View all → <a class="text-brand font-medium hover:text-brand-pressed ...">`
  - `Shop the Collection <a class="px-10 py-4 bg-brand text-white ...">`
- **Root Cause Isolated:**
  `brand` was defined as `#E8620A` in `apps/storefront/tailwind.config.js`. The contrast ratio of `#E8620A` against `#ffffff` (and `#ffffff` text on `#E8620A` background) is **3.40:1**, which fails the WCAG AA minimum threshold of **4.5:1** for regular text.

### Finding 4: Non-Sequential Heading Hierarchy
- **Report Evidence:** Both reports failed `[Heading elements are not in a sequentially-descending order]`:
  - `300 GSM Paper <h4 class="text-lg font-medium text-brand mb-2">`
- **Root Cause Isolated:**
  In `apps/storefront/app/page.tsx`, the "Why FirstMemoir" trust section rendered `<h2 className="...">Why FirstMemoir</h2>` followed directly by three `<h4>` elements (`300 GSM Paper`, `Ready to Hang`, `Pan-India Delivery`), skipping heading level `<h3>`.

### Finding 5: LCP Resource Discovery & Oversized Image Delivery
- **Report Evidence:**
  - Both reports flagged `[LCP request discovery]` warning that `fetchpriority=high` should be applied to the LCP hero image preload.
  - Desktop report flagged `[Improve image delivery]` showing 14.3 KiB wasted downloading 384x384 image assets for 290x290 display containers (`Anime Mix Poster Pack`).
- **Root Cause Isolated:**
  In `apps/storefront/app/page.tsx`, the hero `<Image>` had `priority` but lacked explicit `fetchPriority="high"`. Featured products had loose responsive `sizes="(max-width: 768px) 50vw, 25vw"` without container bounding constraints, and `next.config.js` did not enable modern AVIF image formats.

---

## 3. Targeted Code Changes Made

| File | Change Scope | Purpose |
| :--- | :--- | :--- |
| `apps/storefront/app/page.tsx` | Removed unused `categoriesApi.getCategories()` call and `force-dynamic` directive. Added `export const revalidate = 3600`. Added `fetchPriority="high"` on Hero `<Image>`. Constrained featured sizes to `290px` max. Fixed Collections alt text. Changed trust section headings from `<h4>` to `<h3>`. | **Eliminates desktop CLS 0.220**, optimizes LCP discovery, reduces image download bytes, and fixes heading hierarchy. |
| `apps/storefront/tailwind.config.js` | Darkened `brand` to `#BE4C06` (contrast **4.97:1** on white, **4.60:1** on `surface-soft`, exceeding WCAG AA). Darkened `brand-pressed` to `#983B04` (7.31:1). Set `var(--font-inter)` and `var(--font-playfair)` as primary fonts. | Resolves color contrast audit violations and aligns font metrics to prevent font-swap layout shift. |
| `apps/storefront/app/globals.css` | Removed `:root { --font-inter: 'Inter', sans-serif; }` override. Updated `:focus-visible` outline to `#BE4C06`. | Allows Next.js font metric adjustments to take effect; provides WCAG-compliant focus rings. |
| `apps/storefront/next.config.js` | Added `formats: ['image/avif', 'image/webp']` to `images` configuration. | Delivers modern AVIF image compression (20-30% smaller than WebP). |
| `packages/api-client/src/client.ts` | **Preserved Untouched**: Token refresh interceptor left fully intact to ensure 15-minute access token refresh succeeds for authenticated users. | Prevents silent logout regressions during session restoration. |
| `apps/storefront/src/store/auth.context.tsx` | Dynamically imported `AuthModal` via `next/dynamic`. Added `auth_hint` storage guard, multi-tab `storage` event synchronization, and request sequence tracking (`reqIdRef`) against in-flight race conditions. | Eliminates 401 console errors for anonymous visitors, synchronizes login/logout cross-tab, and prevents in-flight race conditions. |

---

## 4. Systems Left Unchanged & Safety Compliance

As mandated by Phase 0, Phase 3, and Phase 5 safety rules:
1. **Database:** 0 schema migrations, 0 database queries, 0 data modifications. Neon staging database was preserved untouched.
2. **Cloudflare R2:** 0 objects created, modified, or deleted. The legacy bucket `weprintit-assets` remained 100% untouched.
3. **Payments:** Razorpay webhook verification, HMAC signatures, and checkout contracts remain completely unchanged.
4. **Hosting / Deployments:** No Vercel, Render, or DNS settings were modified. No automatic deployments or git pushes were executed.

---

## 5. Verification Results & Measured vs. Expected Matrix

### Local Verification Gates Executed

All quality gates were executed locally and confirmed passing with 100% success rate:

| Test / Check | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Storefront Typecheck** | `npm --workspace=storefront run check-types` | **PASS** | `next typegen && tsc --noEmit` exited 0 with 0 errors. |
| **Storefront Test Suite** | `npm --workspace=storefront run test` | **PASS** | 43/43 tests passing across 10 suites (including 11 auth context resilience and concurrency tests). |
| **Storefront Static Build** | `npm --workspace=storefront run build` | **PASS** | Turbopack compiled in 2.4s; 15/15 static pages pre-rendered, homepage emitted as static `○` (no streaming suspense). |
| **API Build** | `npm --workspace=api run build` | **PASS** | `tsc` compiled with 0 errors. |
| **Admin Build** | `npm --workspace=admin run build` | **PASS** | `tsc -b && vite build` built in 510ms with 0 errors. |

### Evidence Matrix: Measured vs. Code Proof vs. Unverified Live Outcomes

| Area | Empirically Measured Baseline (Report `8pf7qw7kah`) | Confirmed Code-Level Fix & Local Proof | Expected Architectural Effect | Live Deployment Status |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop CLS** | **0.220** (Failing; `footer` violently shifted by streaming fallback) | Removed `categoriesApi` call and `force-dynamic`; Next.js builds homepage as static `○` without `loading.tsx` suspense. | Layout shift eliminated because initial HTML contains full document with reserved dimensions. | **UNVERIFIED LIVE** (Pending user-approved push & Vercel deployment of this branch). |
| **Console Errors** | **2 failed requests** (401 on `/auth/me` and `/auth/refresh`) | `auth_hint` guard prevents anonymous visitors from calling `/auth/me`; `/auth/refresh` untouched for authenticated users. | Anonymous visits trigger zero 401 network requests on homepage. | **UNVERIFIED LIVE** (Live site still serves older commit `97de5f0`). |
| **Color Contrast** | **Failed** (`#E8620A` contrast was 3.40:1 on white) | Updated `brand` to `#BE4C06` (4.97:1 on white, 4.60:1 on `#f6f6f6`); trust card headings set to `text-white` (15.9:1 on `#222222`). | Passes WCAG AA across light and dark sections. | **VERIFIED BY FORMULA** (Color math verified; live Lighthouse unverified). |
| **Heading Hierarchy** | **Failed** (`<h4>` under `<h2>`) | Changed trust cards to `<h3>` under `<h2>` in `apps/storefront/app/page.tsx`. | Valid semantic descending heading tree (`<h2>` &rarr; `<h3>`). | **VERIFIED IN DOM** (DOM tree structure verified in local build). |
| **Hero Image Discovery** | Flagged missing `fetchpriority=high` | Added `fetchPriority="high"` to `<Image priority ... />` in `page.tsx`. | Next.js emits `<link rel="preload" fetchpriority="high">` in head. | **VERIFIED IN HTML** (Next.js output verified; live score unmeasured). |
| **Auth Session Continuity** | Initial task proposed excluding `/auth/me` from refresh, which risked 15-minute logouts. | **CORRECTED:** Reverted `client.ts` change; token refresh logic preserved intact. Added 6 unit tests in `auth-context-resilience.test.ts`. | Authenticated sessions with valid refresh token (7 days) refresh seamlessly when access token expires. | **VERIFIED IN TESTS** (100% test pass; live cookies unverified). |

> [!CAUTION]
> **Measurement Honesty Directive:**
> A successful local build and unit test run proves code correctness, type safety, and component structure, but it is **not** a fresh PageSpeed measurement. No claims of a "0.000 live CLS" or "perfect live 100/100 score" are made here. Live measurements can only be collected after the user explicitly approves pushing this branch to trigger a fresh Vercel deployment.

---

## 6. Pre-Commit Safety Audit Findings & Corrections Made

During this verification audit, three critical safety and correctness findings were addressed:

1. **Token Refresh Continuity Restored in API Client:**
   The previous session proposed excluding `/auth/me` from token refresh in `packages/api-client/src/client.ts`. This was identified as a critical regression risk: an authenticated user whose 15-minute access token expired would have been logged out on page refresh even with a valid 7-day refresh token.
   **Correction:** Reverted `packages/api-client/src/client.ts` to its original untouched state. The anonymous 401 guard is handled exclusively and safely on the frontend via `auth_hint` in `auth.context.tsx`.
2. **Multi-Tab Auth Synchronization & Resilience Added:**
   Equipped `auth.context.tsx` with a `storage` event listener and an optional `force` bypass on `refreshUser()`, ensuring that logins or logouts in one tab immediately synchronize across all open tabs, and that session restoration is never blocked if a user clears their localStorage while holding valid cookies.
3. **Contrast Extended Across All Background Pairings:**
   Calculated contrast ratios across all backgrounds. While `#C4500A` achieved 4.67:1 on pure white, it yielded 4.32:1 on `surface-soft` (`#f6f6f6`). Hardened `brand` to `#BE4C06` (4.97:1 on white, 4.60:1 on `surface-soft`, 4.62:1 on `surface-cream`). For the dark `bg-ink` section, set trust headings to `text-white` (15.9:1) to ensure universal WCAG AA compliance.

---

## 7. Remaining Risks & Single Best Next Step

### Observed Working Tree State
- **Active Branch:** `phase-3-2-categories`
- **HEAD Commit:** `0c1542bc0076d2e00ed0f8413ff75bb2593bc0dc`
- **Untracked User Files:** 100% preserved and untouched.
- **External Systems:** Zero database, R2, payment, DNS, or Vercel infrastructure changes.

### Remaining Risk
The live deployment at `https://firstmemoir-demo.vercel.app` continues to serve commit `97de5f0`. Until an authorized deployment is executed, external Lighthouse measurements will evaluate the older deployment.

### Single Best Next Step
Present this completed safety review to the user for formal review. When approved, commit the verified diff to `phase-3-2-categories` and push to trigger a clean Vercel deployment under `apps/storefront`.
