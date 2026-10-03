# SKU Policy (CONFIRMED)

> [!NOTE]
> **CONFIRMED DECISION**: Engineering will automatically generate deterministic, standardized SKUs for all listings that currently lack them.
> SKUs will remain fully editable through the admin/catalogue system later.
> Generating SKUs is **NOT** a client blocker. The client is not required to provide manual SKUs.

## Why SKU Is Needed

1. **Order fulfillment**: Shiprocket requires a product SKU for manifesting shipments.
2. **Inventory tracking**: Each distinct sellable item needs a unique identifier for stock management.
3. **Manufacturing**: Print/production partners need SKUs to identify what to produce.
4. **Admin operations**: Internal order management, returns, and analytics require stable product identifiers.
5. **Marketplace consistency**: If products are also listed on external channels, SKUs provide a stable mapping key.

## Current State of SKUs in Source Data

- **30 Motivation frames**: Have SKUs (`Motivation_frame_01` through `Motivation_frame_30`)
- **7 Car split posters**: Have SKU IDs (e.g., `AlfaRomeo_car`, `Pink lambo_car`)
- **3 Animal bookmarks**: Have SKU IDs (`AnimalBM1`, `AnimalBM2`, `AnimalBM3`)
- **1 Football poster set**: Has SKU (`Football_10`)
- **41 out of 82 folders have NO SKU**

## Standardized SKU Format

For listings without an existing SKU, engineering will generate standard SKUs using:

```
FM-{CATEGORY}-{SLUG}
```

Examples:
- `FM-FRM-FBL-RONALDO` → Frame, Football, Ronaldo
- `FM-FRM-FFC-CAMARO` → Frame, Fast & Furious, Camaro
- `FM-PST-ANI-10` → Poster, Anime, Pack of 10
- `FM-PST-SPL-EREN` → Poster, Split Anime, Eren
- `FM-BKM-QTE-BM1` → Bookmark, Quotes, BM-1

Category codes:
- `FRM` — Framed prints (8×12)
- `PST` — Posters (unframed)
- `BKM` — Bookmarks
- `CPP` — Custom Photo Prints (future)

Existing valid source SKUs (e.g., `Motivation_frame_01`, `AlfaRomeo_car`) may be preserved or normalized into this scheme.

## Product vs. Variant SKU Behavior

**Decision Confirmed**: All 82 listings are treated as **SEPARATE PRODUCTS**.
- Every product has its own individual, flat SKU.
- No multi-attribute variant suffixes are required for the current catalogue.
- SKUs are globally unique across the entire catalog.

## Admin Editability

Generated SKUs are not treated as immutable business data:
- They will be populated in the database upon catalogue import.
- The client and admin users can modify any SKU at any time via the Admin Panel prior to order fulfillment.

## Usage Across Systems

| System | SKU Usage |
|---|---|
| Admin panel | Product identification, search, inventory, editable field |
| Storefront | Internal identifier (not prominently displayed to customers) |
| Shiprocket | Required for order manifest — maps to `product_sku` |
| Razorpay | Not directly used (order references `order_id`) |
| Manufacturing | Identifies what to print/produce |
| Analytics | Sales tracking, inventory reports |
