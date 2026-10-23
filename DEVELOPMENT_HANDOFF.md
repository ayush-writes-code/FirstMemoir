# Development Handoff & Architecture Guide

> **Project**: WePrintIt / First Memoir  
> **Milestone**: Checkout & Payment Pipeline Complete  
> **Date**: August 16, 2026

---

## 1. Tech Stack Overview

### Monorepo Architecture (Turborepo + npm workspaces)
- **`apps/storefront`**: Next.js 16 (App Router), React 19, Tailwind CSS. Client-facing eCommerce storefront.
- **`apps/admin`**: React 19, Vite, Tailwind CSS, Lucide Icons. Operational and catalog management portal.
- **`apps/api`**: Node.js, Express, TypeScript, Zod, native Node test runner. REST API backend.
- **`packages/database`**: Prisma ORM client and schema definitions for PostgreSQL (Neon-compatible).
- **`packages/api-client`**: Type-safe shared API client used by both `storefront` and `admin`.
- **`packages/shared`**: Shared TypeScript types, validation schemas, and constants.
- **`packages/ui`**: Shared UI component library.

### Infrastructure & External Services
- **Database**: PostgreSQL 16 (hosted locally for dev, configured for Neon in production).
- **Object Storage**: Cloudflare R2 (S3-compatible SDK) for direct customer image uploads and thumbnail previews.
- **Payment Gateway**: Razorpay (Orders API, Checkout JS SDK, and HMAC SHA-256 Webhook processing).
- **Logistics**: Shiprocket (API integration built; fulfillment metric execution paused behind safety boundary).

---

## 2. Monorepo Structure & Key Paths

```
WePrintIt.in/
├── apps/
│   ├── admin/               # React/Vite Admin Dashboard
│   │   └── src/pages/       # Orders.tsx, OrderDetail.tsx, Products.tsx
│   ├── api/                 # Express API server
│   │   └── src/
│   │       ├── controllers/ # Admin, Cart, Checkout, Product, Webhook controllers
│   │       ├── services/    # checkout.service.ts, payment.service.ts, razorpay.service.ts, shiprocket.service.ts
│   │       └── routes/      # REST API route declarations (/api/v1/...)
│   └── storefront/          # Next.js customer application
│       └── app/             # cart/page.tsx, checkout/page.tsx, checkout/success/page.tsx
├── packages/
│   ├── api-client/          # Shared HTTP client for Storefront & Admin
│   ├── database/            # prisma/schema.prisma & Prisma client export
│   └── shared/              # Cross-package DTOs, Zod schemas, & types
├── docs/
│   └── security/            # ANTIGRAVITY_SECURITY_RULES.md (Permanent Security Guardrails)
├── PROJECT_STATE.md         # Comprehensive project milestone documentation
├── DEVELOPMENT_HANDOFF.md   # Architectural reference and developer handoff
└── CHANGELOG.md             # Project change ledger
```

---

## 3. Core Architectural Flows

### A. Authentication Flow
- Customers use session IDs or JWT access tokens.
- Admins authenticate via `/api/v1/auth/login` and receive a signed JWT bearer token stored in `localStorage`.
- All `/api/v1/admin/*` routes are protected by role-verification middleware.

### B. Order Lifecycle State Machine

```
   ┌─────────┐
   │ PENDING │ (Created at checkout init; holds Razorpay order ID)
   └────┬────┘
        │
        ├─► [EXPIRED] (If customer retries or Razorpay order expires/paid)
        │
        ▼ (Razorpay payment.captured webhook with HMAC signature)
  ┌───────────┐
  │ CONFIRMED │ (Payment CAPTURED; uploads ORDERED_RETAINED; cart emptied)
  └─────┬─────┘
        │
        ▼ (Admin clicks "Begin Processing")
  ┌────────────┐
  │ PROCESSING │ (Manufacturing / lab queue)
  └─────┬──────┘
        │
        ▼ [SHIPROCKET AWB GENERATION — PAUSED]
  ┌──────────────────┐
  │ READY_FOR_PICKUP │ (AWB assigned, courier manifest generated)
  └─────┬────────────┘
        │
        ▼ (Shiprocket Webhook status_id: 42)
  ┌─────────┐
  │ SHIPPED │ (In-transit with courier tracking)
  └────┬────┘
        │
        ▼ (Shiprocket Webhook status_id: 7)
  ┌───────────┐
  │ DELIVERED │ (Final delivery confirmed)
  └───────────┘
```

### C. Payment & Webhook Verification Flow
1. Frontend initializes checkout via `POST /api/v1/checkout/initialize`.
2. Backend computes authoritative total, checks upload states, locks uploads as `CHECKOUT_LOCKED`, generates Razorpay Order, and returns `razorpay_order_id`.
3. Customer completes Razorpay payment in modal; frontend redirects to polling page `/checkout/success?order_id=...`.
4. Razorpay sends `payment.captured` event to `/api/v1/webhooks/razorpay`.
5. Backend verifies raw body HMAC SHA-256 signature against `RAZORPAY_WEBHOOK_SECRET`.
6. Inside an atomic database transaction with `SELECT FOR UPDATE`:
   - Validates `order.status === 'PENDING'`.
   - Validates `amount === expectedAmountPaise`.
   - Transitions `Order.status` → `CONFIRMED`.
   - Records `Payment` with status `CAPTURED`.
   - Transitions `UserUpload` records → `ORDERED_RETAINED`.
   - Clears purchased items from the associated `Cart`.
   - Marks `WebhookEvent` as `PROCESSED`.
7. Polling storefront receives `CONFIRMED` and renders confirmation.

---

## 4. Key Fixes & Hardening Already Implemented

