# First Memoir.in (formerly WePrintIt.in) - Comprehensive Project Context & Single Source of Truth

**Document Version:** 1.0.0  
**Last Updated:** August 04, 2026  
**Status:** In Active Development (Phase 1 / Milestone 1 Foundation Completed)  
**Primary Developer:** Ayush Tomar  

---

> [!IMPORTANT]
> This document serves as the **Single Source of Truth (SSOT)** for any engineer or AI assistant working on the `First Memoir.in` codebase. It documents the complete project context, system architecture, database design, completed features, conventions, and architectural constraints. All future developments must strictly adhere to the guidelines set forth herein.

---

## 1. Project Overview

`First Memoir.in` is a premium direct-to-consumer (D2C) e-commerce platform in India dedicated to personalized photo prints, framed photos, canvas prints, acrylic prints, and custom posters. 

The application enables customers to:
1. Browse customizable product categories (photo frames, canvas, posters, etc.).
2. Upload high-resolution photos from their devices.
3. Validate photo print quality in real-time (effective DPI calculation).
4. Customize photo framing (frame styles, matting options, glass types, dynamic dimensions).
5. Preview live 2D canvas representations with exact aspect ratio enforcement.
6. Complete frictionless checkout using Razorpay (UPI, Netbanking, Cards) and Shiprocket logistics.
7. Track order lifecycle transparently from purchase to delivery.

