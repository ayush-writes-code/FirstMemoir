# Staging Deployment & End-To-End Verification Result

## STAGING STATUS
BLOCKED — EXTERNAL INFRASTRUCTURE NOT YET PROVISIONED

## APPLICATION HARDENING
VERIFIED

---

## Slice 6C.1 Final Verification

### 1. Verification vs. Staging Status
- **APPLICATION HARDENING**: **VERIFIED** (All 24/24 focused security, idempotency, routing, and recovery tests passing against real PostgreSQL test DB; regression suites 3.2, 4, 5 all passing).
- **STAGING DEPLOYMENT**: **BLOCKED — EXTERNAL INFRASTRUCTURE NOT YET PROVISIONED** (External PostgreSQL database, Render compute, two isolated R2 buckets, and Razorpay test credentials pending human procurement).

### 2. Real R2 Bucket Audit (`weprintit-assets`)
- **Status**: Live bucket audited via Cloudflare R2 SDK.
- **Total Objects**: 123
- **Total Storage**: 7,791,248 bytes (~7.43 MB)
- **Prefix Breakdown**:
  - `customers/`: 56 objects (5,246,240 bytes / ~5.00 MB, extensions: `.jpeg`, `.jpg`, `.png`, `.webp`, timestamps from August 6, 2026).
  - `previews/`: 56 objects (2,007,650 bytes / ~1.91 MB, extensions: `.webp`, 1:1 preview proxies for customer test uploads).
  - `products/`: 11 objects (537,358 bytes / ~0.51 MB, extensions: `.webp`, `.jpeg`, early product test images from July 31 - August 5, 2026).
  - Other prefixes: None.
- **Catalogue Reference Status**: The 82 canonical catalogue items store static paths (e.g. `/catalog/frames/...`) and do NOT actively reference these 11 R2 product images.
- **Data Classification**: All 56 customer uploads and 56 previews represent development test uploads from August 2026. No live customer production data exists.

### 3. Target Storage Architecture & Migration Plan
- **Target Separation**:
  - **Public Bucket**: `firstmemoir-public-assets` (Public access ENABLED, holds `products/*` and `previews/*`).
  - **Private Bucket**: `firstmemoir-private-uploads` (Public access DISABLED, holds `customers/*`).
- **Migration Plan for `weprintit-assets`**:
  - Do NOT delete the existing `weprintit-assets` bucket during staging setup.
  - The 11 `products/*` objects can be optionally copied to `firstmemoir-public-assets` if needed for staging tests.
  - The 56 test `customers/*` uploads can remain in `weprintit-assets` or be archived. Because they are test artifacts from August 2026, they do not require migration to `firstmemoir-private-uploads`.
  - Once new staging buckets are operational, the legacy `weprintit-assets` bucket can be decommissioned safely after confirmation.

### 4. Storage Provider Invariants (`r2.provider.ts`)
- **Prefix Routing**:
  - `customers/*` routes strictly to `R2_PRIVATE_BUCKET_NAME`.
  - `products/*` routes strictly to `R2_PUBLIC_BUCKET_NAME`.
  - `previews/*` routes strictly to `R2_PUBLIC_BUCKET_NAME`.
- **Fail-Closed Guard**: Any unrecognized or missing prefix (e.g. `malicious/file.txt`) immediately throws an error, failing closed across all storage methods (`generateUploadUrl`, `generateReadUrl`, `verifyFile`, `deleteFile`, `downloadFile`, `uploadBuffer`).
- **Public URL Invariant**: `getPublicUrl("customers/...")` throws an explicit error and NEVER returns a public URL.

### 5. Upload Authorization & Session Security
- **Guest Checkout Supported**: `ensureCartSession` middleware issues a signed, HttpOnly `cart_session` cookie if unauthenticated, allowing seamless guest uploads.
- **Ownership Enforcement**:
  - `POST /api/v1/storage/upload-complete`: Verifies `existingUpload.session_id === sessionId || existingUpload.user_id === userId`. Session B cannot claim or complete Session A's upload (rejects with 403).
  - `GET /api/v1/storage/read-url`: Verifies session or user ownership before generating pre-signed read URL. Session B cannot retrieve Session A's private upload (rejects with 403).

### 6. Razorpay Webhook Idempotency & Retries
- **HMAC Verification**: Rejects invalid signatures with 400.
- **Atomic Processing**: First valid `payment.captured` event executes within a single database transaction:
  - Row lock on Order (`SELECT ... FOR UPDATE`).
  - Creates `WebhookEvent` with status `PROCESSED`.
  - Creates `Payment` with status `CAPTURED`.
  - Transitions `Order` to `CONFIRMED`.
  - Transitions `UserUpload` to `ORDERED_RETAINED`.
- **Duplicate Protection**: Second call with same `event_id` catches unique constraint violation (`P2002`) and returns 200 OK without double payment or double confirmation.
- **Retryable Failures**: Any infrastructure or database abort rolls back the transaction completely, ensuring `WebhookEvent` is not committed. A subsequent retry with the same `event_id` succeeds normally.

### 7. Checkout Initialization Idempotency & Price Authority
- **Reusing Valid Orders**: If an active `PENDING` order exists for the cart and its Razorpay order has 0 attempts and status `created`, `initializeCheckout` reuses both the local order and Razorpay order ID without creating duplicates.
- **Deterministic Replacement**: If the existing Razorpay order is expired or already attempted, the stale local order is marked `EXPIRED` and a replacement order is created.
- **Paid Order Protection**: If the Razorpay order is already `paid`, returns 409 conflict to prevent double charges.
- **Backend Price Authority**: Checkout price is recalculated authoritatively from database catalogue prices and selected options; client payloads cannot alter amounts.

### 8. Upload State Recovery
- **Failure Rollback**: If Razorpay order creation fails after the local order transaction, `checkoutService` catches the error, marks the local order `EXPIRED`, resets the cart to `ACTIVE`, and recovers all locked uploads back to `CART_ATTACHED`.
- **Safe Retry**: The user can immediately retry checkout with the exact same upload assets.
- **Confirmed Order Invariant**: Genuinely confirmed order uploads (`ORDERED_RETAINED`) are never touched or unlocked by subsequent checkout failures.

---

## REGRESSION TEST MATRIX
- **Slice 3.2 (Catalogue Truth & Safety)**: 8/8 passed
- **Slice 4 (Real Commerce Pilot)**: 4/4 passed
- **Slice 5 (Admin Verification)**: 5/5 passed
- **Slice 6C.1 (Security & Idempotency Hardening)**: 24/24 passed
- **Typecheck (`check-types` across monorepo + `tsc --noEmit`)**: PASS (0 errors)
- **Monorepo Build (`turbo run build`)**: PASS (5/5 tasks successful: `@repo/database`, `@repo/shared`, `admin`, `api`, `storefront`)
