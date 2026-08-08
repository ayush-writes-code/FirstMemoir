'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ProductWithOptionsDto, ProductOptionDto, ProductOptionValueDto, PrintQualityStatus } from '@repo/api-client';
import { OptionSelector } from './OptionSelector';
import { PriceSummary } from './PriceSummary';
import { DpiAcknowledgmentBanner } from './DpiAcknowledgmentBanner';
import { FileUploader } from './FileUploader';
import { useCartStore } from '../store/cart.store';

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

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialSelections);
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

  function handleOptionChange(optionId: string, valueId: string, option: ProductOptionDto) {
    setSelectedOptions(prev => {
      const next = { ...prev, [optionId]: valueId };

      // If the newly selected value is a Size option, reset DPI acknowledgment
      // and invalidate any other selections that are now excluded
      const isSizeOption = option.name.toLowerCase() === 'size';
      if (isSizeOption) {
        setHasAcknowledgedDpi(false);
        // De-select any values that become incompatible after size change
        const newExcluded = new Set<string>();
        for (const exc of product.exclusions) {
          if (exc.option_value_1_id === valueId) newExcluded.add(exc.option_value_2_id);
          if (exc.option_value_2_id === valueId) newExcluded.add(exc.option_value_1_id);
        }
        for (const [oid, vid] of Object.entries(next)) {
          if (newExcluded.has(vid) && oid !== optionId) {
            // Reset to first non-excluded value for that option
            const opt = product.options.find(o => o.id === oid);
            const fallback = opt?.values.find(v => !newExcluded.has(v.id));
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
  const { addToCart, isLoading: isCartLoading } = useCartStore();

  // ---------------------------------------------------------------------------
  // Dynamic DPI Calculation
  // ---------------------------------------------------------------------------
  const { effectiveDpi, printQualityStatus, dpiAcknowledgmentRequired } = useMemo(() => {
    let dpi = 300;
    let status: PrintQualityStatus = 'EXCELLENT';
    let requiresAck = false;

    if (imageWidth > 0 && imageHeight > 0) {
      const sizeOption = product.options.find(o => o.name.toLowerCase() === 'size');
      const sizeValueId = sizeOption ? selectedOptions[sizeOption.id] : null;
      const sizeValue = sizeOption?.values.find(v => v.id === sizeValueId)?.value;

      if (sizeValue) {
        const match = sizeValue.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
        if (match) {
          const printWidth = parseFloat(match[1]!);
          const printHeight = parseFloat(match[2]!);

          const imgLong = Math.max(imageWidth, imageHeight);
          const imgShort = Math.min(imageWidth, imageHeight);
          const prnLong = Math.max(printWidth, printHeight);
          const prnShort = Math.min(printWidth, printHeight);

          const dpiLong = imgLong / prnLong;
          const dpiShort = imgShort / prnShort;
          dpi = Math.floor(Math.min(dpiLong, dpiShort));

          if (dpi >= 250) status = 'EXCELLENT';
          else if (dpi >= 150) status = 'GOOD';
          else if (dpi >= 100) status = 'ACCEPTABLE';
          else if (dpi >= 70) status = 'LOW_QUALITY';
          else status = 'NOT_RECOMMENDED';

          requiresAck = status === 'LOW_QUALITY' || status === 'NOT_RECOMMENDED';
        }
      }
    }

    return {
      effectiveDpi: dpi,
      printQualityStatus: status,
      dpiAcknowledgmentRequired: requiresAck,
    };
  }, [imageWidth, imageHeight, selectedOptions, product.options]);

  const handleUploadSuccess = useCallback((id: string, url: string, w: number, h: number) => {
    setUploadId(id);
    setPreviewUrl(url);
    setImageWidth(w);
    setImageHeight(h);
  }, []);

  const handleUploadReset = useCallback(() => {
    setUploadId(null);
    setPreviewUrl(null);
    setImageWidth(0);
    setImageHeight(0);
    setHasAcknowledgedDpi(false);
  }, []);

  const canAddToCart = (!dpiAcknowledgmentRequired || hasAcknowledgedDpi) && uploadId !== null;
  const selectedValueIds = Object.values(selectedOptions);

  const handleAddToCart = async () => {
    if (!uploadId || !previewUrl) return;
    
    // In Phase 6B, basic crop data defaults
    const defaultCropData = {
      x: 0,
      y: 0,
      width: 100, // assuming 100% normalized
      height: 100,
      aspect_ratio: '1:1', // Or derive from size
    };

    await addToCart({
      product_id: product.id,
      quantity: 1,
      selected_option_value_ids: selectedValueIds,
      upload_id: uploadId,
      preview_url: previewUrl,
      crop: defaultCropData,
      rotation: 0,
      zoom: 1,
      effective_dpi: effectiveDpi,
      print_quality_status: printQualityStatus,
      dpi_acknowledged: hasAcknowledgedDpi,
    });
  };

  return (
    <div className="space-y-6">
      {/* Photo Upload */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-3">1. Upload Photo</h3>
        <FileUploader 
          onUploadSuccess={handleUploadSuccess} 
          onUploadReset={handleUploadReset}
        />
      </div>

      {/* Option Selectors */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-3 mt-8">2. Customize Print</h3>
        <div className="space-y-6">
          {product.options.map(option => (
            <OptionSelector
              key={option.id}
              option={option}
              selectedValueId={selectedOptions[option.id] ?? null}
              excludedValueIds={excludedValueIds}
              onChange={(valueId) => handleOptionChange(option.id, valueId, option)}
            />
          ))}
        </div>
      </div>

      {/* Price Summary — optimistic, recalculated on the backend at checkout */}
      <PriceSummary
        product={product}
        selectedValueIds={selectedValueIds}
      />

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
        {isCartLoading ? 'Adding...' : 'Add to Cart'}
      </button>

      <p className="text-sm text-center text-muted">
        Estimated delivery: 5–7 business days
      </p>
    </div>
  );
}