The owner/admin can:
1. Manage products, categories, dynamic frame materials, and pricing rules.
2. Monitor orders across Kanban states (`PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
3. Download print-ready, high-resolution CMYK PDF/ZIP assets generated automatically per order item.
4. Generate Airway Bills (AWBs) and shipping labels via Shiprocket API.
5. Manage discount coupons, customer accounts, and view sales analytics.

---

## 2. Business Goals

- **Premium UX:** Deliver a high-end, responsive customization experience matching international standards (e.g., Framebridge, Shutterfly) while tailored for the Indian market.
- **Conversion Optimization:** Frictionless checkout with fast mobile OTP login, guest-friendly order tracking, and transparent dynamic pricing.
- **Automated Fulfillment:** Automate print-ready asset generation and shipping integration to reduce manual overhead per order.
- **Lean Infrastructure:** Minimize operational overhead during early stages (~₹1,500/month fixed server cost) using Cloudflare R2, BullMQ, and Dockerized Node.js Services.

---

## 3. Target Users

1. **Consumers:** Individuals seeking personalized home decor, family photo frames, or custom gifts.
2. **Professionals:** Photographers and digital artists requiring reliable, high-fidelity printing & custom framing options.
3. **Corporate / B2B:** Companies placing bulk orders for office decor or branded gifts (Phase 2 feature).

---

## 4. Complete System Architecture

The project is built as a **Turborepo Monorepo** containing three applications (`storefront`, `admin`, `api`) and five shared packages (`database`, `api-client`, `ui`, `shared`, `eslint-config`, `typescript-config`).

```
                              ┌──────────────────────────────────┐
                              │     Cloudflare Edge / CDN        │
                              └─────────────────┬────────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
    ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
    │     apps/storefront      │  │        apps/admin        │  │         apps/api         │
    │     (Next.js App Router) │  │     (Vite + React SPA)   │  │   (Express.js + Node)    │
    └────────────┬─────────────┘  └────────────┬─────────────┘  └────────────┬─────────────┘
                 │                             │                             │
                 └─────────────────────────────┼─────────────────────────────┘
                                               │
                                               ▼
                               ┌───────────────────────────────┐
                               │   PostgreSQL + Prisma ORM     │
                               │    (packages/database)        │
                               └───────────────────────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      ▼                                                 ▼
        ┌───────────────────────────┐                     ┌───────────────────────────┐
        │       Cloudflare R2       │                     │    Redis + BullMQ Queue   │
        │   (Object Photo Storage)  │                     │  (Async Image Processing) │
        └───────────────────────────┘                     └───────────────────────────┘
```

---

## 5. Monorepo Structure

```text
FirstMemoir.in/
├── apps/
│   ├── storefront/             # Next.js 16 (App Router), React 19, Tailwind CSS, TypeScript
│   ├── admin/                  # Vite 8, React 19 SPA, Tailwind CSS, TypeScript, dnd-kit
│   └── api/                    # Express.js (Node.js ESM), TypeScript, AWS S3/R2 SDK, Zod, JWT
├── packages/
│   ├── database/               # Prisma ORM 6, PostgreSQL Schema, Client Export
│   ├── api-client/             # Shared API Client SDK for Storefront & Admin
│   ├── shared/                 # Shared TypeScript types, utility functions, storage schemas
│   ├── ui/                     # Shared React Component library
│   ├── eslint-config/          # Shared ESLint rules
│   └── typescript-config/      # Shared tsconfig base files
├── PROJECT_CONTEXT.md          # Single Source of Truth (This File)
├── README.md                   # Quickstart instructions
├── turbo.json                  # Turborepo task runner configuration
└── package.json                # Root package.json with workspace definitions
```

---

## 6. Tech Stack

| Layer | Technology | Rationale / Key Libraries |
| :--- | :--- | :--- |
| **Monorepo Engine** | Turborepo | Fast cached builds, workspace dependency management |
| **Storefront** | Next.js 16 (App Router), React 19 | SSR/SSG for SEO, low client bundle size, dynamic image loading |
| **Admin Panel** | Vite 8, React 19 SPA | Fast HMR, lightweight SPA bundle for auth-gated admin portal |
| **Backend API** | Node.js (ESM), Express 4 | High performance, Sharp.js ecosystem for image processing |
| **Database** | PostgreSQL 16 + Prisma ORM | Strict ACID compliance for financial/order integrity |
| **File Storage** | Cloudflare R2 | Zero egress fees, AWS S3 SDK compatible |
| **Queue & Workers** | Redis + BullMQ | Background thumbnail generation and print-ready PDF builds |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS with dark/light mode and custom tokens |
| **Authentication** | JWT in HttpOnly Cookies | Refresh token rotation, phone OTP verification |
| **Payments** | Razorpay | Domestic UPI, Netbanking, Cards with HMAC signature verification |
| **Shipping** | Shiprocket | Serviceability checks, automated AWB generation, transit webhooks |

---

## 7. Database Schema Overview (`packages/database`)

The PostgreSQL database is managed via Prisma (`schema.prisma`). It consists of **12 core models** and **6 Enums**:

### Enums
- `UserRole`: `CUSTOMER`, `ADMIN`
- `OrderStatus`: `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `PAYMENT_FAILED`
- `PaymentStatus`: `PENDING`, `CAPTURED`, `FAILED`, `REFUNDED`
- `UploadStatus`: `UPLOADING`, `PROCESSING`, `READY`, `FAILED`, `LOW_RESOLUTION`
- `FrameMaterialType`: `FRAME`, `MAT`, `GLASS`
- `DiscountType`: `PERCENT`, `FLAT`

### Core Models
1. **`User`**: System users (Phone-number focused, optional password hash, role).
2. **`OtpRequest`**: Hashes of short-lived OTPs for phone authentication.
3. **`RefreshToken`**: Session management tokens with family-based breach detection.
4. **`Address`**: Customer delivery addresses with phone and default flag.
5. **`Category`**: Hierarchical category tree (`parent_id`) with slug and sort order.
6. **`Product`**: Base products with base price, description, active toggle.
7. **`ProductCategory`**: Join table for Product ↔ Category many-to-many.
8. **`ProductImage`**: Ordered gallery images for products.
9. **`FrameMaterial`**: Material registry (`FRAME`, `MAT`, `GLASS`) with price modifiers and maximum allowed dimensions.
10. **`Order`**: Order headers storing status, total amount, shipping address JSON snapshot, Razorpay Order ID, and Shiprocket AWB.
11. **`OrderItem`**: Line items with product snapshot, unit price at purchase, JSON customization payload, and generated `print_asset_url`.
12. **`UserUpload`**: Registry of user uploaded images with Cloudflare R2 keys, width, height, DPI, and status.
13. **`Payment`**: Payment records mapped to Razorpay Payment IDs and statuses.
14. **`Coupon`**: Discount codes with usage caps and minimum order requirements.
15. **`AuditLog`**: Security audit log for admin operations.

---

## 8. API Architecture (`apps/api`)

- **Base URL:** `/api/v1`
- **Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 }
}
```
- **Paginated API Contracts:** All paginated APIs conform to a standardized `PaginatedApiResponse<T>` envelope.
- **Data Transfer Objects (DTOs):** All controllers return explicitly defined DTOs (e.g. `ProductDto`, `CategoryDto`) mapped via `apps/api/src/mappers`. The backend does not leak Prisma models to the clients. (See ADR: `docs/adr/0001-dto-api-contracts.md`)
- **Category Tree Endpoint:** Provides a hierarchical view of categories built entirely in-memory using an O(N) map algorithm to avoid recursive queries (`GET /api/v1/categories/tree`).
- **Middleware Pipeline:**
  1. `helmet()` for Security Headers (CSP, HSTS).
  2. `cors()` configured with explicit origins.
  3. `express-rate-limit` backed by Redis for brute-force protection.
  4. `cookie-parser()` for signed token parsing.
  5. `Zod` validation middleware on request bodies, params, and queries.

---

## 9. Authentication Strategy

- **Primary Auth:** Phone Number + OTP verification.
- **Token Mechanism:**
  - **Access Token:** Short-lived (15 mins), passed via `HttpOnly`, `Secure`, `SameSite=Strict` cookie or Authorization header.
  - **Refresh Token:** Long-lived (7 days), stored in `refresh_tokens` table.
- **Refresh Token Rotation & Reuse Detection:**
  - Each refresh token belongs to a token `family`.
  - When a refresh token is used, it is revoked and a new one is issued.
  - If a revoked token is reused (indicating theft), the entire token family is immediately invalidated.

---

## 10. Image Upload & Validation Pipeline

```
  Customer UI (Storefront) ───(1) Request Presigned URL───► API Server
             │                                                  │
             │◄───(2) Returns Presigned S3/R2 POST URL──────────┘
             │
             ├───(3) Direct Upload (Bypasses Node API Memory)───► Cloudflare R2 Storage
             │                                                         │
             ▼                                                         ▼
   UI Polls / WebSockets                                   BullMQ Worker (Sharp.js)
             │                                                         │
             │◄──(5) Status: READY or LOW_RESOLUTION ◄──(4) Extract Metadata & DPI
