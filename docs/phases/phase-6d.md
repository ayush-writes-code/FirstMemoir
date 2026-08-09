# Phase 6D Architecture: Cart Review & Checkout Gateway

## 1. Cart Review & Lifecycle
**Existing Cart Architecture:**
The system uses an anonymous-friendly `Cart` entity tracked via an HttpOnly `session_id` or `user_id`. Items are stored in `CartLineItem` with references to `UserUpload` and a structured join-table of `CartLineItemOptionValue` for options.

**Proposed Changes:**
- **Cart Lifecycle:** Carts will NOT be hard-deleted upon payment. Instead, we introduce an explicit lifecycle (`CartStatus` enum):
  - `ACTIVE`: The user is actively shopping.
  - `CHECKOUT_STARTED`: The user has initialized a checkout session.
  - `CONVERTED`: The checkout succeeded (payment captured) and the cart is retired. Historical auditability is preserved.
- **GET `/api/v1/cart`:** Returns the full, nested cart object. The backend recalculates item prices dynamically.
- **PUT `/api/v1/cart/items/:id/quantity`:** Allows modifying item quantity.
- **DELETE `/api/v1/cart/items/:id`:** Removes a line item.

## 2. Authoritative Pricing, Shipping, & Price Immutability
**Constraint:** The frontend must NEVER be trusted for pricing (`unit_price`, `subtotal`, `discount`, `shipping`, `tax`, `total`, or Razorpay payload `amount`).

**Price Immutability:**
The final Order and OrderItem prices are immutable snapshots. After checkout initialization:
- Live Cart price changes MUST NOT alter the existing Order.
- Future Product price changes MUST NOT alter the existing Order.
- Future Option price changes MUST NOT alter the existing Order.

The backend recalculates the price exactly once from authoritative database data during initialization and snapshots it into the `Order` and `OrderItem`.

**Shipping Architecture:**
The final authoritative order pricing model is:
`subtotal + shipping + tax - discount = grand_total`
For Phase 6D, shipping, tax, and discount may currently be zero (deferring Shiprocket integration and Coupon logic to later phases). However, the architecture must persist these specific final components on the `Order` snapshot to not lock out future updates. Coupons are explicitly deferred.

## 3. Cart → Order Architecture & Schema Changes
**Proposed Schema Enhancements:**
To securely handle guest checkouts and Razorpay:
- **`Order` Model (mapped to `orders`):**
  - `user_id`: Drop `NOT NULL` (`String?`).
  - **Foreign Key (User)**: Change `onDelete: Cascade` to `onDelete: SetNull`. Orders are historical financial records and must not be destroyed if a User deletes their account.
  - `session_id`: Add `String?` for guest sessions.
  - `customer_email`: Add `String?` (Required for guest checkout).
  - `customer_phone`: Add `String?` (Required for guest checkout).
  - `subtotal_amount`, `shipping_fee`, `tax_amount`, `discount_amount`: Add `Decimal` fields to mirror the pricing equation.
  - `cart_id`: Add `String` to track the origin cart for concurrency locking.
  - **Foreign Key (Cart)**: `cart Cart @relation(fields: [cart_id], references: [id], onDelete: Restrict)`

- **`OrderItem` Model (mapped to `order_items`):**
  - Add explicit foreign key to `UserUpload` to support retention queries without parsing JSON.
  - `upload_id`: Add `String`.
  - **Foreign Key**: `upload UserUpload @relation(fields: [upload_id], references: [id], onDelete: Restrict)`
  - Index: `@@index([upload_id])`

- **`WebhookEvent` Model (mapped to `webhook_events`):**
  - Durable idempotency tracking: `provider`, `event_id` (e.g., `x-razorpay-event-id`), `event_type`, `received_at`, `processing_status`, `processed_at`, `payload`.
  - `event_id` is declared `@unique`. No redundant index is needed.

## 4. Guest Identity & Contact Snapshot
Guest checkout identity is a mandatory manufacturing and support invariant.
When `Order.user_id` is NULL (guest checkout):
- `customer_email` and `customer_phone` MUST be required in `POST /api/v1/checkout/initialize`.
- Both MUST be validated server-side.
- Both MUST be persisted onto the `Order` snapshot BEFORE the external Razorpay Order is initialized.
- If missing or invalid, the API returns HTTP 400 and no Razorpay order is created.

**Database-Level Guest Contact Check (Fatal Trap):**
The requirement that `user_id` or both contact fields exist is enforced strictly at the database level via a RAW PostgreSQL check constraint added in the migration:
```sql
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_contact_check"
CHECK (
  "user_id" IS NOT NULL
  OR (
    "customer_email" IS NOT NULL
    AND "customer_phone" IS NOT NULL
  )
);
```
This PostgreSQL constraint forms the final safety boundary.

