# Phase 5 Manual QA Checklist: Product Variants, Inventory & Pricing Engine

This document provides a structured manual QA protocol for verifying Phase 5 implementations before committing.

---

## 1. Database / Prisma

### Test 1.1: Schema Integrity & Models Verification
- **Setup**: Database connected, Prisma client generated (`@repo/database`).
- **Steps**:
  1. Inspect DB tables for `product_options`, `product_option_values`, and `option_exclusions`.
  2. Verify foreign key relations back to `products` and `frame_materials`.
- **Expected Result**: All models exist with correct column names, default values, and foreign keys.

### Test 1.2: Global Material Relation & SetNull Constraint
- **Setup**: A `ProductOptionValue` linked to a global `FrameMaterial` (`global_material_id`).
- **Steps**:
  1. Delete the global `FrameMaterial` record.
  2. Inspect the linked `ProductOptionValue`.
- **Expected Result**: `ProductOptionValue` remains intact; `global_material_id` is automatically set to `null` without throwing a cascading deletion error.

---

## 2. Backend APIs

### Test 2.1: Fetch Product with Nested Options & Exclusions
- **Setup**: A product with created options, values, and exclusions.
- **Steps**:
  1. Call `GET /api/v1/products/:id`.
- **Expected Result**: Returns `200 OK` with `options` array (sorted by `sort_order ASC`), nested `values` (sorted by `sort_order ASC`), and `exclusions` array. Decimals serialized as strings/numbers safely.

### Test 2.2: Standard API Envelope Compliance
- **Setup**: API server running.
- **Steps**:
  1. Make requests to Option CRUD and Price calculation endpoints.
- **Expected Result**: All responses follow the `{ success: boolean, data: T | null, error: string | null }` envelope structure.

---

## 3. Pricing Engine

### Test 3.1: Base Price Only Calculation
- **Setup**: Product with base price ₹1000.
- **Steps**:
  1. Send `POST /api/v1/products/:id/price` with `selected_option_value_ids: []`.
- **Expected Result**: Returns `PricingBreakdown` with `version: 1`, `basePrice: 1000`, `modifiers: []`, `subtotal: 1000`, `finalPrice: 1000`.

### Test 3.2: Flat Modifier Calculation
- **Setup**: Product base price ₹1000; Option value "A5 Size" (+₹200 FLAT).
- **Steps**:
  1. Send `POST /api/v1/products/:id/price` with "A5 Size" value ID.
- **Expected Result**: Returns `finalPrice: 1200`, with modifier entry `{ optionName: "Size", value: "A5", type: "FLAT", amount: 200 }`.

### Test 3.3: Percentage Modifier Calculation
- **Setup**: Product base price ₹1000; Option value "Teak Frame" (+10% PERCENTAGE).
- **Steps**:
  1. Send `POST /api/v1/products/:id/price` with "Teak Frame" value ID.
- **Expected Result**: Returns `finalPrice: 1100`, with modifier entry `{ optionName: "Frame", value: "Teak", type: "PERCENTAGE", amount: 100 }`.

### Test 3.4: Mixed Modifiers (Flat + Percentage)
- **Setup**: Base price ₹1000, Size A5 (+₹200 FLAT), Frame Teak (+10% PERCENTAGE on base price).
- **Steps**:
  1. Send `POST /api/v1/products/:id/price` with both value IDs.
- **Expected Result**: `subtotal: 1000`, modifiers `[+200, +100]`, `finalPrice: 1300`.

### Test 3.5: Versioning Tag Verification
- **Setup**: Any price calculation request.
- **Steps**:
  1. Inspect response JSON for `version` field.
- **Expected Result**: `version: 1` present in root of `PricingBreakdown`.

---

## 4. Admin UI

### Test 4.1: Tabbed Interface Navigation
- **Setup**: Open product edit modal in Admin UI (`apps/admin`).
- **Steps**:
  1. Click between "Basic Details", "Images", and "Variants & Options" tabs.
- **Expected Result**: Active tab updates seamlessly; form states do not reset or lose un-submitted changes.

### Test 4.2: Create Mode Tab Shielding
- **Setup**: Click "Add Product" button.
- **Steps**:
  1. Check for tab navigation bar.
- **Expected Result**: Tabs are hidden during creation mode; only basic product fields are shown until the product is created.

---

## 5. Option CRUD

### Test 5.1: Create Product Option
- **Setup**: Navigate to "Variants & Options" tab of an existing product.
- **Steps**:
  1. Click "Add Option".
  2. Enter Name: "Orientation", Select Input Type: "Radio Buttons", Check "Required".
  3. Submit.