```

### Print Quality Rule (DPI Formula):
$$\text{DPI} = \frac{\text{Image Width in pixels}}{\text{Target Print Width in inches}}$$

- **DPI $\ge 150$**: Status marked as `READY` (High Quality).
- **DPI $< 150$**: Status marked as `LOW_RESOLUTION` (Triggers user warning on UI canvas).

---

## 11. Storage Strategy (Cloudflare R2)

- **Provider:** Cloudflare R2 via AWS S3 SDK v3.
- **Bucket Structure:**
  - `uploads/original/{userId}/{uploadId}.jpg`: Raw user uploaded images (Protected).
  - `uploads/thumbnails/{uploadId}_thumb.webp`: Low-resolution WebP previews for UI Canvas.
  - `print-assets/{orderId}/{orderItemId}.pdf`: Generated high-resolution CMYK print files for production.
- **Security:** R2 bucket is private. Storefront accesses thumbnails via presigned URLs or Cloudflare Worker CDN proxies.

---

## 12. Pricing Engine Logic (`pricing.service.ts`)

The final price of a customized product is calculated dynamically using:

$$\text{Final Price} = (\text{Base Price} + \sum \text{Material Modifiers}) \times \text{Dimension Area Factor} \times \text{Quantity}$$

- **Base Price:** Set on the base Product record.
- **Material Modifiers:** Sum of `price_modifier` for chosen frame, matting, and glass options.
- **Dimension Modifiers:** Scaled proportionally against baseline standard dimensions (e.g., $8\times10$ inches baseline).

---

## 13. Product Options & Customization Architecture

Customization choices are saved as a JSON object inside `OrderItem.customization_data`:

```json
{
  "upload_id": "uuid-v4",
  "print_size": { "width_inches": 12, "height_inches": 16 },
  "frame_id": "uuid-v4-black-wood",
  "mat_id": "uuid-v4-white-mat",
  "glass_id": "uuid-v4-anti-glare",
  "crop": { "x": 10, "y": 20, "width": 800, "height": 600, "rotation": 0 }
}
```

---

## 14. Inventory & Materials Architecture

Material availability (`FrameMaterial`) is tracked per frame component. Max width and max height constraints prevent users from selecting print sizes larger than the physical frame moulding stock.

---

## 15. Order Lifecycle & State Machine

```
  [Checkout] ──► PENDING ──(Razorpay Webhook)──► PAID ──► PROCESSING
                                                            │
                                                   (Admin Asset Generated)
                                                            │
  DELIVERED ◄──(Shiprocket Webhook)── SHIPPED ◄──(AWB Generated)──┘
