"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  ProductWithOptionsDto,
  ProductOptionDto,
  ProductOptionValueDto,
  PrintQualityStatus,
} from "@repo/api-client";
import { OptionSelector } from "./OptionSelector";
import { PersonalizationWorkspace } from "./PersonalizationWorkspace";
import { ImagePlus, Crop } from "lucide-react";
import { PriceSummary, useProductPrice } from "./PriceSummary";
import { DpiAcknowledgmentBanner } from "./DpiAcknowledgmentBanner";
import { FileUploader } from "./FileUploader";
import { PhotoCropper } from "./PhotoCropper";
import type { PrintOrientation } from "@repo/api-client";
import type { CropRect } from "../utils/cropMath";
import { useCartStore } from "../store/cart.store";
import { useProductPreview } from "../store/ProductPreviewContext";

interface Props {
  product: ProductWithOptionsDto;
}

/**
 * ProductCustomizer is the root interactive client component for the product details page.
 * It manages:
 *   - Selected option values (one per option group)
 *   - Exclusion enforcement (disabling incompatible value combinations)
 *   - Optimistic price calculation
 *   - DPI acknowledgment state (when quality is LOW_QUALITY or NOT_RECOMMENDED)
 *   - The Add to Cart action
 *
 * The actual upload flow and image canvas are handled by child components.
 * Prices are NEVER sent to the API — only option value IDs and customization data.
 */