1. **Checkout Button Navigation Fix**: Connected storefront cart "Proceed to Checkout" button directly to `/checkout` without loss of state.
2. **Admin Orders Routing & UI Fix**: Resolved route matching `/orders/:id` and restored proper Tailwind brand color palette (`#E8620A`) in Admin layout.
3. **API Client Duplicate `/v1` Fix**: Normalized URL prefix concatenation across `admin.ts` to prevent `//api/v1/v1` route mismatches.
4. **Product SKU Pipeline**: Added end-to-end `sku: string | null` support across database, DTO mappers, API controllers, Zod validation, and Admin `ProductForm.tsx`.
5. **Razorpay Stale Order Reuse Prevention**: Backend now queries live Razorpay order status on checkout retry. If the previous Razorpay order was paid, attempted, or expired, the old local order is expired and a fresh Razorpay order is generated.
6. **Checkout Processing State Reset**: Enhanced `CheckoutPage.tsx` modal handlers (`modal.ondismiss`, `payment.failed`, and `catch`) so `isProcessing` is immediately reset to allow instant user retries.
7. **Cart Clearing on Confirmation**: Added atomic `cartLineItem.deleteMany` inside the payment confirmation transaction to ensure purchased cart items are cleared only when payment is captured.
8. **Webhook Upload Retention Idempotency**: Enhanced upload retention transition in `payment.service.ts` to pre-verify asset existence while tolerating uploads already marked `ORDERED_RETAINED` from prior purchases.
9. **API Deployment Foundation & Operational Reliability**: Implemented `SIGTERM`/`SIGINT` graceful shutdown (`server.close()` and `prisma.$disconnect()`). Segregated readiness (`/api/health/ready`) and liveness (`/api/health/live`) endpoints. Added a multi-stage `Dockerfile` (`node:20-slim`) strictly for the API workspace. Prisma migrations are documented to be run as an external pre-deployment release command rather than during Docker build or automatic API startup.

---

## 5. Development & Testing Commands

The repository quality gate is enforced in GitHub Actions (`.github/workflows/ci.yml`) and locally via the following sequential validation commands:

```bash
# 1. Run repository linting across all packages (--max-warnings 0)
npm run lint

# 2. Verify TypeScript workspace isolation and type safety
npm run check-types

# 3. Compile all applications and packages
npm run build

# 4. Run integration test suite (automatically orchestrates isolated Docker PostgreSQL DB)
npm run test

# 5. Tear down the test database environment
npm run test:teardown

# Run local development servers (Storefront :3000, Admin :5173, API :3001)
npm run dev
```

---

## 6. Demo & Staging Architecture

The FirstMemoir demo and staging environments are verified and live:
1. **Storefront**: Deployed to Vercel at `https://firstmemoir-demo.vercel.app` with Next.js Turbopack, responsive touch navigation, and `*.r2.dev` remote pattern whitelisting.
2. **Backend API**: Deployed via Docker to Render staging at `https://firstmemoir-api-staging.onrender.com`. Readiness (`/api/health/ready`) verifies live database connectivity. Liveness (`/api/health/live`) confirms service availability.
3. **Database**: Neon Serverless PostgreSQL (Singapore `ep-super-queen-b38volvi`). 6/6 migrations applied, 82 canonical products and 452 product images synchronized. An immutable baseline snapshot is preserved at `docs/production/STAGING_PRE_INGESTION_SNAPSHOT.json`.
4. **Cloudflare R2 Storage**:
   - Public CDN: `firstmemoir-public-assets` (`https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev`) hosting 452 canonical WebP images (`products/*`) with `Cache-Control: public, max-age=31536000, immutable`.
   - Private Bucket: `firstmemoir-private-uploads` hosting customer photo uploads (`customers/*`) and preview proxies (`previews/*`). Strict application-level access control enforced via signed read URLs and proxy endpoints; direct public CDN access blocked.
   - Legacy Bucket: `weprintit-assets` is permanently quarantined and never accessed.
5. **Cross-Site Auth & CORS**: API staging runs with `COOKIE_SAME_SITE=none` and verified CORS headers allowing `https://firstmemoir-demo.vercel.app` with `Access-Control-Allow-Credentials: true`.
6. **Payment Gateway**: Razorpay configured in TEST mode (`rzp_test_TmIGcynU0XmBZ8`), verified with real test order creation, cryptographic raw-body HMAC-SHA256 signature verification, and idempotent webhook processing on `payment.captured`.

---

## 7. Production Cutover & Deployment Checklist

Before production release, the following approvals and external provisions are required:

| Item | Requirement | Current Status | Blocker / Owner |
|---|---|---|---|
| **Production Accounts** | Client production GitHub, Vercel, Render, Neon, R2, and domain accounts | Pending client provisioning | Client / Platform access |
| **Domain & SSL** | Production custom domain DNS records (`api.firstmemoir.in`, `firstmemoir.in`) | Not configured | Client domain owner |
| **Live Payment Gateway** | Razorpay production live keys (`rzp_live_...`) and live webhook secret | Running in TEST mode | Client business approval |
| **Shiprocket Credentials** | Live Shiprocket production credentials, pickup location ID, box measurements | Dry-run / test verified | Physical warehouse team |
| **SMS / Email Gateway** | Live SMS provider credentials and Resend API keys | Mock provider active | Client marketing approval |
| **Third-Party IP Clearance** | Commercial licensing verification for automotive, anime, and jersey art (`REVIEW_REQUIRED_THIRD_PARTY_IP`) | Tagged as review required | Legal / IP review |

---

## 8. Planned Product Track: Premium Storefront Visual-Polish Pass

Following the completion of core personalization flows, the storefront is slated for a high-end visual-polish pass:
1. **Typography**: Editorial, high-fashion serif styling (`Playfair Display` / `Inter`) with oversized headlines and tight tracking.
2. **Materiality & Photography**: Subtle paper/fabric textures, gallery-grade print mockups, and art-directed lifestyle photography.
3. **Refined Brand Palette**: Deepen existing FirstMemoir identity (`#BE4C06` terracotta brand, `#222222` carbon ink, `#fdf6e8` warm cream, `#f6f6f6` soft gray) with AA-contrast compliance.
4. **Composition & Motion**: Generous editorial whitespace, balanced asymmetric compositions, and fluid, restrained micro-interactions inspired by Apple product storytelling.
5. **Conversion & Accessibility**: Fully accessible semantic HTML, high contrast tap targets, and frictionless mobile checkout paths.

---

## 9. Personalization Pipeline Verification Summary (Stages 11–13)

The complete end-to-end personalization workflow has been hardened and verified:
1. **Photo Upload (`FileUploader.tsx`)**: Rejection mapping (50MB limit, unsupported format warnings), real-time XHR progress tracking (0–100%), and safe in-flight upload cancellation.
2. **Photo Cropper (`PhotoCropper.tsx`, `cropMath.ts`)**: Orientation-aware aspect ratios (Portrait 0.68, Landscape 1.47, Square 1.0) with bleed and safe-zone guides, strict `[0, 1]` canonical coordinate clamping across all rotations, and seamless round-trip transformations.
3. **Preview Fidelity & DPI Warnings (`ProductLivePreview.tsx`, `ProductCustomizer.tsx`, `dpi.ts`)**: Normalized orientation mockup lookups (supporting lowercase/uppercase keys), reactive dynamic DPI recalculation (swapping dimensions on 90°/270° rotation), clearing of stale DPI acknowledgments on crop/size modification, square-to-portrait orientation restoration, and strict 250/150/100/70 DPI threshold parity with backend verification in `cart.service.ts`.
4. **Automated Test Coverage**: 68/68 unit, integration, and contract tests passing across 18 test suites in `apps/storefront`.

