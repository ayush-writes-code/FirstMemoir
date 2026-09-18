# Project State: WePrintIt

> **Milestone Status**: Checkout & Payment Pipeline Complete  
> **Date**: August 16, 2026  
> **Platform**: WePrintIt / First Memoir — Custom Photo Printing Platform

---

## 1. Executive Summary

WePrintIt is a production-ready, full-stack custom photo printing platform. The core customer purchase lifecycle, payment capture, webhook idempotency, upload retention management, and admin order fulfillment review pipelines have been completed and verified end-to-end.

---

## 2. Completed Features

### Frontend (Storefront & Admin)
- **Product Catalog**: Dynamic catalog browsing, category filters, responsive grid layout.
- **Product Details & Customization Flow**:
  - Interactive multi-axis image upload (Client-side DPI calculations, aspect-ratio lock, orientation toggles).
  - Direct multipart image upload to Cloudflare R2 with instant client preview generation.
  - Dynamic option variant selector (size, paper finish, frames) with real-time price modifier computation.
  - Print quality indicators (`EXCELLENT`, `GOOD`, `LOW_QUALITY`) and explicit low-DPI user acknowledgment gate.
- **Shopping Cart**:
  - Session-bound and user-authenticated persistent cart line items.
  - Snapshot validation, image crop geometry preservation, and authoritative server-side price calculation.
- **Checkout**:
  - Delivery address capture with strict validation.
  - Razorpay JS Checkout integration with seamless modal dismissal and retry handling.
  - Idempotent double-click protection against duplicate orders.
- **Success & Order Confirmation**:
  - Live order status polling page (`/checkout/success?order_id=...`).
  - Graceful transition to confirmed state as soon as authoritative webhook confirms payment.

### Backend (Express API & Shared Packages)
- **Authentication**: JWT-based authentication for customers and admins with role-based access control.
- **Product & Category Management**: Full CRUD APIs with SKU support, active toggles, and relational category binding.
- **Cart Pipeline**: Authoritative server-side pricing recalculation, stale cart item handling, and session linkage.
- **Checkout Engine**:
  - Atomic database transactions with row-level locks (`SELECT FOR UPDATE`).
  - Razorpay Order initialization with server-calculated amounts in paise.
  - Stale/paid Razorpay order detection: automatically expires abandoned orders and creates fresh Razorpay orders on retry.
- **Payment & Webhook Engine**:
  - Cryptographic HMAC-SHA256 signature verification on `/api/v1/webhooks/razorpay`.
  - Idempotent event ledger (`WebhookEvent`) preventing replay attacks or duplicate processing.
  - Atomic post-payment transaction: transitions `Order` (`PENDING` → `CONFIRMED`), logs `Payment` (`CAPTURED`), locks `UserUpload` assets (`ORDERED_RETAINED`), and clears purchased items from the active cart.