```

---

## 16. Current Status & Progress

### Completed Features (Milestone 1 Foundation)
- [x] Monorepo setup with Turborepo (`apps/*`, `packages/*`).
- [x] Complete Database Schema in Prisma (`schema.prisma`) with 12 models and 6 enums.
- [x] Express API router structure, middleware pipeline (Helmet, CORS, rate limiting, error handler).
- [x] Authentication Service (`auth.service.ts`) with OTP generation and bcrypt/JWT foundation.
- [x] Pricing Service (`pricing.service.ts`) with full unit test coverage (`pricing.service.test.ts`).
- [x] Product & Category Services (`product.service.ts`, `category.service.ts`).
- [x] Cloudflare R2 Storage Service (`storage.service.ts`) with S3 presigned URL generation.
- [x] Next.js Storefront app initialization with Tailwind CSS & global styling.
- [x] Vite Admin app initialization with layout & routing foundation.
- [x] Phase 6A: Catalog Contract Stabilization (DTOs, Pagination, Category Tree, ADR).
- [x] Phase 6.5: Database Workflow Stabilization (Prisma baselining, idempotent seed, whitelist safety model).
- [ ] Phase 6B: Storefront Core Flows (Upload Lifecycle, Secure HttpOnly Cart Sessions, Dynamic DPI Quality Tiers, Database Pricing Versioning) — *Implementation & QA Complete; Final Git Commit Approval Pending*.

### Pending Features (Milestone 2 - 5)
- [ ] Next.js Storefront homepage UI, product grid, and category filtering.
- [ ] HTML5/react-konva Customization Engine with live 2D frame preview and crop tool.
- [ ] Cart state management & checkout page with Razorpay SDK modal integration.
- [ ] Razorpay webhook handler (`/api/v1/webhooks/razorpay`) with HMAC SHA256 validation.
- [ ] Shiprocket API integration for serviceability check and AWB creation.
- [ ] BullMQ background worker for generating print-ready CMYK PDF assets.
- [ ] Admin Dashboard UI tables for Order Management, Catalog Manager, and Customer management.

---

## 17. Coding Standards & Naming Conventions

- **File & Folder Names:** Kebab-case (`product-options.service.ts`, `auth.routes.ts`).
- **Database Tables & Columns:** Snake_case (`user_uploads`, `created_at`, `base_price`).
- **TypeScript Types & Interfaces:** PascalCase (`UserRole`, `CalculatePricingInput`).
- **Variables & Functions:** camelCase (`calculatePrice`, `fetchCategories`).
- **Environment Variables:** UPPER_SNAKE_CASE (`DATABASE_URL`, `RAZORPAY_KEY_SECRET`).
- **Imports:** Absolute monorepo package imports (`@repo/database`, `@repo/shared`, `@repo/api-client`).

---

## 18. Architectural Constraints (Rules That Must NEVER Be Violated)

> [!CAUTION]
> 1. **Never trust client-side prices:** The backend `pricing.service.ts` must ALWAYS re-calculate the order total from database values before creating a Razorpay order.
> 2. **Razorpay Webhooks are SSOT:** Never rely solely on frontend callbacks to mark an order as `PAID`. Payment state updates MUST come through verified Razorpay webhooks.
> 3. **Presigned R2 Uploads:** User image files MUST NEVER be streamed directly through Node.js Express server memory. Uploads must go directly from browser to Cloudflare R2 via presigned URLs.
> 4. **Prisma Parameterization:** Never write raw SQL strings with string concatenation to prevent SQL Injection. Use Prisma query builder or parameterized sql tags.
> 5. **Monorepo Package Isolation:** `apps/storefront` and `apps/admin` must never import directly from `apps/api`. All shared types/APIs must be exposed via `@repo/shared` or `@repo/api-client`.

---

## 19. Testing Strategy & QA Status

- **Unit Testing:** Vitest / Node Native Test Runner for backend business logic services.
- **Coverage:** `pricing.service.ts` has 100% unit test coverage.
- **Integration Testing:** Supertest for API endpoint testing against a test database.
- **E2E Testing:** Playwright for critical end-to-end customer checkout flows.

---

## 20. Roadmap & Next Steps

1. **Immediate Task:** Complete Storefront homepage UI and product details page.
2. **Next Task:** Build the React customization canvas component with live frame rendering.
3. **Following Task:** Implement Cart and Razorpay Checkout flow.
4. **Final Stage:** Complete Admin Dashboard order management and production deployment.

---

## 21. Git Commit Policy

> [!CAUTION]
> **No feature branch or milestone may be committed to Git until ALL of the following conditions are satisfied:**
>
> 1. **Architecture review is complete** — the implementation plan has been reviewed and approved by the Product Owner before any code is written.
> 2. **TypeScript typecheck passes** — `tsc --noEmit` must succeed with zero errors across all affected packages.
> 3. **Build succeeds** — `npm run build` (or `turbo run build`) must complete without errors.
> 4. **A Review Package has been prepared** — a structured document covering: modified files, schema changes, API changes, DTO changes, UI changes, build results, and a manual QA checklist.
> 5. **Manual QA has been completed** — the Product Owner has executed the QA checklist and approved the results.
> 6. **All critical issues discovered during QA have been resolved.**
> 7. **Final explicit approval has been given** by the Product Owner.

**The required workflow sequence is:**

```
Implementation
    ↓
TypeCheck / Build Verification
    ↓
Prepare Review Package (modified files, QA checklist, known limitations)
    ↓
Architecture Review
    ↓
Manual QA by Product Owner
    ↓
Fix all critical issues
    ↓
Final Approval
    ↓
Git Commit
    ↓
Update PROJECT_CONTEXT.md
    ↓
Proceed to next phase
```

Any deviation from this workflow — including committing before QA, skipping the review package, or proceeding to the next phase without explicit approval — is a process violation.

---

## 22. Architecture Review Standards

Every major architecture proposal must include the following before implementation begins:

1. **Resource Lifecycle Definitions** — For every long-lived resource (images, files, carts, orders, payments, coupons) introduced by the feature:
   - Creation
   - Ownership
   - Mutation
   - Archival
   - Deletion

2. **State Machine Diagrams** — For every stateful entity or user flow:
   - All states enumerated
   - All valid state transitions with their triggers
   - Failure/error paths

3. **Explicit State Dependencies** — Any user action that affects another piece of state must be explicitly documented (e.g., changing print size resets crop aspect ratio).

4. **Cart/Pricing Contract** — Any feature that touches pricing must define who is authoritative (always the backend) and how stale state is detected and resolved.

5. **API Contracts** — Endpoints, DTOs, validation rules, and HTTP status codes must be defined before implementation.

These standards were established during the Phase 6B architecture review and apply to all future milestones.

---
*End of Project Context Document.*