---

## 10. Visual Polish Track: Premium Homepage Hero (Stage 14)

1. **Editorial Architecture**:
   - Asymmetric two-column composition with editorial hierarchy.
   - Studio badge (`Fine Art Print & Framing Studio • India`) establishing bespoke brand authority.
   - High-contrast serif headline ("Moments made timeless. *Framed to perfection.*") with brand terracotta italic emphasis.
   - Real-world craftsmanship metrics row (`300 GSM Archival Paper`, `Solid Wood Museum Matting`, `Pan-India Ready to Hang`).
2. **Tactile Materiality**:
   - Replaced flat dark photo overlay with a luminous warm studio gradient (`#FAF8F5` to `#EFEAE0`) bordered by `#EAE5DC`.
   - Realistic physical frame staging: solid satin black wood moulding (`#18181A`), 8-ply beveled white museum mat (`#FCFBF9`), genuine high-resolution artwork (`football-ronaldo-1.jpg`), subtle glass reflection glare, and floating gallery edition plaque.
3. **Design Tokens & Accessibility**:
   - Added `canvas-warm`, `canvas-sand`, `editorial-border`, `brand-tint`, and `shadow-frame` to `tailwind.config.js`.
   - Enforced `prefers-reduced-motion` global motion suppression and `.text-balance` in `globals.css`.
   - Verified 0 text clipping on mobile viewports down to 390px, with generous 48px touch targets.
   - Preserved all catalog data, navigation links, and shopping paths.

---

## 11. Visual Polish Track: Product Cards & Catalog Browsing (Stage 15)

1. **Product Card Architecture (`ProductCard.tsx`)**:
   - **Perimeter & Materiality**: Subtle canvas background (`bg-canvas-warm`), hairline perimeter border (`border border-editorial-border/70 group-hover:border-editorial-border`), and inset physical mounting ring (`ring-1 ring-inset ring-black/[0.04]`).
   - **Image Stage & Interaction**: Restrained 700ms image zoom hover (`scale-[1.03]`) replacing abrupt scaling. Accessible circular gallery pagination controls (`w-7 h-7 bg-white/90 backdrop-blur-sm`) with high-contrast dot indicators and keyboard focus rings.
   - **Editorial Left-Aligned Typography**: Category kicker in uppercase mono (`text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-muted-soft`), 2-line clamped product title in deep ink with gentle brand hover (`font-medium text-ink-deep group-hover:text-brand`), and bold price (`text-sm sm:text-[15px] font-semibold text-ink-deep`) with subtle provisional estimate tag (`Est.`).
2. **Catalog Page Architecture (`app/products/page.tsx`)**:
   - **Exhibition Header**: Curated gallery archive badge (`w-1.5 h-1.5 rounded-full bg-brand` + `Curated Gallery Archive • Pan-India`), large serif title (`font-serif text-ink-deep`), grounded category-specific descriptions reflecting real product provenance (8×12″ frames on 300 GSM photographic paper, wall mounting hooks), and real-time item count.
   - **Horizontal Touch Navigation**: Scrollable category pill toolbar with `.no-scrollbar` utility, active carbon pill (`bg-[#18181A] text-white`), and inactive editorial pills (`bg-white border border-editorial-border hover:border-ink/40`).
   - **Responsive Segmented Sort Control**: Segmented pill control that cleanly balances as an equal-width 3-column pill on mobile viewports and neatly aligns rightward on desktop viewports.
   - **Numbered Gallery Pagination**: Circular numbered page pills (`w-8 h-8 rounded-full`) with active page states and accessible Previous/Next controls (`aria-disabled`, `aria-label`).
3. **Empty States & Loading Skeletons**:
   - Upgraded `ProductCardSkeleton.tsx` to match the exact `ProductCard` aspect-square canvas card and left-aligned text bars.
   - Upgraded `EmptyState.tsx` to a warm editorial canvas card (`bg-canvas-warm border border-editorial-border`), serif title (`font-serif font-normal text-ink-deep`), circular icon badge, and dark pill CTA (`bg-[#18181A] text-white rounded-pill`).

---

## 12. Visual Polish Track: Product Detail Page (Stage 16)

1. **Interactive Gallery Architecture (`ProductImageGallery.tsx`)**:
   - **Main Image Stage**: Warm canvas background (`bg-canvas-warm`), hairline perimeter border (`border-editorial-border/80`), inset physical ring (`ring-1 ring-inset ring-black/[0.04]`), and soft exhibition shadow (`shadow-gallery`).
   - **Edge Navigation & Keyboard Accessibility**: Circular Previous and Next navigation buttons with backdrop blur (`w-9 h-9 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-md rounded-full shadow-md text-ink-deep border border-editorial-border/80 hover:scale-105`), keyboard arrow navigation (`ArrowLeft` / `ArrowRight`), and high-contrast counter pill (`1 / 5`) in the bottom right corner.
   - **Thumbnail Strip**: Horizontal scrollable container with `.no-scrollbar` utility; thumbnails styled with warm canvas borders, smooth hover states, and active dark rings (`border-[#18181A] ring-2 ring-black/15 scale-[1.03]`).
2. **Page Narrative & Purchase Hierarchy (`app/products/[slug]/page.tsx`)**:
   - **Breadcrumb Navigation**: Uppercase mono kicker (`font-mono uppercase tracking-[0.14em] text-[11px] text-muted-soft`) linking cleanly to `/products` and the primary category.
   - **Unified Price Hierarchy**: Replaced confusing duplicate prices with a single authoritative price (`text-3xl font-serif text-ink-deep`) and tax/shipping microcopy (`Incl. of all taxes • Pan-India delivery`). Clear provisional estimate badge provided when `provisional_price` is flagged in manufacturing metadata.
   - **Archival Notes & Verified Specifications**: Extracted strictly confirmed specifications (`SOURCE_CONFIRMED`) from product metadata (print dimensions, paper stock, approx weight) and presented in a clean specification grid alongside the description, preventing unverified manufacturing claims.
   - **Neutral Trust Assurances**: Styled into a unified warm canvas banner (`bg-canvas-warm/80 border border-editorial-border/80 rounded-2xl divide-x divide-editorial-border/60`) highlighting Secure Packaging, Quality Guarantee, and Encrypted Checkout.
