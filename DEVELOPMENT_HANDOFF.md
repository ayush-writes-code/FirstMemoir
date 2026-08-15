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

---

## 5. Development & Testing Commands

```bash
# Install dependencies
npm install

# Run database migrations / generate client
cd packages/database
npx prisma generate
npx prisma db push

# Run full monorepo build
npm run build

# Run API test suite (88 tests)
cd apps/api
npm run test

# Run local development servers (Storefront :3000, Admin :5173, API :3001)
npm run dev
```
