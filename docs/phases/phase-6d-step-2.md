# Phase 6D Step 2: Checkout Architecture & Implementation Plan

## 1. CART REVIEW API
- **Endpoint:** `GET /api/v1/cart`
- **Identity:** Authoritative loading uses the existing `session_id` cookie or authenticated `user_id`.
- **Response Structure:** Complete representation of `Cart` and `CartLineItem`s.
- **Data Hydration:** Fetches current product and option information.
- **Price Authority:** Calculates authoritative prices on-the-fly using `pricing.service.ts` based on selected `ProductOptionValue`s. Prices are *never* loaded from or stored on the `CartLineItem` itself.
- **Master Asset Security:** Returns the `upload_id` and `preview_url` (proxy). The API MUST NEVER return `r2_key`, `master_file_key`, bucket identifiers, or internal storage paths. The browser must never be able to choose or know the master asset identity.
- **Stale State:** `GET /cart` exposes enough state for the storefront to identify stale items. It must NOT silently mutate or remove stale cart items.

## 2. CART MUTATIONS
- **Endpoints:**
  - `PATCH /api/v1/cart/items/:id` (Quantity updates)
  - `DELETE /api/v1/cart/items/:id` (Line item removal)
- **Validation:** 
  - Ownership/session must match the `Cart`.
  - Quantity bounds (1 - 999).
- **Cart State Machine (Modification during Checkout):**
  - If a cart is in the `CHECKOUT_STARTED` state and a mutation occurs, the mutation must invalidate the existing PENDING Order.
  - The transaction must explicitly expire/cancel the old Order, release the partial unique index, and return the Cart to `ACTIVE` (or immediately begin a new checkout state according to the endpoint being executed).
- **Recalculation:** All mutations respond with a freshly recalculated authoritative cart total.

## 3. CHECKOUT INITIALIZATION & RAZORPAY BOUNDARY
- **Endpoint:** `POST /api/v1/checkout/initialize`
- **Payload:** `customer_email`, `customer_phone`, `shipping_address_snapshot`
- **Validations:**
  - Cart cannot be empty.
  - Cart ownership matches session.
  - Rejects stale carts deterministically with a `409 Conflict`.
- **Initialization Sequence:**
  1. **DB Transaction Start:** Validate cart and calculate prices.
  2. **Order Creation:** Deterministically reuse or create the local `PENDING` Order (see Idempotency).
  3. **Cart Status:** Cart transitions `ACTIVE` -> `CHECKOUT_STARTED`.
  4. **Retention Lock:** Atomic `CART_ATTACHED` -> `CHECKOUT_LOCKED` transition for all referenced UserUploads.
  5. **DB Transaction Commits.**
  6. **Razorpay Network Call:** Occurs *OUTSIDE* the database transaction using the Razorpay SDK to create the Razorpay Order.
  7. **Persistence:** The resulting Razorpay Order ID is persisted to the local Order via a new query.
  8. **Response:** The endpoint returns the Razorpay Order ID to the frontend for the payment modal.
- **Razorpay Failure Recovery:** If the local `Order` has committed but the Razorpay network call fails:
  - The local `Order` transitions to `EXPIRED` or `CANCELLED`.
  - The cart returns to `ACTIVE`.
  - The partial unique index is released so the user can safely retry and create a replacement checkout.

## 4. CHECKOUT IDEMPOTENCY
- **Constraint:** Uses the raw PostgreSQL partial unique index (`orders_one_pending_per_cart` WHERE `status = 'PENDING'`). No secondary locking mechanisms like Redis are used.
- **Lock Release & State Machine:**
  - **A. Identical Cart + Existing Usable PENDING Checkout:** Reuse the existing local `Order` and its Razorpay Order ID. Do not call Razorpay again.
  - **B. Changed Cart + Existing PENDING Checkout:** 
    - Transactionally transition the old `PENDING` Order to `EXPIRED` or `CANCELLED`.
    - Create the replacement `PENDING` Order.
    - (The partial unique index is satisfied because the old order is no longer PENDING).
    - Commit the transaction.
    - Create the new Razorpay Order outside the transaction.
  - **C. Razorpay Creation Fails:** As stated in Section 3, the deterministic recovery state expires the local order, ensuring the partial unique index cannot permanently block the checkout retry.