3. **Customizer & Option Controls (`ProductCustomizer.tsx`, `OptionSelector.tsx`, `PriceSummary.tsx`)**:
   - **Option Selectors**: Segmented pill toggles with active carbon state (`bg-[#18181A] text-white`) and selected value display hints. Swatches refined with active offset rings and clear boundaries.
   - **Personalization Box**: Replaced dashed gray box with a warm canvas card (`bg-canvas-warm/70 border border-editorial-border hover:border-brand rounded-2xl p-6`) with an elevated icon badge and clear file format guidelines.
   - **Price Summary Card**: Suppressed redundant display when no modifiers/options exist; rendered a structured subtotal breakdown when modifiers are present.
   - **Sticky Mobile Checkout Bar**: Elevated with translucent backdrop blur (`bg-white/95 backdrop-blur-md border-t border-editorial-border`), total price in deep ink, and accessible full-width Add to Cart button.

---

## 13. Visual Polish Track: Cart Drawer, Cart Page & Checkout Entry (Stage 17)

1. **Slide-Over Cart Drawer Architecture (`src/components/cart/CartDrawer.tsx`)**:
   - **Global Mount**: Mounted in `apps/storefront/app/layout.tsx` within `AuthProvider`, enabling instant access from any route without a competing cart system.
   - **Accessibility & UX**: Backdrop blur overlay (`bg-ink-deep/40 backdrop-blur-[2px]`), `Escape` key close handler, body scroll lock during open state, and accessible close button (`aria-label="Close cart"`).
   - **Editorial Materiality**: Warm canvas header (`bg-canvas-warm/50`), Playfair serif title (`font-serif text-2xl font-normal text-ink-deep`), item count badge (`bg-canvas-sand text-ink-deep border border-editorial-border`), and hairline borders (`border-editorial-border`).
   - **Line-Item Composition**: Uses `CartItemThumbnail` with warm canvas background, truncated title linking to product page, selected options chips, tactile quantity pill (`Minus`, current quantity or spinner, `Plus`), line item subtotal, and trash deletion button.
   - **Drawer Footer**: Subtotal breakdown, shipping calculation notice, prominent primary checkout button (`Proceed to Checkout ->` linking to `/checkout`), secondary "View Full Cart" link to `/cart`, and trust badge ("Handcrafted in India • 100% Archival Quality").
   - **Warm Empty State**: Centered circular `ShoppingBag` icon badge in warm canvas, editorial headline, supportive description, and primary "Browse Collections" action.

2. **Cart State & Concurrency Protection (`src/store/cart.store.ts`)**:
   - **Drawer State**: Integrated `isDrawerOpen: boolean` (default `false`), `openDrawer: () => void`, and `closeDrawer: () => void`.
   - **Tactile Feedback**: `addToCart` automatically sets `isDrawerOpen: true` upon successful addition, providing immediate positive confirmation to the user.
   - **Zero Regression Invariant**: 100% of existing optimistic update logic, rollback on network failure, server-authoritative pricing reconciliation, and `mutatingItemIds` concurrency guards preserved intact.

3. **Dedicated Cart Page Refinement (`app/cart/page.tsx`, `CartItemThumbnail.tsx`)**:
   - **Breadcrumb Kicker**: Monospace uppercase kicker (`CATALOG / SHOPPING CART`) with clear navigation trail.
   - **Editorial Layout**: Two-column responsive grid on desktop (`w-full lg:w-2/3` items vs `w-full lg:w-1/3` summary), smoothly stacking on tablet and mobile.
   - **Line-Item Cards**: Warm canvas containers (`bg-canvas-warm/70 border border-editorial-border/90 rounded-2xl p-5 sm:p-6 shadow-sm`) with clear price display, unit price if quantity > 1, tactile quantity pill, custom crop preservation badge, and clean remove action.
   - **Sticky Order Summary**: Sticky desktop card (`bg-canvas-warm/80 border border-editorial-border rounded-2xl p-6 sm:p-7 shadow-sm sticky top-28`) with item count subtotal, delivery notice, tax inclusion note, prominent checkout button (`Proceed to Checkout ->`), "Continue Shopping" link, and museum-grade archival quality assurances.
   - **Checkout Entry Integration**: Checkout buttons on both `/cart` and `CartDrawer` link to `/checkout`, seamlessly moving the customer into the checkout form while preserving real line items.

---

## 14. Visual Polish Track: Checkout UI & Checkout-Flow Integration (Stage 18)

1. **Responsive 2-Column Editorial Checkout (`apps/storefront/app/checkout/page.tsx`)**:
   - **Left Column — Sequential Step Form**:
     - **Breadcrumb Kicker**: Monospace navigation trail (`← RETURN TO CART / SECURE CHECKOUT`).
     - **Step 1 (Contact Information)**: Numbered step pill, Full Name input with placeholder `e.g. Ananya Sharma`, Email Address with format validation, and Indian Mobile Phone Number with `+91` visual prefix container and numeric input restriction.
     - **Step 2 (Delivery Address)**: Numbered step pill, Street Address Line 1 (required), Address Line 2 (optional), State & City dynamic dropdowns powered by `country-state-city` with automatic city cascading based on the chosen state, 6-digit Indian PIN Code with strict numeric enforcement, and prefilled disabled Country (`India / IN`).
     - **Delivery & Reassurance Callout**: Warm canvas card highlighting "Complimentary Insured Courier Delivery" with reinforced corner protectors and moisture-sealed archival boxes.
     - **Action & Trust Controls**: Full-width high-contrast pill button (`h-14 bg-brand hover:bg-brand-pressed text-white rounded-pill`) launching Razorpay with authoritative total (`Pay ₹{total} with Razorpay`), accompanied by 256-Bit SSL Secured and UPI / Cards / NetBanking trust badges.
   - **Right Column — Sticky Order Summary**:
     - Warm canvas container (`bg-canvas-warm/75 border border-editorial-border/90 rounded-2xl p-6 sm:p-7 sticky top-24 shadow-sm backdrop-blur-xs`).
     - Scrollable line items with `CartItemThumbnail`, product names, selected option chips, quantities, and line totals.
     - Subtotal, complimentary shipping badge (`₹0`), included GST, and authoritative total due in deep serif ink.
     - Archival guarantee footer detailing 310gsm cotton rag and museum-certified pigment inks.

