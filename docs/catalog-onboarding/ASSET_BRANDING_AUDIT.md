# Asset Branding Audit

*Last updated: September 23, 2026*

## Background
The forensic audit revealed that all supplied `info.txt` files specify:
`brand name - PosterNet`

FirstMemoir is the target brand for the storefront. This audit examines whether the "PosterNet" branding is embedded in the actual image assets, or if it is merely text metadata intended for marketplaces.

## Finding Summary

| Inspection Method | Result | Note |
|---|---|---|
| EXIF / Image Metadata | **CLEAR** | No embedded "PosterNet" string found in image headers or binary strings via `sips`/`strings`. |
| OCR (Tesseract) | **CLEAR** | Automated text extraction on representative images did not detect "PosterNet" text. |
| Visual Inspection | 📋 **REQUIRES CLIENT CONFIRMATION** | Automated tools cannot confidently rule out graphical watermarks or logos. Human verification is required. |

## Affected Asset Classification

Conceptual Status: **PROGRAMMATICALLY CLEAR BUT FINAL VISUAL/CLIENT APPROVAL PENDING**

- **Prototype Phase**: The images successfully load, have passed programmatic checks, and do not break the UI. We will use them for the current development sprint.
- **Production Phase**: Before finalizing the R2 asset pipeline, the client must visually verify that no competitor/marketplace branding (PosterNet) is visible in the pixels of the final 452 images. We do not claim that PosterNet has been legally or commercially cleared.

## Recommendation
If "PosterNet" is merely the supplier's internal brand or a marketplace alias for the client, the assets are safe. If it is an unwanted watermark, **REQUIRES NEW ASSET** workflows must be triggered before the final production upload to R2.

We will NOT block the storefront engineering. We are using the 10 optimized prototype images in `public/catalog` to proceed.