## 5. ORDER SNAPSHOT
The `OrderItem.customization_data` JSON structure is strictly immutable and acts as the manufacturing source of truth:
```json
{
  "schema_version": "1.0",
  "master_file_key": "string",
  "canonical_dimensions": { "width": 0, "height": 0 },
  "physical_width": 8,
  "physical_height": 10,
  "physical_dimension_unit": "in",
  "orientation": "PORTRAIT | LANDSCAPE | SQUARE",
  "rotation": 0,
  "crop": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "crop_aspect_ratio": "string",
  "effective_dpi": 0,
  "print_quality_status": "EXCELLENT",
  "dpi_acknowledged": true,
  "manufacturing_profile_version": "1.0",
  "selected_product_options": [
    {
      "option_name": "Size",
      "value_name": "8x10",
      "price_modifier": 10.0,
      "modifier_type": "FLAT"
    }
  ]
}
```
- **Master File Key:** Sourced *strictly* from the backend `UserUpload` record linked to the `CartLineItem`, not from frontend payloads.
- **Physical Print Dimensions (Fatal Manufacturing Requirement):** The snapshot explicitly includes `physical_width`, `physical_height`, and `physical_dimension_unit`. This distinguishes `canonical_dimensions` (the source-image pixel dimensions) from the final physical print target selected at checkout (e.g. 8x10 inches). The manufacturing pipeline uses these explicit values, ensuring prints remain manufacturable even if a database administrator later renames options (e.g., "8x10" to "Standard Size") or mutates option metadata.
- **DPI Audit Trail:** The `dpi_acknowledged` boolean must be copied directly from the authoritative CartLineItem/database state into the immutable snapshot. It must not be trusted from the checkout payload.

## 6. PRICE AUTHORITY & PHYSICAL PRINTING PRICING
- **Pricing Service:** The existing `pricing.service.ts` is the authoritative source.
- **Calculation Path:** The authoritative pricing calculation MUST include the base product price, plus every selected `ProductOptionValue` associated with the line item, correctly applying their `price_modifier` based on their `modifier_type` (`FLAT` or `PERCENTAGE`).
- **Physical Configuration:** The final authoritative subtotal represents the actual physical configuration selected by the customer. Checkout is NOT allowed to calculate only the base product price while ignoring selected options.
- Only the backend's final calculated price is snapshotted into `Order` and `OrderItem`. Client prices are never trusted.

## 7. GUEST IDENTITY
- For guests (no `user_id`), the payload `customer_email` and `customer_phone` must be provided and validated.
- They are persisted directly onto the `Order` record *before* the external Razorpay call, securely satisfying the PostgreSQL `CHECK` constraint (`orders_guest_contact_check`).

## 8. R2 RETENTION & ASSET ORPHAN RELEASE
- **Atomic Lock Invariant:** When checkout creates Order + OrderItem records, all associated UserUpload records MUST transition `CART_ATTACHED` -> `CHECKOUT_LOCKED` inside the same database transaction. `OrderItem` has an explicit `upload_id` foreign key referencing `UserUpload` for retention queries. If an OrderItem exists for an upload, that upload cannot remain merely CART_ATTACHED. The cleanup process must never be able to delete an upload between OrderItem creation and retention-state transition.
- **Downgrade Path / Orphan Release:**
  - When a `CartLineItem` is deleted, the transaction explicitly evaluates its associated `UserUpload`.
  - If no other `CartLineItem` references this upload, AND its retention status is strictly `CART_ATTACHED`, the upload is downgraded to `UNATTACHED`.
  - Protected statuses (`CHECKOUT_LOCKED`, `ORDERED_RETAINED`) are NEVER downgraded merely because a cart item is deleted.