2. **Validation & Payload Construction (`src/utils/checkout-validation.ts`)**:
   - `validateCheckoutForm`: Enforces full name presence, RFC-compliant email regex, 10-digit Indian phone numbers (`/^[6-9]\d{9}$/`), street address line 1, delivery state, city, 6-digit postal code (`/^\d{6}$/`), and country (`India`).
   - `sanitizeIndianPhone`: Strips non-digits, hyphens, and whitespace, truncating to 10 characters.
   - `buildCheckoutInitPayload`: Trims whitespace from all inputs and outputs canonical `CheckoutInitInput` matching the backend contract.

3. **Lifecycle & Guard Resilience**:
   - Introduced async `isInitializing` state in `CheckoutPage` to prevent the empty-cart redirect from prematurely firing during initial client mount and cart store hydration.
   - Direct visits or refreshes on `/checkout` now reliably await `fetchCart()` before making any redirect decisions.

4. **Elevated Order Success & Status Polling (`apps/storefront/app/checkout/success/page.tsx`)**:
   - **Confirmed State**: Editorial celebration screen featuring emerald verified seal, Playfair headline, selectable monospace order reference card (`ord_...`), Payment Verified badge, and a 3-step production timeline ("1. Order Confirmed & Payment Captured -> 2. Fine Art Printing & Custom Framing -> 3. Insured Courier Dispatch").
   - **Pending / Verifying States**: Reassuring copy explaining webhook capture and backend status synchronization with active spinners.
   - **Cancelled / Expired States**: Non-punitive recovery card explaining that selected items remain safely saved in the cart, with a prominent "Return to Cart & Retry" CTA.
   - **Client Security Rule**: The client NEVER confirms orders itself; only backend webhook (or authoritative status polling) provides verified confirmation.

---

## 15. Visual Polish Track: Customer Account, Order History & Order Tracking (Stage 19)

1. **Editorial Customer Account Hub (`apps/storefront/app/account/`)**:
   - **Account Layout (`app/account/layout.tsx`)**:
     - Monospace breadcrumb kicker (`STOREFRONT / CUSTOMER ACCOUNT`).
     - Replaced premature bounce redirect with an in-place editorial Sign In card ("Sign in to Your Account", phone OTP sign-in CTA, guest tracking link, passwordless security guarantee).
     - Collector Profile Header: Displays customer avatar/initials badge, customer name (`user.first_name user.last_name`), registered phone number (`+91...`), and one-click Sign Out action.
     - Sticky/responsive navigation tabs: `Overview` (`/account`), `Order History` (`/account/orders`), and `Track Shipment` (`/track-order`).
   - **Account Overview Dashboard (`app/account/page.tsx`)**:
     - Personalized greeting ("Welcome back, {firstName}").
     - Quick action cards for Order History & Invoices and Courier Tracking.
     - Profile & Security details card with SMS OTP authentication indicator.
     - FirstMemoir Craftsmanship Standard card highlighting 100% cotton-rag archival paper, solid hardwood framing, insured white-glove transit, and direct artisan concierge support.

2. **Order History & Invoices (`apps/storefront/app/account/orders/`)**:
   - **Order List Page (`app/account/orders/page.tsx`)**:
     - Animated pulse loading skeletons matching the card layout.
     - Empty state with editorial icon, helpful guidance, and direct links to "Start Creating" and "Track Guest Order".
     - Authoritative pagination controls (`Previous` / `Next` with chevron indicators).
   - **Order Card (`src/components/orders/OrderCard.tsx`)**:
     - FirstMemoir editorial card styling with hover elevation and border accents.
     - Authoritative status badge with colored dot indicators (`getOrderStatusBadge`).
     - Monospace order reference (`#FM-...`), formatted Indian currency pricing, item count badge, and formatted date (`formatOrderDate`).

3. **Order Detail & Artisan Production Timeline (`apps/storefront/app/account/orders/[id]/page.tsx`)**:
   - **Header & Navigation**: Back link to Order History, full order ID, placed date/time, and status badge.
   - **Air Waybill (AWB) Banner**: Dedicated consignment callout when `tracking_awb` is present, with one-click clipboard copy.
   - **Responsive Production Timeline (`src/components/orders/OrderStatusTimeline.tsx`)**:
     - Horizontal progress tracker on desktop, vertical step tracker on mobile.
     - Stages: `Order Placed` -> `Confirmed` -> `In Production` -> `Dispatched` -> `Delivered`.
     - Active pulsing indicator on current stage; detailed descriptions per stage.
     - Graceful recovery banners for terminal states (`CANCELLED`, `REFUNDED`, `EXPIRED`).
   - **Custom Print Line Items (`src/components/orders/OrderItemCard.tsx`)**:
     - High-resolution thumbnail preview with fallback handling.
     - Customization summary chips (dimensions, frame material/color, mat size, archival finish).
     - Unit pricing, quantity, and line item total.
   - **Payment & Delivery Cards**: Subtotal, complimentary shipping notice, estimated GST, total paid, and formatted shipping address.

4. **Guest Order Tracking (`apps/storefront/app/track-order/page.tsx`)**:
   - Monospace workshop kicker and headline ("Track Your Shipment").
   - Privacy-safe lookup requiring both `order_id` (UUID) and 10-digit mobile number (`+91`).
   - Inline validation, error alerts, and live loading state.
   - Detailed results card rendering the order summary, status badge, production timeline, and included items without exposing customer addresses or payment details.
   - Prompt linking to full authenticated order history with mobile OTP.