export function ProductCustomizer({ product }: Props) {
  // Auto-select the first available value for each required option
  const initialSelections = useMemo<Record<string, string>>(() => {
    const selections: Record<string, string> = {};
    for (const option of product.options) {
      const firstValue = option.values[0];
      if (firstValue) {
        selections[option.id] = firstValue.id;
      }
    }
    return selections;
  }, [product.options]);

  const [selectedOptions, setSelectedOptions] =
    useState<Record<string, string>>(initialSelections);
  const [hasAcknowledgedDpi, setHasAcknowledgedDpi] = useState(false);

  // Build exclusion set for fast O(1) lookup: Set<"valueId1__valueId2">
  const exclusionSet = useMemo(() => {
    const set = new Set<string>();
    for (const exc of product.exclusions) {
      set.add(`${exc.option_value_1_id}__${exc.option_value_2_id}`);
      set.add(`${exc.option_value_2_id}__${exc.option_value_1_id}`);
    }
    return set;
  }, [product.exclusions]);

  // Derive the set of currently excluded value IDs based on selected options
  const excludedValueIds = useMemo(() => {
    const excluded = new Set<string>();
    const currentlySelected = Object.values(selectedOptions);
    for (const selectedId of currentlySelected) {
      for (const opt of product.options) {
        for (const val of opt.values) {
          if (exclusionSet.has(`${selectedId}__${val.id}`)) {
            excluded.add(val.id);
          }
        }
      }
    }
    return excluded;
  }, [selectedOptions, exclusionSet, product.options]);

  function handleOptionChange(
    optionId: string,
    valueId: string,
    option: ProductOptionDto,
  ) {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionId]: valueId };

      // If the newly selected value is a Size option, reset DPI acknowledgment
      // and invalidate any other selections that are now excluded
      const isSizeOption = option.name.toLowerCase() === "size";
      if (isSizeOption) {
        setHasAcknowledgedDpi(false);
        // De-select any values that become incompatible after size change
        const newExcluded = new Set<string>();
        for (const exc of product.exclusions) {
          if (exc.option_value_1_id === valueId)
            newExcluded.add(exc.option_value_2_id);
          if (exc.option_value_2_id === valueId)
            newExcluded.add(exc.option_value_1_id);
        }
        for (const [oid, vid] of Object.entries(next)) {
          if (newExcluded.has(vid) && oid !== optionId) {
            // Reset to first non-excluded value for that option
            const opt = product.options.find((o) => o.id === oid);
            const fallback = opt?.values.find((v) => !newExcluded.has(v.id));
            if (fallback) next[oid] = fallback.id;
          }
        }
      }

      return next;
    });
  }

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const { addToCart, isLoading: isCartLoading } = useCartStore();

  const [printOrientation, setPrintOrientation] =
    useState<PrintOrientation>("PORTRAIT");
  const [cropData, setCropData] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [rotation, setRotation] = useState<number>(0);
  

  // Sync to ProductPreviewContext
  const {
    setUploadData,
    setCropData: setContextCrop,
    setPrintOrientation: setContextOrientation,
    setSelectedFrameName,
    setRotation: setContextRotation,
    zoom,
    setZoom: setContextZoom,
    cropTranslation,
    setCropTranslation: setContextCropTranslation
  } = useProductPreview();

  useEffect(() => {
    setUploadData(uploadId, previewUrl);
  }, [uploadId, previewUrl, setUploadData]);

  useEffect(() => {
    setContextCrop(cropData);
  }, [cropData, setContextCrop]);

  useEffect(() => {
    setContextOrientation(printOrientation);
  }, [printOrientation, setContextOrientation]);

  useEffect(() => {
    setContextRotation(rotation);
  }, [rotation, setContextRotation]);

  useEffect(() => {
    const frameOption = product.options.find(
      (o) => o.name.toLowerCase() === "frame",
    );
    if (frameOption) {
      const selectedValueId = selectedOptions[frameOption.id];
      const selectedValue = frameOption.values.find(
        (v) => v.id === selectedValueId,
      );
      setSelectedFrameName(selectedValue?.value || null);
    }
  }, [selectedOptions, product.options, setSelectedFrameName]);

  // Parse physical size
  const { physicalWidth, physicalHeight, isSquare } = useMemo(() => {
    let w = 0;
    let h = 0;
    const sizeOption = product.options.find(
      (o) => o.name.toLowerCase() === "size",
    );
    const sizeValueId = sizeOption ? selectedOptions[sizeOption.id] : null;
    const sizeValue = sizeOption?.values.find(
      (v) => v.id === sizeValueId,
    )?.value;

    if (sizeValue) {
      const match = sizeValue.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const p1 = parseFloat(match[1]!);
        const p2 = parseFloat(match[2]!);
        // By default, smaller is width for portrait
        w = Math.min(p1, p2);
        h = Math.max(p1, p2);
      }
    }
    return {
      physicalWidth:
        printOrientation === "LANDSCAPE" ? Math.max(w, h) : Math.min(w, h),
      physicalHeight:
        printOrientation === "LANDSCAPE" ? Math.min(w, h) : Math.max(w, h),
      isSquare: w === h,
    };
  }, [selectedOptions, product.options, printOrientation]);

  // Ensure orientation is SQUARE if physical dimensions are square
  useMemo(() => {
    if (isSquare && printOrientation !== "SQUARE") {
      setPrintOrientation("SQUARE");
    }
  }, [isSquare, printOrientation]);

  // ---------------------------------------------------------------------------
  // Dynamic DPI Calculation
  // ---------------------------------------------------------------------------
  // Dynamic DPI Calculation
  // ---------------------------------------------------------------------------
  const { effectiveDpi, printQualityStatus, dpiAcknowledgmentRequired } =
    useMemo(() => {
      let dpi = 300;
      let status: PrintQualityStatus = "EXCELLENT";
      let requiresAck = false;

      if (
        imageWidth > 0 &&
        imageHeight > 0 &&
        physicalWidth > 0 &&
        physicalHeight > 0
      ) {
        // Calculate how many canonical pixels are actually in the crop area
        const canonical_crop_width_px = cropData.width * imageWidth;
        const canonical_crop_height_px = cropData.height * imageHeight;

        let final_pixel_width = canonical_crop_width_px;
        let final_pixel_height = canonical_crop_height_px;

        if (rotation === 90 || rotation === 270) {
          final_pixel_width = canonical_crop_height_px;
          final_pixel_height = canonical_crop_width_px;
        }

        const dpi_x = final_pixel_width / physicalWidth;
        const dpi_y = final_pixel_height / physicalHeight;
        dpi = Math.floor(Math.min(dpi_x, dpi_y));

        if (dpi >= 250) status = "EXCELLENT";
        else if (dpi >= 150) status = "GOOD";
        else if (dpi >= 100) status = "ACCEPTABLE";
        else if (dpi >= 70) status = "LOW_QUALITY";
        else status = "NOT_RECOMMENDED";

        requiresAck = status === "LOW_QUALITY" || status === "NOT_RECOMMENDED";
      }

      return {
        effectiveDpi: dpi,
        printQualityStatus: status,
        dpiAcknowledgmentRequired: requiresAck,
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageWidth, imageHeight, physicalWidth, physicalHeight, cropData]);

  const handleUploadSuccess = useCallback(
    (id: string, url: string, w: number, h: number) => {
      setUploadId(id);
      setPreviewUrl(url);
      setImageWidth(w);
      setImageHeight(h);
    },
    [],
  );

  const handleUploadReset = useCallback(() => {
    setUploadId(null);
    setPreviewUrl(null);
    setImageWidth(0);
    setImageHeight(0);
    setHasAcknowledgedDpi(false);
    setContextCrop({ x: 0, y: 0, width: 1, height: 1 });
    setContextZoom(1);
    setContextRotation(0);
    setContextCropTranslation({x: 0, y: 0});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAddToCart =
    (!dpiAcknowledgmentRequired || hasAcknowledgedDpi) && uploadId !== null;
  const selectedValueIds = Object.values(selectedOptions);
  const { total } = useProductPrice(product, selectedValueIds);

  const handleAddToCart = async () => {
    if (!uploadId || !previewUrl) return;

    await addToCart({
      product_id: product.id,
      quantity: 1,
      selected_option_value_ids: selectedValueIds,
      upload_id: uploadId,
      preview_url: previewUrl,
      crop: {
        ...cropData,
        aspect_ratio: `${physicalWidth}:${physicalHeight}`,
      },
      rotation: rotation,
      zoom: zoom,
      orientation: printOrientation,
      effective_dpi: effectiveDpi,
      print_quality_status: printQualityStatus,
      dpi_acknowledged: hasAcknowledgedDpi,
    });
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      {/* Personalization Trigger */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-3">
          1. Personalize Print
        </h3>
        {!uploadId ? (
          <button
            onClick={() => setIsWorkspaceOpen(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-hairline hover:border-brand hover:bg-brand/5 text-ink hover:text-brand font-medium rounded-lg h-24 transition-colors"
          >
            <ImagePlus size={24} className="text-muted" />
            Upload Photo
          </button>
        ) : (
          <div className="p-4 border border-hairline rounded-lg flex items-center justify-between bg-surface-soft">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-canvas border border-hairline overflow-hidden flex-shrink-0 relative">
                <img
                  src={previewUrl!}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-ink">
                  Photo uploaded
                </span>
                <span className="text-xs text-muted">Ready for print</span>
              </div>
            </div>
            <button
              onClick={() => setIsWorkspaceOpen(true)}
              className="px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10 rounded-full transition-colors flex items-center gap-1"
            >
              <Crop size={16} />
              Edit Crop
            </button>
          </div>
        )}
      </div>

      {isWorkspaceOpen && (
        <PersonalizationWorkspace
          product={product}
          physicalWidth={physicalWidth}
          physicalHeight={physicalHeight}
          initialImageWidth={imageWidth}
          initialImageHeight={imageHeight}
          onImageSizeChange={(w, h) => {
            setImageWidth(w);
            setImageHeight(h);
          }}
          onClose={() => setIsWorkspaceOpen(false)}
          onSave={() => setIsWorkspaceOpen(false)}
        />
      )}

      {/* Option Selectors */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-3 mt-8">
          2. Customize Print
        </h3>
        <div className="space-y-6">
          {product.options.map((option) => (
            <OptionSelector
              key={option.id}
              option={option}
              selectedValueId={selectedOptions[option.id] ?? null}
              excludedValueIds={excludedValueIds}
              onChange={(valueId) =>
                handleOptionChange(option.id, valueId, option)
              }
            />
          ))}
        </div>
      </div>

      {/* Price Summary — optimistic, recalculated on the backend at checkout */}
      <PriceSummary product={product} selectedValueIds={selectedValueIds} />

      {/* DPI acknowledgment banner — shown when print quality is too low */}
      {dpiAcknowledgmentRequired && uploadId && (
        <DpiAcknowledgmentBanner
          acknowledged={hasAcknowledgedDpi}
          onAcknowledge={() => setHasAcknowledgedDpi(true)}
        />
      )}

      {/* Add to Cart CTA */}
      <button
        disabled={!canAddToCart || isCartLoading}
        className="w-full flex items-center justify-center bg-brand hover:bg-brand-pressed disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-lg rounded-pill h-12 mt-2 transition-colors"
        onClick={handleAddToCart}
      >
        {isCartLoading ? "Adding..." : "Add to Cart"}
      </button>

      <p className="text-sm text-center text-muted">
        Estimated delivery: 5–7 business days
      </p>

      {/* Sticky Mobile Add To Cart CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-4 max-w-content mx-auto">
          <div className="flex flex-col">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">
              Total
            </span>
            <span className="text-lg font-semibold text-ink">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>
          <button
            disabled={!canAddToCart || isCartLoading}
            className="flex-1 bg-brand hover:bg-brand-pressed disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-base rounded-pill h-11 transition-colors flex items-center justify-center max-w-[200px]"
            onClick={handleAddToCart}
          >
            {isCartLoading ? "Adding..." : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
