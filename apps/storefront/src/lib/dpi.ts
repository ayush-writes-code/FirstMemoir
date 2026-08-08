import type { PrintQualityStatus } from '@repo/api-client';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface NormalizedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate effective DPI for a given crop on an original image printed at a physical size.
 *
 * All crop values are NORMALIZED (0.0–1.0) relative to the original image dimensions.
 * The physical size dimensions are in INCHES.
 *
 * @param originalDimensions - Width and height of the original uploaded image in pixels
 * @param normalizedCrop     - Normalized crop coordinates (0.0–1.0)
 * @param physicalWidthInches - The target print width in inches (from the selected Size option)
 */
export function calculateDpi(
  originalDimensions: ImageDimensions,
  normalizedCrop: NormalizedCrop,
  physicalWidthInches: number
): number {
  if (physicalWidthInches <= 0) return 0;

  // Calculate the pixel width of the cropped region in the original image
  const croppedPixelWidth = normalizedCrop.width * originalDimensions.width;

  // DPI = pixels in the crop region / target physical width in inches
  const dpi = croppedPixelWidth / physicalWidthInches;

  return Math.round(dpi);
}

/**
 * Classify an effective DPI value into a PrintQualityStatus tier.
 *
 * Tiers:
 *  - EXCELLENT: >= 300 DPI (museum-quality sharpness)
 *  - GOOD:      >= 150 DPI (standard print quality)
 *  - ACCEPTABLE: >= 100 DPI (acceptable for most customers)
 *  - LOW_QUALITY: < 100 DPI (noticeably blurry, requires acknowledgment)
 *  - NOT_RECOMMENDED: < 72 DPI (poor output, strong warning + acknowledgment required)
 */
export function classifyDpi(dpi: number): PrintQualityStatus {
  if (dpi >= 300) return 'EXCELLENT';
  if (dpi >= 150) return 'GOOD';
  if (dpi >= 100) return 'ACCEPTABLE';
  if (dpi >= 72) return 'LOW_QUALITY';
  return 'NOT_RECOMMENDED';
}

/**
 * Returns true if the given status requires explicit customer acknowledgment before checkout.
 */
export function requiresDpiAcknowledgment(status: PrintQualityStatus): boolean {
  return status === 'LOW_QUALITY' || status === 'NOT_RECOMMENDED';
}

/**
 * Convert browser-space pixel crop coordinates to normalized (0.0–1.0) crop coordinates
 * relative to the original high-resolution image.
 *
 * This must be called before persisting the CartLineItem to ensure the fulfillment pipeline
 * can accurately reproduce the crop on the original R2 asset, regardless of screen resolution.
 */
export function normalizeCrop(
  pixelCrop: { x: number; y: number; width: number; height: number },
  previewDimensions: ImageDimensions
): NormalizedCrop {
  return {
    x: pixelCrop.x / previewDimensions.width,
    y: pixelCrop.y / previewDimensions.height,
    width: pixelCrop.width / previewDimensions.width,
    height: pixelCrop.height / previewDimensions.height,
  };
}

/**
 * Convert normalized crop coordinates back to absolute pixel coordinates
 * in the original image space. Used by the fulfillment/print pipeline.
 */
export function denormalizeCrop(
  normalizedCrop: NormalizedCrop,
  originalDimensions: ImageDimensions
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(normalizedCrop.x * originalDimensions.width),
    y: Math.round(normalizedCrop.y * originalDimensions.height),
    width: Math.round(normalizedCrop.width * originalDimensions.width),
    height: Math.round(normalizedCrop.height * originalDimensions.height),
  };
}

/**
 * Human-readable labels and color tokens for each print quality tier.
 */
export const QUALITY_LABELS: Record<PrintQualityStatus, { label: string; description: string; color: string }> = {
  EXCELLENT: {
    label: 'Excellent Quality',
    description: 'Your photo will print with exceptional sharpness.',
    color: 'text-green-600',
  },
  GOOD: {
    label: 'Good Quality',
    description: 'Your photo will print clearly.',
    color: 'text-lime-600',
  },
  ACCEPTABLE: {
    label: 'Acceptable Quality',
    description: 'Print quality will be satisfactory for most uses.',
    color: 'text-yellow-600',
  },
  LOW_QUALITY: {
    label: 'Low Quality Warning',
    description: 'Your photo may appear slightly blurry at this size. Please confirm before proceeding.',
    color: 'text-orange-500',
  },
  NOT_RECOMMENDED: {
    label: 'Print Not Recommended',
    description: 'Your photo resolution is too low for this print size. The result may be very blurry.',
    color: 'text-red-600',
  },
};