- **Expected Result**: Option created instantly and rendered in options list with correct metadata tags.

### Test 5.2: Delete Product Option
- **Setup**: Existing option with 2 values.
- **Steps**:
  1. Click Trash icon on Option header.
  2. Confirm deletion dialog.
- **Expected Result**: Option and associated values removed from backend DB and UI updates.

---

## 6. Option Value CRUD

### Test 6.1: Add Option Value
- **Setup**: Existing option "Size".
- **Steps**:
  1. Click "Add Value" under "Size".
  2. Enter Value: "A4 (8x12 in)", Price Modifier: `150`, Modifier Type: `FLAT`.
  3. Submit.
- **Expected Result**: Value added to option list with badge showing `+₹150`.

### Test 6.2: Delete Option Value
- **Setup**: Existing value in an option.
- **Steps**:
  1. Click Trash icon next to the value row.
- **Expected Result**: Option value deleted and price breakdown updates accordingly.

---

## 7. Exclusion Rules

### Test 7.1: Canonical UUID Pair Enforcement
- **Setup**: Two values `valA` and `valB` (where `valA.id > valB.id`).
- **Steps**:
  1. Invoke `addExclusion(productId, valA.id, valB.id)`.
  2. Inspect database row in `option_exclusions`.
- **Expected Result**: `option_value_1_id` stores `valB.id` and `option_value_2_id` stores `valA.id` (strictly canonical order).

### Test 7.2: Pricing Engine Conflict Detection
- **Setup**: Exclusion configured between "Canvas Print" and "Glass Cover".
- **Steps**:
  1. Call `calculatePrice` with IDs for both "Canvas Print" and "Glass Cover".
- **Expected Result**: Request fails with `400 Bad Request` explaining that the selected combination is unsupported.

### Test 7.3: Exclusion Removal
- **Setup**: Active exclusion rule between two values.
- **Steps**:
  1. Delete exclusion via API or UI button.
  2. Re-run price calculation for the pair.
- **Expected Result**: Exclusion deleted; price calculation now succeeds.

---

## 8. Historical Snapshot Preparation

### Test 8.1: Snapshot Structure Compatibility
- **Setup**: Calculate price for a product with options.
- **Steps**:
  1. Inspect returned `PricingBreakdown`.
  2. Compare structure with expected `OrderItem.customization_data` schema.
- **Expected Result**: `PricingBreakdown` contains immutable values (`basePrice`, `modifiers`, `finalPrice`, `version`) suitable for JSON storage in `OrderItem`.

---

## 9. Error Handling

### Test 9.1: Non-Existent Product Requests
- **Setup**: Invalid UUID for product.
- **Steps**:
  1. Call `POST /api/v1/products/00000000-0000-0000-0000-000000000000/options`.
- **Expected Result**: Returns `404 Not Found` with structured error message.

### Test 9.2: Invalid Option Value IDs in Price Calculation
- **Setup**: Valid product ID, non-existent `option_value_id`.
- **Steps**:
  1. Send `POST /api/v1/products/:id/price` with arbitrary UUID.
- **Expected Result**: Returns `404 Not Found` or `400 Bad Request` informing that one or more option values do not exist.

---

## 10. Edge Cases

### Test 10.1: Product with 0 Options
- **Setup**: Product with no options defined.
- **Steps**:
  1. Open Admin UI tab "Variants & Options".
  2. Calculate price on storefront.
- **Expected Result**: Displays empty state message cleanly; price equals `basePrice` without errors.

### Test 10.2: Zero-Amount Modifiers
- **Setup**: Option value with price modifier `0`.
- **Steps**:
  1. Calculate price including this value.
- **Expected Result**: Modifier registered without modifying price total or throwing zero/null math errors.

---

## 11. Regression Tests (Phases 1–4)

### Test 11.1: Basic Product Information Updates (Phases 1 & 2)
- **Setup**: Existing product.
- **Steps**:
  1. Edit product name, description, base price, and category.
  2. Submit form.
- **Expected Result**: Product updates correctly without affecting options or images.

### Test 11.2: Image Upload, Reordering & Primary Selection (Phases 3 & 4)
- **Setup**: Product edit modal -> "Images" tab.
- **Steps**:
  1. Upload image, reorder via drag/drop or "Set as Primary".
- **Expected Result**: Image list reorders using `sort_order` transaction; primary image updates.

### Test 11.3: Soft Delete Image Protection (Phase 3)
- **Setup**: Product with images.
- **Steps**:
  1. Click delete on image, confirm dialog.
- **Expected Result**: Loading state overlay on image; image removed only after successful API response.
