# Phase 6B Backend Review Package

This document serves as the formal review package for the Backend components of Phase 6B (Product Experience Foundation).

## 1. Modified Files

**Backend API (`apps/api`)**
- `src/services/cart.service.ts` [NEW] — Handles business logic for Cart and CartLineItem creation, recalculation, and version checks.
- `src/controllers/cart.controller.ts` [NEW] — Exposes the Cart API endpoints.
- `src/routes/v1/cart.routes.ts` [NEW] — Defines Cart API routes.
- `src/routes/v1/index.ts` [MODIFY] — Added `cartRouter` to the v1 routing tree.
- `src/controllers/storage.controller.ts` [MODIFY] — Implemented `POST /upload-complete` logic, replacing dummy logic with functional Sharp-based WebP generation.
- `src/routes/v1/storage.routes.ts` [MODIFY] — Added route for `upload-complete`.
- `src/services/storage/r2.provider.ts` [MODIFY] — Added `downloadFile` and `uploadBuffer` capability.
- `src/services/storage/storage.interface.ts` [MODIFY] — Extended the interface.
- `src/config/env.ts` [MODIFY] — Added `PRICING_VERSION`.

**API Client (`packages/api-client`)**
- `src/endpoints/storage.ts` [MODIFY] — Added `uploadComplete` endpoint client stub.
- `src/types.ts` [MODIFY] — Exported all necessary Cart DTOs, Crop data, and status enums.

**Dependencies**
- `apps/api/package.json` — Added `sharp` and `@types/sharp` to generate the 800px WebP preview proxy.

## 2. API Contracts

### Cart API

**`GET /api/v1/cart`**
- Retrieves the active cart using the signed `cart_session` cookie (or authenticated `user_id`). Creates an empty cart and issues a signed cookie if one does not exist.
- Response: `CartDto` (includes `items` mapped with `CropData`).

**`POST /api/v1/cart/items`**
- Input: `AddToCartInput` (product, quantity, selected options, upload ID, crop data, DPI, print status).
- Behavior:
  - Validates `upload_id` exists, belongs to the session/user, and is `READY` or `LINKED_TO_CART`.
  - Transitions `upload` status to `LINKED_TO_CART`.
  - Validates `selected_option_value_ids` strictly against the product's valid options.
  - Snapshots `pricing_version` as read from `StoreSettings`.
- Response: `CartLineItemDto`

**`PATCH /api/v1/cart/items/:lineItemId`**
- Input: `{ quantity: number }`
- Behavior: Updates the quantity. If `<= 0`, deletes the line item.
- Response: `CartLineItemDto` (or `null` if deleted).

**`DELETE /api/v1/cart/items/:lineItemId`**
- Deletes the line item, verifying session ownership.
- Response: `null`

### Upload Flow API

**`POST /api/v1/storage/upload-url`**
- Input: `{ file_name: string, mime_type: string, visibility: 'public' | 'private' }`
- Behavior:
  - Validates constraints and generates an R2 pre-signed PUT URL.
  - **Security:** Creates a `UserUpload` database record with status `UPLOADING`, binding the generated `r2_key` directly to the caller's secure `cart_session` cookie or `user_id`.
- Response: `{ upload_url: string, file_key: string, ... }`

**`POST /api/v1/storage/upload-complete`**
- Input: `{ file_key: string, original_filename: string }`
- Behavior:
  - **Ownership & Replay Protection:** Looks up the `UserUpload` by `r2_key`. Verifies that the record exists, is owned by the current `cart_session`/`user_id`, and is exactly in the `UPLOADING` state. This prevents an attacker from claiming a file uploaded by someone else (ownership check) or re-processing an already completed upload (replay protection).
  - Verifies the uploaded file in R2 using `HeadObject` (validates mime-type and max private size constraints).
  - Streams/downloads the file buffer.
  - Uses `sharp` to parse `width` & `height`.
  - Generates an 800px WebP preview proxy and uploads it to `previews/...` in R2.
  - Updates the `UserUpload` row in PostgreSQL with width, height, preview key, and transitions status to `READY`.
- Response: `{ upload_id: string, status: 'READY', preview_url: string }`

## 3. Schema Changes

*(No new migrations required since Phase 6A/6B initial setup)*
- `UserUpload` lifecycle status updated previously (`UPLOADING`, `PROCESSING`, `READY`, `LINKED_TO_CART`, `FULFILLED`, `ARCHIVED`).
- `Cart` and `CartLineItem` schemas (previously pushed) strictly implemented in business logic.
- Join tables for `selected_option_values` handled natively by Prisma.

## 4. Typecheck & Build Results

All backend workspaces (`apps/api`, `packages/api-client`, `packages/database`, `packages/shared`) have passed strict TypeScript validation and compilation (`npm run build`).

## 5. Known Limitations & Deviations

