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

## 3. Status

- **Categories**: READY (Needs Client Value)
- **Products**: READY (Needs Client Value)
- **SKUs**: READY (Needs Client Value)
- **Product options**: READY (Needs Client Value)
- **Pricing**: READY (Needs Client Value)
- **Images**: READY (Needs Asset)
- **Customizer**: READY (Needs Client Value)
- **Mockups**: READY (Needs Asset, Needs Client Value)
- **Manufacturing snapshot**: READY
- **Packaging**: READY (Needs Client Value)
- **Shipping metadata**: READY (Needs Client Value)
- **Admin catalog**: READY (Supports JSON metadata imports via API/seed)
- **Validation**: READY (Zod validation enforces structures)
- **DTO/API path**: READY (JSON metadata fully mapped)
- **Order snapshot**: READY (Immutable serialization established)
