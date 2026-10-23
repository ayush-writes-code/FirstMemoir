import { DEFAULT_MANUFACTURING_PROFILE, type ManufacturingProfile } from '../config/manufacturing';
import type { PrintOrientation } from '@repo/api-client';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropDimensionsResult {
  orientedWidth: number;
  orientedHeight: number;
  targetWidth: number;
  targetHeight: number;
  aspect: number;
  bleedPctX: number;
  bleedPctY: number;
  safeZonePctX: number;
  safeZonePctY: number;
}

/**
 * Computes oriented print dimensions, aspect ratio including bleed, and bleed/safe-zone percentage guides.
 * Accurately aligns aspect ratio to Portrait, Landscape, or Square regardless of input dimension order.
 */
export function computeCropDimensions(
  printWidth: number,
  printHeight: number,
  orientation: PrintOrientation,
  profile: ManufacturingProfile = DEFAULT_MANUFACTURING_PROFILE,
): CropDimensionsResult {
  const isSquare = printWidth === printHeight;
  const orientedWidth = isSquare
    ? printWidth
    : orientation === 'LANDSCAPE'
      ? Math.max(printWidth, printHeight)
      : Math.min(printWidth, printHeight);

  const orientedHeight = isSquare
    ? printHeight
    : orientation === 'LANDSCAPE'
      ? Math.min(printWidth, printHeight)
      : Math.max(printWidth, printHeight);

  const targetWidth = orientedWidth + 2 * profile.bleedInches;
  const targetHeight = orientedHeight + 2 * profile.bleedInches;
  const aspect = targetWidth / targetHeight;

  const bleedPctX = (profile.bleedInches / targetWidth) * 100;
  const bleedPctY = (profile.bleedInches / targetHeight) * 100;
  const safeZonePctX =
    ((profile.bleedInches + profile.safeZoneInches) / targetWidth) * 100;
  const safeZonePctY =
    ((profile.bleedInches + profile.safeZoneInches) / targetHeight) * 100;

  return {
    orientedWidth,
    orientedHeight,
    targetWidth,
    targetHeight,
    aspect,
    bleedPctX,
    bleedPctY,
    safeZonePctX,
    safeZonePctY,
  };
}

/**
 * Converts visual crop percentages (0-100) on the rotated viewport back to
 * canonical unrotated normalized image coordinates (0-1).
 */
export function visualCropToCanonicalCrop(
  visualCropPct: CropRect,
  rotation: 0 | 90 | 180 | 270,
): CropRect {
  // Convert 0-100 to 0-1
  const vX = visualCropPct.x / 100;
  const vY = visualCropPct.y / 100;
  const vW = visualCropPct.width / 100;
  const vH = visualCropPct.height / 100;

  // The 4 visual corners
  const visualCorners = [
    { x: vX, y: vY },
    { x: vX + vW, y: vY },
    { x: vX, y: vY + vH },
    { x: vX + vW, y: vY + vH },
  ];

  // Map back to canonical coordinates using center-pivot inverse transformation
  const canonicalCorners = visualCorners.map((p) => {
    switch (rotation) {
      case 0:
        return { x: p.x, y: p.y };
      case 90:
        return { x: p.y, y: 1 - p.x };
      case 180:
        return { x: 1 - p.x, y: 1 - p.y };
      case 270:
        return { x: 1 - p.y, y: p.x };
      default:
        return { x: p.x, y: p.y };
    }
  });

  const minX = Math.max(0, Math.min(1, Math.min(...canonicalCorners.map((p) => p.x))));
  const minY = Math.max(0, Math.min(1, Math.min(...canonicalCorners.map((p) => p.y))));
  const maxX = Math.max(0, Math.min(1, Math.max(...canonicalCorners.map((p) => p.x))));
  const maxY = Math.max(0, Math.min(1, Math.max(...canonicalCorners.map((p) => p.y))));

  return {
    x: Number(minX.toFixed(6)),
    y: Number(minY.toFixed(6)),
    width: Number(Math.min(1 - minX, maxX - minX).toFixed(6)),
    height: Number(Math.min(1 - minY, maxY - minY).toFixed(6)),
  };
}

/**
 * Converts canonical unrotated normalized image coordinates (0-1) to
 * visual crop percentages (0-100) on the rotated viewport for rendering previews.
 */
export function canonicalCropToVisualCrop(
  canonicalCrop: CropRect,
  rotation: number,
): CropRect {
  const { x, y, width: w, height: h } = canonicalCrop;
  const corners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ];

  const visualCorners = corners.map((p) => {
    switch (rotation % 360) {
      case 0:
        return { x: p.x, y: p.y };
      case 90:
        return { x: 1 - p.y, y: p.x };
      case 180:
        return { x: 1 - p.x, y: 1 - p.y };
      case 270:
        return { x: p.y, y: 1 - p.x };
      default:
        return { x: p.x, y: p.y };
    }
  });

  const minX = Math.max(0, Math.min(1, Math.min(...visualCorners.map((p) => p.x))));
  const minY = Math.max(0, Math.min(1, Math.min(...visualCorners.map((p) => p.y))));
  const maxX = Math.max(0, Math.min(1, Math.max(...visualCorners.map((p) => p.x))));
  const maxY = Math.max(0, Math.min(1, Math.max(...visualCorners.map((p) => p.y))));

  return {
    x: Number((minX * 100).toFixed(4)),
    y: Number((minY * 100).toFixed(4)),
    width: Number(((maxX - minX) * 100).toFixed(4)),
    height: Number(((maxY - minY) * 100).toFixed(4)),
  };
}