1. **Anonymous Cart Merging**: Currently, the system identifies anonymous carts via the secure `cart_session` cookie. If a user later signs in, the service identifies the mismatch and assigns the `user_id` to the cart, but advanced conflict merging (two existing carts) is currently deferred.
2. **Pricing Recalculation**: Prices are dynamically calculated on the backend (`cartService.calculateLineItemPrice`) but aren't currently returned as part of the `CartDto` line item representation (since prices are derived at runtime and not stored on the row). The frontend calculates the optimistic price using the same algorithm.
3. **Upload Security**: Upload security is fully implemented. `upload-complete` no longer trusts a client-provided `file_key` in isolation. It verifies the database row is in the `UPLOADING` state and owned by the caller's secure session/user ID, protecting against both spoofing and replay attacks.

---

## Architectural Resolutions

### 1. Pricing Version Source

**Issue:** `pricing_version` was originating from an environment variable (`PRICING_VERSION`), which is deployment configuration rather than business state.

**Resolution:**
- **Schema Modification:** Introduced a new `StoreSettings` singleton model in `schema.prisma`.
  ```prisma
  model StoreSettings {
    id              String   @id @default("default")
    pricing_version Int      @default(1)
    updated_at      DateTime @updatedAt
    @@map("store_settings")
  }
  ```
- **Where it is stored:** The current pricing version is now stored persistently in the database (`store_settings` table, `id="default"`).
- **How it is incremented:** When an admin modifies a `Product`'s base price or a `ProductOptionValue`'s price modifier, the admin API will increment the `pricing_version` in the `StoreSettings` singleton table.
- **How checkout detects stale carts:** When a cart is fetched for checkout, the API will query the `StoreSettings.pricing_version`. It will then compare this against the `pricing_version` snapshotted on each `CartLineItem`. If `cartLineItem.pricing_version < StoreSettings.pricing_version`, the API flags the line item as `STALE` and forces a price recalculation/user acknowledgement before allowing the checkout to proceed.

### 2. Anonymous Session Security

**Issue:** The backend was trusting a client-provided `x-session-id` header to identify anonymous carts, which is insecure and vulnerable to hijacking.

**Resolution:**
- **Mechanism:** Redesigned the anonymous session to use a backend-issued, cryptographically signed, secure `HttpOnly` cookie.
- **How the session is created:** A new middleware will intercept requests to `/cart` or `/storage`. If no valid signed `cart_session` cookie is found, the backend will generate a secure UUID, sign it using `cookie-parser` with a strong `COOKIE_SECRET`, and attach it to the response via `Set-Cookie: cart_session=s%3A<signed_uuid>; HttpOnly; Secure; SameSite=Strict`.
- **How it is validated:** On subsequent requests, `cookie-parser` automatically verifies the cryptographic signature of the cookie. If tampered with, it parses as `false` or `undefined`, rejecting the request.
- **How carts and uploads are associated:** `Cart` and `UserUpload` rows will store this secure UUID in their `session_id` column.
- **How hijacking is prevented:** Because the cookie is `HttpOnly`, it cannot be accessed or stolen by client-side JavaScript (mitigating XSS). Because it is cryptographically signed, it cannot be forged or tampered with by a malicious user. The `SameSite=Strict` flag mitigates CSRF.

---

## Schema Migration Details (Pending Approval)

Before running the migration, here is the exact impact analysis:

**What was added/modified:**
1. Created `StoreSettings` model (`store_settings` table) to hold `pricing_version`.
2. Cleaned up `updated_at` defaults automatically managed by Prisma.
3. Updated the `UploadStatus` enum internally (which was modified in Phase 6A but the DB migration was pending).

**Is a migration required?**
Yes, to create the `store_settings` table and apply the enum changes.

**Will existing data be affected?**
No. The `store_settings` table is new. The `updated_at` default changes and enum rename are safe non-destructive Prisma synchronizations. Existing data remains intact.

**SQL to be generated:**
```sql
-- AlterEnum
BEGIN;
CREATE TYPE "UploadStatus_new" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'LINKED_TO_CART', 'FULFILLED', 'ARCHIVED');
ALTER TABLE "user_uploads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "user_uploads" ALTER COLUMN "status" TYPE "UploadStatus_new" USING ("status"::text::"UploadStatus_new");
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
DROP TYPE "UploadStatus_old";
ALTER TABLE "user_uploads" ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
COMMIT;

-- AlterTable
ALTER TABLE "cart_line_items" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "carts" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "user_uploads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pricing_version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);
```

**Why this migration is safe:**
The `user_uploads` status change uses a standard Prisma `USING` cast, which safely migrates rows without data loss. The `updated_at` modifications simply sync Prisma's schema with Postgres (`@updatedAt` is managed by Prisma, not Postgres defaults). The new table is empty and has no foreign key dependencies that would lock existing rows.

---

> [!IMPORTANT]
> Awaiting your architectural review and Manual QA approval before executing the migration and moving forward to implement the **Storefront Cart State (Zustand)** and **Upload Flow UI** (Dropzone + React state integrations).