## 5. Checkout State Machine & Razorpay Concurrency
We must explicitly separate `Order` and `Payment` lifecycles. Payment failure is NOT terminal for the Order.

**Order Statuses & Exact Transitions:**
- **Cart** → **Checkout Initialization** → **`PENDING` Order** (Razorpay Order Created).
- **`PENDING`** → **`CONFIRMED`** (Only via Razorpay Webhook `payment.captured`).
- **`PENDING`** → **`EXPIRED`** (Time limit exceeded).
- **`PENDING`** → **`CANCELLED`** (Explicitly voided).
*(Invalid transitions like `CONFIRMED` → `PENDING` or `CONFIRMED` → `FAILED` are strictly prevented by the database/state machine layer).*
*Note: The legacy `PAYMENT_FAILED` state in `OrderStatus` is removed to enforce this separation.*

**Payment Statuses (Retry-Safe):**
`CREATED` → `AUTHORIZED` → `CAPTURED` → `FAILED`.
A `payment.failed` event transitions the `Payment` to `FAILED`, but leaves the `Order` in `PENDING`. A subsequent `payment.captured` for the same Order will transition a new/updated `Payment` to `CAPTURED` and the `Order` to `CONFIRMED`.

**Database-Level Checkout Concurrency (Idempotency Lock):**
To prevent race conditions (Request A & Request B creating two identical active internal/Razorpay orders for the same cart):
- A standard Prisma `@@unique([cart_id])` would block legitimate multiple orders (e.g., FAILED/EXPIRED followed by a new PENDING).
- The constraint is enforced via a raw PostgreSQL partial unique index added manually to the migration:
  ```sql
  CREATE UNIQUE INDEX "orders_one_pending_per_cart"
  ON "orders" ("cart_id")
  WHERE "status" = 'PENDING';
  ```
- If Request B attempts to insert a `PENDING` order for the same `cart_id` simultaneously, the transaction will fail at the database level.
- Request B can then query the locked order and either return it (if valid) or expire it (if stale/mutated) before generating a new one.

**Razorpay Integer/Subunit Strategy:**
The final `grand_total` (INR) is converted via `Math.round(grand_total * 100)` to `amount_paise`. Both the payload sent to Razorpay and the payload validated during the webhook will only deal in these integer subunits to completely eliminate floating-point drifts.

## 6. Manufacturing Readiness Invariant & Customization Snapshot
Before confirming, every `OrderItem` MUST contain all data needed for fulfillment WITHOUT consulting the mutable Cart.

**Master Asset Targeting (FATAL REQUIREMENT):**
- The `OrderItem` holds an explicit database-level foreign key (`upload_id`) pointing to the authoritative `UserUpload` DB record.
- The `master_file_key` in the customization JSON snapshot must ALSO be populated exclusively from the server-side `UserUpload` DB record.
- It MUST NOT come from the frontend payload, the `preview_url`, or `preview_file_key`.
- The frontend is never trusted to identify the manufacturing master asset.

**Versioned JSON Contract (`OrderItem.customization_data`):**
```json
{
  "schema_version": "1.0",
  "master_file_key": "raw/UUID.jpg",
  "canonical_width": 1920,
  "canonical_height": 1080,
  "physical_width": 8.0,
  "physical_height": 10.0,
  "orientation": "PORTRAIT",
  "crop_x": 0.1,
  "crop_y": 0.2,
  "crop_width": 0.8,
  "crop_height": 0.8,
  "crop_aspect_ratio": "8:10",
  "rotation": 0,
  "effective_dpi": 300,
  "print_quality_status": "EXCELLENT",
  "dpi_acknowledged": true,
  "selected_options_snapshot": [{ "name": "Size", "value": "8x10" }],
  "manufacturing_profile_version": "v1.0.0"
}
```

**Low-DPI Checkout Gate:**
Before creating the Order, the backend MUST independently revalidate the print quality of every `CartLineItem` using authoritative backend formulas. If `LOW_QUALITY` or `NOT_RECOMMENDED` is detected, `dpi_acknowledged` MUST be `true` on the line item. If missing, initialization immediately fails with HTTP `400 Bad Request`.

