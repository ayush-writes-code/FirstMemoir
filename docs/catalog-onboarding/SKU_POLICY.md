# SKU Policy (PROPOSED)

> [!IMPORTANT]
> This policy is PROPOSED. It must be confirmed by the business before implementation.
> Do NOT generate production SKUs until this policy is approved.

## Why SKU Is Needed

1. **Order fulfillment**: Shiprocket requires a product SKU for manifesting shipments.
2. **Inventory tracking**: Each distinct sellable item needs a unique identifier for stock management.
3. **Manufacturing**: Print/production partners need SKUs to identify what to produce.
4. **Admin operations**: Internal order management, returns, and analytics require stable product identifiers.
5. **Marketplace consistency**: If products are also listed on Flipkart/Amazon, SKUs should be consistent across channels.

## Current State of SKUs in Source Data

- **30 Motivation frames**: Have SKUs (`Motivation_frame_01` through `Motivation_frame_30`)
- **7 Car split posters**: Have SKU IDs (e.g., `AlfaRomeo_car`, `Pink lambo_car`)
- **3 Animal bookmarks**: Have SKU IDs (`AnimalBM1`, `AnimalBM2`, `AnimalBM3`)
- **1 Football poster set**: Has SKU (`Football_10`)
- **41 out of 82 folders have NO SKU**

Existing SKU formats are inconsistent:
- `Motivation_frame_01` (category_type_number)
- `AlfaRomeo_car` (design_category)
- `AnimalBM1` (themeAbbrevNumber)
- `Football_10` (category_count)

## Proposed SKU Format

```
FM-{CATEGORY}-{SUBCATEGORY}-{SEQUENCE}
```

Examples:
- `FM-FRM-MOT-001` → Frame, Motivational, design #1
- `FM-FRM-FBL-001` → Frame, Football, Ronaldo
- `FM-PST-ANI-010` → Poster, Anime, pack of 10
- `FM-PST-CSP-001` → Poster, Car Split, Alfa Romeo
- `FM-BKM-ANM-001` → Bookmark, Animal, design #1

Category codes:
- `FRM` — Framed prints (8×12)
- `PST` — Posters (unframed)
- `BKM` — Bookmarks
- `CPP` — Custom Photo Prints (future)

## Uniqueness Rule

Every SKU must be globally unique across the entire catalog. No two products or variants may share a SKU.

## Product vs. Variant SKU Behavior

This depends on the business decision about how design variants are modeled:

### If each design is a separate Product:
Each product gets its own SKU. Simple and flat.

### If designs are options on a single Product:
The parent Product gets a base SKU. Each design option value gets a variant suffix.
Example: `FM-FRM-FBL` (parent) → `FM-FRM-FBL-RON` (Ronaldo variant)

**BUSINESS DECISION REQUIRED**: Which model to use.

## Usage Across Systems

| System | SKU Usage |
|---|---|
| Admin panel | Product identification, search, inventory |
| Storefront | Not displayed to customers (internal only) |
| Shiprocket | Required for order manifest — maps to `product_sku` |
| Razorpay | Not directly used (order references order_id) |
| Manufacturing | Identifies what to print/produce |
| Analytics | Sales tracking, inventory reports |

## When SKUs Should Be Generated

1. **After** the business confirms the product/variant structure.
2. **After** the SKU format is approved.
3. **Before** any real orders are placed.
4. SKUs should be assigned during catalog import/seeding, NOT invented ad-hoc.

## What Requires Client Confirmation

- [ ] Approve or modify the proposed SKU format
- [ ] Decide whether existing marketplace SKUs (Motivation_frame_XX, etc.) should be preserved or replaced
- [ ] Decide product-vs-variant SKU structure
- [ ] Confirm whether SKUs should be visible to customers
- [ ] Confirm category code abbreviations