- **Admin Orders & Fulfillment Management**:
  - Orders listing with multi-status filtering (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
  - Detailed order view showing customer contact, shipping address, payment transaction IDs, line items, physical dimensions, and master high-res upload assets.
  - Order state transition (`CONFIRMED` → `PROCESSING`).

---

## 3. Verified End-to-End Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Storefront
    participant API as API Server
    participant DB as PostgreSQL
    participant RZP as Razorpay Gateway
    actor Admin

    Customer->>Storefront: 1. Uploads High-Res Photo
    Storefront->>API: 2. Save Upload Asset (Cloudflare R2)
    Customer->>Storefront: 3. Customizes Options & Adds to Cart
    Storefront->>API: 4. Add Line Item to Cart
    Customer->>Storefront: 5. Enters Shipping Address & Clicks Checkout
    Storefront->>API: 6. POST /api/v1/checkout/initialize
    API->>RZP: 7. Create Razorpay Order
    API->>DB: 8. Create Local Order (PENDING) & CHECKOUT_LOCKED uploads
    API-->>Storefront: 9. Return razorpay_order_id & order_id
    Storefront->>Customer: 10. Opens Razorpay Payment Modal
    Customer->>RZP: 11. Completes Payment (UPI / Card / NetBanking / Wallet)
    RZP-->>Storefront: 12. Payment Success Handler
    Storefront->>Storefront: 13. Redirects to /checkout/success (Polling)
    RZP->>API: 14. POST /api/v1/webhooks/razorpay (payment.captured)
    API->>API: 15. Verify HMAC-SHA256 Signature
    API->>DB: 16. Transaction: Order CONFIRMED + Payment CAPTURED + Uploads ORDERED_RETAINED + Cart Cleared
    Storefront->>API: 17. Polls GET /api/v1/orders/:id/status
    API-->>Storefront: 18. Status: CONFIRMED
    Storefront->>Customer: 19. Displays Confirmed Order Screen
    Admin->>API: 20. GET /api/v1/admin/orders/:id
    Admin->>API: 21. POST /api/v1/admin/orders/:id/process
    API->>DB: 22. Order Status -> PROCESSING
```

---

## 4. Current Database State & Schema Entities

| Entity | Purpose | Key Fields / Invariants |
| :--- | :--- | :--- |
| **`Product`** | Catalog print products | `id`, `name`, `slug`, `sku`, `base_price`, `is_active`, `category_id` |
| **`ProductOption` / `Value`** | Customization attributes | Size, Paper Finish, Frame variants with `price_modifier` and physical dimensions |
| **`UserUpload`** | High-res customer images | `r2_key`, `preview_r2_key`, `retention_status` (`CART_ATTACHED` → `CHECKOUT_LOCKED` → `ORDERED_RETAINED`) |
| **`Cart` & `CartLineItem`** | Active shopping baskets | `session_id`, `user_id`, `quantity`, `crop_x`, `crop_y`, `effective_dpi`, `dpi_acknowledged` |
| **`Order`** | Authoritative order records | `status` (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `total_amount`, `shipping_address_snapshot` |
| **`OrderItem`** | Snapshot of purchased items | `product_id`, `upload_id`, `unit_price`, `customization_data` (immutable pricing & dimension snapshot) |
| **`Payment`** | Ledger of financial captures | `order_id`, `razorpay_payment_id` (Unique), `status` (`CAPTURED`), `amount` |
| **`WebhookEvent`** | Idempotent webhook log | `event_id` (Unique), `provider` (`razorpay` / `shiprocket`), `processing_status` (`PROCESSED`) |

---

## 5. Known Deferred Items (Shiprocket & Courier Boundaries)

> [!IMPORTANT]
> Shiprocket automated fulfillment is intentionally parked behind the safety guard `PACKAGE_FULFILLMENT_METRICS_UNDEFINED`.

### Client Business Rules Needed Before Resuming Fulfillment:
1. **Courier Packaging Type**: Box, tube, flat mailer, or bubble wrap specs per product category.
2. **Dead Weight & Slabs**: Exact tare weights of frames, canvas stretcher bars, paper weights, and tare packaging weight.
3. **Volumetric Dimensions**: Master packaged dimensions $(L \times W \times H)$ calculated per combination of frame sizes and quantities.
4. **Pickup Location Code**: Authoritative Shiprocket warehouse pickup location nickname.
5. **R2 Asset Retention Policy**: Automated archival or deletion timeline for high-res master files after successful printing/delivery.
6. **Customer Notifications**: Selection and credentials for transactional SMS/WhatsApp/Email providers (e.g., Twilio, SendGrid, Gupshup).

---

## 6. Next Development Phase

1. **Manufacturing / Lab Queue Workflow**: Admin print queue with high-res asset download bundles for lab operators.
2. **Customer Account Portal**: Customer order history, tracking links, and reorder functionality.
3. **Transactional Notifications**: Automated email/WhatsApp notifications upon payment capture and order dispatch.
4. **Shiprocket Shipping Engine**: Implementation of courier dimension calculators and live AWB generation once business rules are finalized.
5. **Production Cloud Deployment**: Production containerization, CDN routing, and PostgreSQL migration deployment to Neon.

---

## 7. Customer Resilience & Operational Observability Milestone
Completed phase focused on architecture safety and operational monitoring.
See `docs/phases/customer_resilience_and_observability_completion.md` for full implementation details, proxy configuration logic, storefront boundary additions, and webhook protection rationale.

## 8. Integration Test Infrastructure Recovery Milestone
Automated testing environment restored with strict Docker orchestration, isolated Prisma schema migration targeting, and 109 verified tests to ensure webhook and checkout pipeline resilience.

## 9. Continuous Integration & Quality Gate Milestone
Implemented rigorous repository linting and type-checking pipelines. Configured automated GitHub Actions workflows. Replaced broad technical-debt overrides with exact file-level boundaries to ensure all new source files enforce strict linting rules. Addressed unescaped entities and unused parameters where behavior-preserving.

## 10. API Production Reliability & Deployment Foundation Milestone
Refactored the Node.js API process for production safety. Implemented `SIGTERM`/`SIGINT` listeners to trigger graceful shutdown logic (`server.close()` and `prisma.$disconnect()`). Segregated health checks into distinct explicit `/api/health/live` and `/api/health/ready` endpoints. Configured a multi-stage Dockerfile (`node:20-slim`) for the API using Turborepo dependency filtering, prioritizing a lightweight production runtime with the Prisma Client explicitly generated for the Debian environment. Documented the Prisma migration strategy as a pre-deploy release-phase command.

## 11. Mobile-First Client Demo & Vercel Readiness Milestone
Completed the preparation of the storefront for an independent, mobile-first client demo.
- **Mobile UX Fixes:** Upgraded cart increment/decrement touch targets to 44px (`w-11 h-11`). Configured numeric input modes (`inputMode="numeric" pattern="[0-9]*"`) for the phone and pincode checkout fields. Added layout clearance padding to the `ProductCustomizer` to prevent the sticky mobile CTA from obscuring product options.
- **Performance:** Removed the `unoptimized` flag from Next.js `<Image>` tags on the homepage, allowing Vercel's edge network to optimize the heavy Unsplash demo images for mobile bandwidth.
- **Environment & Demo Independence:** Eradicated the hardcoded localhost API assumption. The repository is now Configuration-Ready and Build-Ready for a live deployment. The Storefront dynamically configures the API URL using `NEXT_PUBLIC_API_URL` via a clean environment adapter (`apps/storefront/src/lib/api-client.ts`), ensuring deterministic Next.js SSR execution without React-layer side effects. The Vite Admin app is similarly initialized in `main.tsx` via `VITE_API_URL`. Both `NEXT_PUBLIC_API_URL` and `VITE_API_URL` are registered in Turborepo's `globalEnv`.
- **Demo Data Strategy:** Inspected the existing `packages/database/prisma/seed.ts` and confirmed it is already idempotent, deterministic, and highly realistic. It seeds 9 premium demo products (using Unsplash placeholders) with full relational options (frames, sizes) and exclusions. No duplicate seed mechanism is required. 
- **Deployment Strategy:** Recommended Vercel for the Storefront (native Turborepo and Next.js Image support). Recommended deploying the API Docker container to a stable backend provider (e.g., Render Web Services) connected to a hobby PostgreSQL database (e.g., Neon).
- **Current Blockers:** 
  - **Client Data:** Real SKUs, packaging volumetric dimensions, tare weights, Courier constraints, and real pricing.
  - **Infrastructure:** Actual provisioning of the Render API and Neon DB for the demo backend.

## 12. Cross-Site Staging Configuration
Prepared the API authentication architecture to support a completely decoupled, cross-site Vercel + Render deployment for the initial client demo.
- Added `COOKIE_SAME_SITE` as an environment variable (allowing `lax`, `strict`, or `none`).
- Configured `none` mode to automatically enforce `secure: true`.
- **Important:** Vercel + Render requires `COOKIE_SAME_SITE=none` because they operate on different root domains (cross-site). Normal environments (localhost or same-site production domains) deliberately retain the safer `lax` or `strict` defaults to prevent CSRF vulnerabilities. Actual Vercel/Render deployment has NOT yet occurred.

## 13. Public Client Demo Deployment

**Checkpoint: Storefront Vercel Deployment & GitHub Remote Initialization**
- **GitHub Remote:** Successfully configured and pushed (`origin`).
- **Branch:** `phase-3-2-categories`
- **Latest Commit:** `f070fff`
- **Storefront Deployment:** The Storefront is successfully deployed and publicly accessible via Vercel (`https://firstmemoir-storefront.vercel.app`).
- **Next Step:** Deploy the `apps/api` container to Render using the newly configured GitHub repository.

**Checkpoint: Render API Deployment Runtime Fix**
- **Render Docker build:** Succeeded.
- **Runtime failure identified:** The API container crashed at startup (`ERR_UNKNOWN_FILE_EXTENSION`).
- **Root cause:** The `@repo/database` package had no build step and its `package.json` resolved to raw TypeScript (`index.ts`). The API production runtime correctly rejected executing TypeScript.
- **Production packaging fix implemented:** Added `tsconfig.json` and a `build` step to `@repo/database`. Updated `turbo.json` outputs to cache `dist/**`. Updated `package.json` `main`, `types`, and `exports` to resolve to the compiled `dist/index.js`.
- **Verification status:** Built and ran the Docker image locally. The container successfully executes compiled JavaScript and halts correctly at environment validation, proving the TS-execution error is resolved.
- **Next step:** Redeploy Render.