## 9. CART STATUS STATE MACHINE
- `ACTIVE` -> `CHECKOUT_STARTED`: When a valid PENDING checkout is initialized.
- `CHECKOUT_STARTED` -> `CONVERTED`: Only after the authoritative Razorpay webhook confirms payment.
- `CHECKOUT_STARTED` -> `ACTIVE`: When the active checkout is expired/cancelled and no valid PENDING checkout remains.

## 10. ERROR CONTRACT
- `400 Bad Request`: Invalid quantity bounds, missing guest email/phone, invalid shipping info, missing low-DPI acknowledgment, empty cart, low-DPI + not acknowledged.
- `401/403 Unauthorized`: Invalid cart session or mismatched ownership.
- `404 Not Found`: Invalid/missing `UserUpload`.
- `409 Conflict`: Stale product/options in cart, or race condition on checkout initialization.

## 11. QA PLAN
Deterministic test cases to validate Step 2:
- Retrieving an active cart successfully hydrates accurate `pricing.service.ts` prices.
- Mutations strictly enforce quantity limits (1-999).
- **Stale Cart:** Checkout with stale product/options returns 409 without modifying the cart.
- **Orphan Cleanup:** Single line-item deletion correctly downgrades `UserUpload` to `UNATTACHED` if orphaned, but retains it if shared. Emptying cart correctly cascades downgrades.
- **Pricing:**
  - Base product price + physical option modifier accurately calculates final order snapshot total.
  - Price tampering test proving that any client-submitted price is ignored.
- **Guest Identity:** Guest orders correctly fail if missing email or phone, but succeed with both.
- **DPI Acknowledgment:**
  - `LOW_QUALITY` + acknowledged -> checkout succeeds and snapshot contains `true`.
  - `LOW_QUALITY` + not acknowledged -> checkout returns 400.
  - `NOT_RECOMMENDED` + acknowledged -> checkout succeeds and snapshot contains `true`.
  - Tampered client acknowledgment -> backend ignores client value and uses authoritative persisted state.
- **Master Asset Security:**
  - Master file key never appears in browser/cart API responses.
  - OrderItem always resolves `master_file_key` server-side.
  - Atomic `CART_ATTACHED` -> `CHECKOUT_LOCKED` transition during checkout.
  - Cleanup worker cannot delete an upload referenced by an OrderItem.
- **Physical Target Dimensions:**
  - An existing OrderItem remains safely manufacturable with its correct physical dimensions even if the associated product option name or database metadata is changed or deleted post-checkout.
- **Idempotency & Concurrency:**
  - Razorpay creation failure after local Order creation handles rollback/expiration cleanly.
  - Retry after Razorpay creation failure succeeds.
  - Double-click checkout with identical cart safely reuses checkout.
  - Double-click checkout with changed cart safely expires old and creates new lock.
  - Cart mutation while `CHECKOUT_STARTED` safely expires order and returns to `ACTIVE`.

## 12. EXACT FILES EXPECTED TO CHANGE
- `apps/api/src/controllers/cart.controller.ts`
- `apps/api/src/services/cart.service.ts`
- `apps/api/src/routes/cart.routes.ts`
- `apps/api/src/controllers/checkout.controller.ts`
- `apps/api/src/services/checkout.service.ts`
- `apps/api/src/routes/checkout.routes.ts`
- `apps/api/src/services/pricing.service.ts`
- `packages/api-client/src/types/cart.ts`
- `packages/api-client/src/types/checkout.ts`

## 13. EXPLICITLY OUT OF SCOPE
- Razorpay SDK implementation & Webhooks (Handled in Step 3/4).
- Storefront Checkout UI.
- Shiprocket integration.
- CMYK/PDF generation.
- Admin order management.