## 7. R2 Asset Retention Lifecycle
To decouple the short-lived image processing lifecycle from the long-term e-commerce retention lifecycle, `UserUpload` adopts a dedicated `retention_status` field powered by the `UploadRetentionStatus` enum.
- The existing `UploadStatus` enum (UPLOADING, PROCESSING, READY, FAILED) is preserved for processing state.
- The `UploadRetentionStatus` enum defines:
  - `UNATTACHED`
  - `CART_ATTACHED`
  - `CHECKOUT_LOCKED` (Checkout initialized, temporary protection)
  - `ORDERED_RETAINED` (Payment Confirmed, permanent protection)
  - `FULFILLED`
  - `ELIGIBLE_FOR_RETENTION_POLICY`

**Retention Query Requirement:**
Because `OrderItem` has a direct foreign key (`upload_id`) to `UserUpload`, the cleanup worker can execute simple, indexed SQL JOINs (Upload → CartLineItem, Upload → OrderItem → Order) to definitively determine if an asset is protected by an active checkout or order, without scanning JSON across the entire table.

## 8. Razorpay Webhook & Payment Invariants
**Webhook Retention Strategy:** `WebhookEvent` acts as a **PERMANENT AUDIT LOG** for both idempotency and debugging history. No automatic deletion of processed webhook events will be introduced.

**Payment Verification Invariants:**
Before transitioning an Order to `CONFIRMED`, the webhook handler MUST verify:
1. Valid HMAC signature using the exact raw request body before JSON parsing.
2. Unprocessed `x-razorpay-event-id` (Idempotency).
3. `payment.order_id` matches the Razorpay Order ID on the internal DB `Order`.
4. The internal DB `Order` is linked to this specific Razorpay Order ID.
5. Event is `payment.captured`.
6. Webhook `amount` EXACTLY equals the internal DB `Order.total_amount` (in subunits).
7. Webhook `currency` EXACTLY equals internal currency.
Mismatches (currency, amount, order ID) MUST NEVER confirm the Order.

## 9. QA Expansion
Explicit test cases required:
1. `payment.failed` → `payment.captured` recovery.
2. Duplicate `x-razorpay-event-id` (must return 200 without duplicate execution).
3. Out-of-order webhook delivery.
4. Incorrect Razorpay amount / currency / order ID (must reject).
5. Double-clicking checkout or parallel API requests (must yield exactly 1 Razorpay order).
6. Modifying a cart after checkout snapshot.
7. Successful payment with browser closed.
8. Forged webhook signature & Webhook replay.
9. Guest checkout with valid email + phone → Order created successfully.
10. Guest checkout with missing email → HTTP 400; no Razorpay Order created.
11. Guest checkout with missing phone → HTTP 400; no Razorpay Order created.
12. Guest checkout with invalid email/phone → HTTP 400.
13. Verify persisted Order retains `customer_email` and `customer_phone` after payment confirmation.
14. Verify webhook never creates an Order lacking required guest contact snapshot.

---

## Final Architecture Freeze

1. **UserUpload retention strategy:** A dedicated `UploadRetentionStatus` enum on `UserUpload` explicitly separates image processing state from long-term retention.
2. **Webhook retention strategy:** Permanent Audit Log using the `WebhookEvent` table for idempotency and debugging. No automatic deletion.
3. **Checkout concurrency mechanism:** Database-level uniqueness guaranteed via a RAW PostgreSQL partial unique index on `orders(cart_id)` where `status = PENDING`.
4. **Master asset source of truth:** The backend securely sources `master_file_key` directly from the `UserUpload` DB record at checkout initialization and snapshots it into the `OrderItem`. It is never trusted from the client.
5. **Immutable OrderItem contract:** An explicitly modeled `OrderItem -> UserUpload` foreign key, coupled with a heavily versioned JSON schema explicitly snapshotting 18 distinct metrics, guarantees deterministic physical manufacturing independent of mutable carts.
6. **Price snapshot strategy:** Fully immutable. Once initialized, the Order/OrderItem prices are completely isolated from any future Cart or Product DB price mutations.
7. **Order state machine:** Strict unidirectional flow (`PENDING` -> `CONFIRMED`/`EXPIRED`/`CANCELLED`) completely decoupled from retryable Payment states (`CREATED` -> `AUTHORIZED` -> `CAPTURED` -> `FAILED`). Legacy mixed states (`PAYMENT_FAILED`) are removed from `OrderStatus`.
8. **Database Safety Invariants:** Explicit `Order -> Cart` and `OrderItem -> UserUpload` referential integrity guarantees (with `onDelete: Restrict`). `Order -> User` relation is `onDelete: SetNull` to prevent historical data loss. A RAW PostgreSQL CHECK constraint guarantees that every guest order contains valid contact fields prior to Razorpay initialization.
9. **Remaining ambiguities:** None.

Phase 6D architecture is approved for implementation.
