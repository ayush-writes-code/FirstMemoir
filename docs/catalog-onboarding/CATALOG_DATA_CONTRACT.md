# Real-Data Readiness Contract

This document explicitly defines the engineering integration points for real business data resulting from the final catalog matrix meeting.

## 1. What the meeting must provide

- **Categories**: Names, slugs, descriptions, ordering.
- **Products**: Names, slugs, descriptions, base prices, active states.
- **SKUs**: Canonical SKUs for every product/variant.
- **Prices**: Base prices for products, flat or percentage modifiers for options (e.g. Size, Frame).
- **Options**: Available dimensions (Size), framing options, materials (glass, paper).
- **Dimensions**: Exact canonical aspect ratios and print boundary boxes.
- **Packaging**: Final physical shipping dimensions (L x W x H) and gross weights per Size option.
- **Mockups/Assets**: URLs/paths to canonical base scenes, foreground overlay assets, and the exact absolute coordinates (`top`, `left`, `width`, `height`) mapping the print area to the base scene.
- **Manufacturing Requirements**: Any additional metadata needed by Print/Fulfillment partners per product.

## 2. Where each value goes

### Product Core Data
- **Business input:** Product Name, Slug, Description, Base Price, SKU
- **Database field:** `Product` model (`name`, `slug`, `description`, `base_price`, `sku`)
- **API/DTO:** `CreateProductInput`, `UpdateProductInput`, `ProductDto`
- **Frontend consumer:** Product detail page, Cart, Checkout
- **Consumer:** Shiprocket manifest generation (requires `sku`), Razorpay (requires total price)

### Option Definitions & Pricing Modifiers
- **Business input:** Option groupings (e.g. "Size", "Frame"), specific values ("12x18", "Walnut"), and price impacts.
- **Database field:** `ProductOption`, `ProductOptionValue` (`price_modifier`, `modifier_type` = `FLAT` | `PERCENTAGE`)
- **API/DTO:** `ProductOptionDto`, `ProductOptionValueDto`
- **Frontend consumer:** Customizer UI (Select/Radio/Swatch rendering)
- **Consumer:** `PricingService` calculates final immutable snapshot price.

### Manufacturing & Packaging Dimensions
- **Business input:** Physical target width/height and final box packaging L/W/H/Weight.
- **Database field:** `ProductOptionValue.metadata` (e.g. JSON: `{ "width": 12, "height": 18, "unit": "in", "packaging": { "length": 14, "width": 20, "height": 2, "weight": 1.2 } }`)
- **API/DTO:** Parsed internally by `CheckoutService` into `customization_data` snapshot.
- **Frontend consumer:** Customizer uses aspect ratio for crop enforcement.
- **Consumer:** `ShiprocketService` dynamically extracts `length`, `width`, `height`, `weight_kg` directly from the immutable `customization_data`.

### Mockup Coordinate Geometry
- **Business input:** Layer references (base, overlay) and absolute layout percentages for the mockup scene.
- **Database field:** `Product.mockup_metadata` JSON (e.g., `{ "mockups": { "portrait": { "printArea": {...}, "baseAsset": "...", "overlayAsset": "..." } } }`)
- **API/DTO:** `ProductDto.mockup_metadata`
- **Frontend consumer:** `ProductLivePreview` component directly consumes this to render exact, data-driven multilayer CSS composites.

## 3. Catalog Readiness Breakdown

### Ready now (Engineering & Admin UI prepared)
- **Categories**: Schema, API, and Admin UI fully functional.
- **Products**: Name, SKU, description, base price, categories, active state managed via Admin UI.
- **Product Options**: Options (Select, Radio, Button, Swatch) and Values managed via Admin UI.
- **Option Pricing Modifiers**: FLAT and PERCENTAGE modifiers supported in DB, API, Admin UI, and checkout pricing calculation.
- **Product Mockup Metadata**: Managed via Admin UI with preset templates and live validation; validated on backend via strict Zod percentage schema.
- **Manufacturing Metadata (Passive)**: Managed via Admin UI with JSON syntax validation; persisted passively in DB without speculative constraints.
- **Option Value Metadata & Packaging**: Admin UI provides structured inputs (physical dimensions, packaging L×W×H/weight) plus custom JSON toggle; validated on backend via `optionValueMetadataSchema`; editable in Admin UI without deleting records.
- **Order Snapshots**: Authoritative snapshotting of customization, pricing, dimensions, and packaging into `OrderItem.customization_data` at checkout time.
- **Shiprocket Fulfillment Pipeline**: Reads snapshot packaging metrics with strict positive-number validation (clean failure on missing/invalid data, zero hardcoded fallback weights).

### Requires client decision (Product / Business Matrix Meeting)
- **Packaging Cardinality**: UNKNOWN. Must determine whether packaging box dimensions and weights vary purely by Size, or by combinations of Size + Frame, or per product variant. (Current engineering abstraction allows metadata on any OptionValue, but relational model adjustments await meeting clarification).
- **Final Product Variants & SKUs**: Canonical SKU naming convention, variant matrix, and pricing tiers.
- **Option Exclusions**: Complete matrix of disallowed combinations (e.g. Canvas + Glass).
- **Actual Manufacturing Requirements**: Partner print specifications, DPI thresholds, bleeds, or export profiles.

### Requires client asset
- **Real Mockups & Scene Backgrounds**: High-resolution base scenes for each orientation/category.
- **Overlay Assets**: Transparent PNG frames and glass reflection layers.
- **Canonical Product Images**: Master product gallery images for storefront display.

### Requires credentials
- **Production Shiprocket API Credentials**: Live token generation for real courier scheduling.
- **Production Razorpay Key & Webhook Secret**: Live payment gateway credentials.
- **Cloudflare R2 Production CORS Configuration**: Vercel production origin permission.

No currently known schema gaps based on requirements available as of September 20, 2026.