5. **Authoritative Status Utility (`src/utils/order-status.ts`)**:
   - Consolidated `ORDER_STATUS_MAP` supporting `PENDING`, `CONFIRMED`, `PROCESSING`, `READY_FOR_PICKUP`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`, and `EXPIRED`.
   - `getOrderStatusBadge`: Safe case-insensitive normalization with fallback to unknown.
   - `formatOrderDate` & `formatOrderDateTime`: Indian locale (`en-IN`) date formatters with invalid-input protection.

---

## 16. Visual Polish 07: Admin Order Operations & Fulfillment Workflow

### Architectural Overview
Admin operations have been significantly elevated from an unstyled scaffold into a production-grade operational hub for staff to manage customer orders, monitor payment verifications, and orchestrate fulfillment transitions without violating server authority.

1. **Admin Orders Dashboard (`apps/admin/src/pages/Orders.tsx`)**:
   - **Unified Search**: Real-time debounced search bar querying Order ID, customer email, customer phone number, and Shiprocket AWB tracking codes.
   - **Lifecycle Filter Tabs**: Dedicated tabs for `All Orders`, `Confirmed`, `In Production` (`PROCESSING`), `Ready for Pickup` (`READY_FOR_PICKUP`), `Shipped`, `Delivered`, and `Cancelled`.
   - **Payment Status Filter**: Secondary filter isolating `Captured`, `Pending`, and `Failed` payment transactions.
   - **Status Badges & Distinction**: Visually distinct status badge styling ensuring staff never confuse payment capture (`CAPTURED`) with order production lifecycle (`PROCESSING` or `READY_FOR_PICKUP`).
   - **Interactive Table**: Displays monospace Order ID with AWB tag, formatted Indian timestamps, customer contact, item count badges, INR order totals, and responsive `View` buttons.
   - **Pagination & Skeletons**: Paginated table with range indicators, Previous/Next navigation, pulse skeletons, and friendly zero-state screens with a "Clear all filters" shortcut.

2. **Admin Order Detail & Operational Transitions (`apps/admin/src/pages/OrderDetail.tsx`)**:
   - **Three-Panel Layout**:
     - **Customized Line Items & Manufacturing Specs**: Line items render thumbnails, product SKUs, quantities, unit prices, selected option pills, physical print dimensions (`width × height + unit`), orientation, effective DPI, print quality status, crop coordinates, and master asset download buttons.
     - **Audit & Status History Timeline**: Chronological event log rendered from `order.status_history` tracking previous and new statuses, descriptions, and timestamps.
     - **Payment & Customer Summaries**: Displays verified Razorpay Payment ID, payment method, captured amounts, breakdown (subtotal, shipping, GST, discount), customer details, and shipping address snapshots.
     - **Courier & Shipping Integration**: Discloses Shiprocket integration status (Dry Run active, live credentials configured, or missing credentials), tracking AWB, Shiprocket Order ID, and Shipment ID.
   - **Safe Operational Status Transitions**:
     - `CONFIRMED -> PROCESSING`: "Begin Production" button runs server-side manufacturing validation (ensuring address, SKU, and dimensions are complete).
     - `PROCESSING -> READY_FOR_PICKUP`: "Complete Production" button provides a decoupled manual workshop completion transition.
     - `Shiprocket AWB Generation`: "Generate Shiprocket AWB" button contacts Shiprocket (or dry-run mock) to create the order, assign AWB, and advance to `READY_FOR_PICKUP`.
     - Loading spinners and disabled states prevent duplicate clicks or stale race conditions.
   - **Master Asset Download**: Generates 5-minute presigned Cloudflare R2 download URLs with `Content-Disposition` attachment headers for production printing.

3. **Backend API & Client Extensions**:
   - `adminOrdersController.listOrders`: Supports `page`, `limit`, `status`, `payment_status`, and `search` query parameters with PostgreSQL `mode: 'insensitive'` matching and item counts.
   - `adminOrdersController.getOrderDetail`: Includes `status_history: { orderBy: { created_at: 'asc' } }`, `payments`, and `shiprocketStatus` metadata.
   - `adminOrdersController.generateAwb`: Wrapped in a Prisma transaction that creates an `OrderStatusHistory` entry when the AWB is assigned.
   - `@repo/api-client`: Exported `ListOrdersParams`, `ListOrdersResponse`, and `OrderDetailResponse`.

4. **Security & Authorization Invariants**:
   - All admin endpoints are protected under `authenticate` and `requireAdmin` (`req.user.role === 'ADMIN'`). Ordinary `CUSTOMER` tokens receive `403 Forbidden`.
   - Guest tracking requires both UUID and valid E.164 phone number, enforced with `orderTrackLimiter`.

---

## 17. Visual Polish 08: Fulfillment Reliability & Reconciliation Architecture

### Architectural Overview
Fulfillment reliability and reconciliation have been established with end-to-end fail-closed safety, strict status separation, concurrency locking, and audit synchronization.

1. **Four-Status Operational Separation**:
   - **Payment Status**: `CAPTURED`, `PENDING`, `FAILED`, `REFUNDED` (Razorpay HMAC-SHA256 authoritative).
   - **Order Lifecycle Status**: `PENDING`, `CONFIRMED`, `PROCESSING`, `READY_FOR_PICKUP`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `EXPIRED`.
   - **Production Status**: Lab workshop state (`CONFIRMED -> PROCESSING -> READY_FOR_PICKUP`), independent of carrier dispatch.
   - **Shipment Status**: Carrier transit state reported via Shiprocket webhook (`42`, `6`, `18`, `17`, `7`).

2. **Shipment Creation Concurrency & Retry Resilience (`apps/api/src/controllers/admin.orders.controller.ts`)**:
   - **Concurrency Guard**: Module-level `inFlightAwbGenerations = new Set<string>()` immediately rejects simultaneous generation attempts on the same order with `409 Conflict`.
   - **Retry Idempotency**: If `order.tracking_awb` and `order.shiprocket_shipment_id` already exist, `generateAwb` cleanly returns the existing shipment without re-calling Shiprocket.
   - **Preflight Manufacturing Validation**: Checks shipping address completeness (name, line1, city, state, postal code), non-empty items array, valid product SKUs, and physical dimensions before dispatching any external HTTP calls.
   - **Duplicate Shipment Recovery**: `shiprocketService.createCustomOrder` recovers previously created consignments via `recoverExistingShipment` on network timeouts.

3. **Shipment Status Reconciliation (`apps/api/src/controllers/shiprocket.webhook.controller.ts`)**:
   - **Fail-Closed Authentication**: Validates `x-api-key` against `env.SHIPROCKET_WEBHOOK_TOKEN` with explicit fail-closed checks.
   - **Raw Body Idempotency Fingerprint**: SHA-256 hash of raw payload buffer (`sr_wh_<hash>`) stored in `WebhookEvent`. Duplicate webhooks trigger Prisma `P2002` and return `200 OK`.
   - **Row-Level Transaction Locking**: Locks order row via `SELECT 1 FROM orders WHERE id = $id FOR UPDATE`.
   - **Safe Status Advancement & Direct Transitions**:
     - Group A (`42`, `6`, `18`, `17`): Advances `READY_FOR_PICKUP -> SHIPPED`.
     - Group B (`7`): Advances `SHIPPED -> DELIVERED` and directly advances `READY_FOR_PICKUP -> DELIVERED` if carrier skipped interim tracking events.
   - **Regression Immunity**: Ignores out-of-order webhooks (e.g., status 42 or 18 received for an order already `DELIVERED`).
   - **Synchronized Audit History**: Logs `OrderStatusHistory` entries within the transaction so customer tracking timelines and admin dashboards remain in sync.

4. **Master Print Asset Protection (`downloadMasterAsset`)**:
   - Restricted strictly to authenticated `ADMIN` users.
   - Blocks non-production states (`403 Forbidden` for `PENDING`, `EXPIRED`, `CANCELLED`).
   - Verifies item-to-order ownership (`order.items.find(i => i.id === itemId)`).
   - Validates that `master_file_key` strictly starts with `customers/` (rejecting `products/*` or system paths).
   - Strictly rejects path traversal characters (`..` or `\`) with `400 Bad Request`.
   - Generates 5-minute presigned R2 URLs with `Content-Disposition: attachment`.

5. **Notification Deduplication**:
   - `NotificationService.enqueueNotification` enforces compound unique constraint `@@unique([order_id, channel, event_type])` to prevent duplicate SMS/email dispatches on retried webhook events.

---

## 18. Visual Polish 09: Staging Acceptance & Distributed Concurrency Hardening

### Architectural Overview
Visual Polish 09 elevates the order operations, fulfillment, and webhook pipelines to full multi-instance distributed reliability with zero schema drift.

1. **Two-Tier Concurrency Architecture (`apps/api/src/controllers/admin.orders.controller.ts`)**:
   - **Tier 1 (In-Memory)**: Immediate local event loop guard via `inFlightAwbGenerations = new Set<string>()`.
   - **Tier 2 (Distributed Database Lock)**: Uses PostgreSQL unique constraint on `WebhookEvent.event_id` (`lock:awb:${id}`) inside `adminOrdersController.generateAwb`. Avoids session-level advisory locks that conflict with PgBouncer/Neon transaction pooling.
   - **Stale Lock Recovery**: Automatically recovers locks older than 60 seconds resulting from crashed worker containers.
   - **Row-Level Atomic Re-Check**: Before committing the AWB and transitioning to `READY_FOR_PICKUP`, `generateAwb` verifies `order.status === 'PROCESSING'` inside the transaction. If the order was modified concurrently (e.g. cancelled), it aborts with `409 Conflict`.

2. **Storage Error Boundary (`downloadMasterAsset`)**:
   - Master print asset URL generation wraps `storageService.generateReadUrl` in a try/catch block. Cloudflare R2 timeouts or authentication failures return a clean `502 Bad Gateway` to the admin client without leaking AWS SDK internal stack traces.

3. **Proactive Duplicate Prevention (`apps/api/src/services/shiprocket.service.ts`)**:
   - `createCustomOrder` probes `recoverExistingShipment` (`GET /orders/show?channel_order_id=${orderId}`) before dispatching `orders/create/adhoc`.
   - Reuses existing `awbCode` if already assigned by Shiprocket, preventing redundant carrier assignment calls.

4. **Logical Event Identity & Granular Carrier History (`apps/api/src/controllers/shiprocket.webhook.controller.ts`)**:
   - Computes composite logical idempotency key `sr_evt_${shipmentId || awb}_${currentStatusId}${statusDate}` resilient against JSON formatting differences.
   - When an order is already `SHIPPED`, intermediate carrier updates (status 18 "In Transit", 17 "Out For Delivery", scan locations) are logged to `OrderStatusHistory` without resetting `order.status`. Customer tracking and admin order detail timelines accurately display each courier transit hop.
   - Out-of-order regressions against `DELIVERED` orders are strictly rejected.

5. **Notification Failure Retry & Idempotency (`apps/api/src/services/notification/notification.service.ts`)**:
   - On unique constraint collision (`P2002`), checks the status of the existing record. If `FAILED`, resets to `PENDING` and retriggers dispatch; if `SENT`, safely skips without duplicate sends.

6. **Automated Verification**:
   - 44/44 API unit tests passing in `admin.orders.unit.test.ts`.
   - 97/97 Storefront unit, contract, and staging integration tests passing across 26 suites.
   - 0 TypeScript errors across the entire monorepo.
   - Storefront production build: 15/15 static and dynamic pages compiled in 4.6s.
   - Admin Vite build: 1822 modules transformed in 641ms.

---

## 19. Visual Polish 10: Distributed Lock Fencing, Webhook Identity & Launch Readiness

### Architectural Overview
Visual Polish 10 closes the remaining edge cases in distributed shipment concurrency, carrier socket drop recovery, carrier event deduplication, and notification dispatch correctness.

1. **Distributed Lock Fencing with UUID Tokens (`admin.orders.controller.ts`)**:
   - **Fencing Token Generation**: Each AWB generation attempt generates a unique UUID `lockToken = crypto.randomUUID()`.
   - **Database Distributed Lock Payload**: The token is stored within the PostgreSQL `WebhookEvent` table (`event_id: lock:awb:${id}`) alongside `lockedAt`.
   - **Stale Lock Reclamation**: Locks older than 60 seconds (abandoned by crashed containers) are broken atomically and re-acquired with a fresh `lockToken`.
   - **Transactional Fencing Check**: Inside `prisma.$transaction`, the controller re-queries `activeLock = await tx.webhookEvent.findUnique(...)`. If `activeLock.payload.lockToken !== lockToken`, the worker knows its lease was superseded or broken by a newer process during external provider latency, and aborts immediately with `409 Conflict`.
   - **Safe Stale Lock Release**: The `finally` release block re-verifies `currentLock.payload.lockToken === lockToken` before deleting. This guarantees that an expired or slow worker will never delete a newer worker's active lock.

2. **Carrier Ambiguous Timeout Recovery (`apps/api/src/services/shiprocket.service.ts`)**:
   - **Socket Interruption Guard**: Calls to `orders/create/adhoc` are wrapped in network-timeout handling.
   - **Immediate Post-Timeout Probe**: If a socket drop or `ETIMEDOUT` exception occurs, the service immediately invokes `recoverExistingShipment(order.id, token)` before failing.
   - **Zero Duplicate Shipments**: If Shiprocket received and processed the order prior to the socket disconnect, the service transparently recovers `shiprocketOrderId`, `shipmentId`, and `awbCode` without creating a duplicate consignment.
   - **Fail-Safe Abort**: If recovery confirms the order does not exist in Shiprocket, the service throws `504 Gateway Timeout` directing the caller to safely retry.

3. **Provider Event Identity & Granular Transit Preservation (`apps/api/src/controllers/shiprocket.webhook.controller.ts`)**:
   - **Stable Provider Event IDs**: Prefers carrier-provided stable IDs (`payload.event_id || payload.scan_id || payload.webhook_id || payload.id`) for deduplication.
   - **Location-Aware Fallback Key**: When provider IDs are missing, constructs composite key `sr_evt_${shipmentId}_${currentStatusId}_${scanTimestamp}_${scanLocation}_${scanActivity}`.
   - **Preservation of Legitimate Multi-Hop Scans**: Multiple carrier updates sharing the same status (e.g. status 18 "In Transit" at Mumbai Hub, then status 18 at Delhi Hub) are preserved as distinct events in `OrderStatusHistory`, providing full visibility into courier hops while eliminating duplicate deliveries.
   - **Terminal State Regression Immunity**: Webhooks arriving for orders already in `DELIVERED` status are safely acknowledged (200 OK) without mutating order status or creating redundant history entries.

4. **Atomic Notification Claiming & Retry Limits (`apps/api/src/services/notification/notification.service.ts`)**:
   - **Atomic Worker Claim**: Workers claim pending notifications using `prisma.notificationLog.updateMany({ where: { id: logId, status: 'PENDING' }, data: { status: 'PROCESSING', attempt_count: { increment: 1 } } })`. Only the single worker receiving `count === 1` proceeds to provider dispatch, eliminating concurrent double-send races.
   - **Retry Upper Bound**: On `P2002` unique constraint collisions, failed notifications are retried only up to 5 attempts (`attempt_count < 5`), preventing poison-pill infinite loops.
   - **Provider Diagnostics**: Retains provider error details and HTTP failure codes in `error_message`.

5. **Automated Verification & Quality Gates**:
   - 50/50 API unit tests passing in `admin.orders.unit.test.ts` across 11 suites.
   - 97/97 Storefront unit, contract, and staging integration tests passing across 26 suites.
   - 0 TypeScript errors across the entire monorepo (`apps/api`, `apps/storefront`, `apps/admin`, `@repo/*`).
   - Storefront Next.js 16 production build: 15/15 static and dynamic pages compiled in 3.4s.
   - Admin Vite build: 1822 modules transformed in 704ms.
   - Live Staging Connectivity: Staging API and Storefront return HTTP 200.

---

## 20. Visual Polish 11: Release Candidate Acceptance & Launch Decision

### Architectural Overview
Visual Polish 11 resolves the remaining critical reliability gaps in shipment creation duplicate prevention, worker crash recovery for notifications, and webhook transition edge cases, and establishes an evidence-based release candidate acceptance position.

1. **Shipment Creation: Provider Idempotency & Database Persistence Failure Recovery (`apps/api/src/services/shiprocket.service.ts`)**:
   - **Provider Idempotency via Channel Order ID**: Shiprocket enforces a unique `order_id` per channel. If a concurrent or expired worker creates a consignment, any duplicate create request returns HTTP 400 Bad Request (`already exists`).
   - **Pre-Creation & Post-Collision Recovery**: `createCustomOrder` probes `recoverExistingShipment(order.id, token)` before creating, and automatically intercepts HTTP 400 "already exists" errors to extract the existing shipment IDs without throwing or duplicating consignments.
   - **Persistence Failure Recovery**: If Shiprocket returns success but the local database transaction fails or rolls back, subsequent retries immediately discover the existing shipment via `recoverExistingShipment` and commit it to the database without calling `orders/create/adhoc`.
   - **Malformed Provider Guard**: Validates that Shiprocket's response contains non-empty `order_id` and `shipment_id`, throwing a clean `502 Bad Gateway` if malformed.

2. **Notification Crash Recovery & At-Least-Once Semantics (`apps/api/src/services/notification/notification.service.ts`)**:
   - **Leased Claiming Architecture**: When a worker claims a notification via `updateMany({ where: { status: 'PENDING' } })`, it sets `status: 'PROCESSING'` and stores a lease timestamp in `error_message: 'LEASE:<timestamp>'`.
   - **Stale Claim Reclaim**: If a worker process terminates or crashes while in `PROCESSING`, subsequent enqueue attempts and the `reclaimStaleProcessingNotifications` sweep method check whether the lease is older than 5 minutes (`staleThresholdMs = 300_000`). Stale records with `attempt_count < 5` are atomically reclaimed to `PENDING` and re-dispatched.
   - **Active Lease Protection**: Claims younger than 5 minutes are strictly protected from premature re-dispatch, preventing concurrent duplicate sends while the original worker is still legitimately transmitting.
   - **Bounded Retries**: Notifications that fail or crash 5 times are marked `FAILED` with diagnostic reasons, preventing infinite poison-pill loops.
   - **Delivery Guarantees Documented**: Because third-party SMS/email gateways do not support two-phase commit, notifications provide **at-least-once** delivery with deduplication, not exactly-once.

3. **Webhook Transition Edge Cases (`apps/api/src/controllers/shiprocket.webhook.controller.ts`)**:
   - **Direct Transition from PROCESSING**: Allows carrier pickup events (`shippedStatusIds = [42, 6, 18, 17]`) to transition orders in either `READY_FOR_PICKUP` or `PROCESSING` to `SHIPPED`.
   - **Unknown Status Handling**: Unrecognized status IDs (e.g. 9999) return `200 OK` without altering order state or corrupting timelines.
   - **Sparse Webhook Payloads**: Gracefully handles webhooks missing timestamps or scan arrays, falling back to clean composite idempotency fingerprints.

4. **Staging Journey & Final Quality Gates**:
   - 59/59 API unit tests passing across 12 suites (including 9 new VP11 tests).
   - 97/97 Storefront unit, contract, and live staging tests passing across 26 suites.
   - 0 TypeScript errors across the entire monorepo (`turbo run check-types`).
   - Storefront production build: 15/15 static and dynamic routes compiled in 3.6s.
   - Admin Vite build: 1822 modules transformed in 663ms.
   - Live Staging Acceptance Journey: Verified against Render staging API and Neon PostgreSQL (`scripts/verify-staging-checkout.ts`), confirming catalog query, cart line item addition, order creation, Razorpay test mode verification (`rzp_test_TmIGcynU0XmBZ8`), status polling isolation, and HMAC-SHA256 verified webhook confirmation to `CONFIRMED`.



