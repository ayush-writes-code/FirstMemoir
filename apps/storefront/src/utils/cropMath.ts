export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function visualCropToCanonicalCrop(
  visualCropPct: CropRect,
  rotation: 0 | 90 | 180 | 270
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
    { x: vX + vW, y: vY + vH }
  ];

  // Map back to canonical coordinates using center-pivot inverse transformation
  const canonicalCorners = visualCorners.map(p => {
    switch (rotation) {
      case 0: return { x: p.x, y: p.y };
      case 90: return { x: p.y, y: 1 - p.x };
      case 180: return { x: 1 - p.x, y: 1 - p.y };
      case 270: return { x: 1 - p.y, y: p.x };
      default: return { x: p.x, y: p.y };
    }
  });

  const minX = Math.min(...canonicalCorners.map(p => p.x));
  const minY = Math.min(...canonicalCorners.map(p => p.y));
  const maxX = Math.max(...canonicalCorners.map(p => p.x));
  const maxY = Math.max(...canonicalCorners.map(p => p.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function canonicalCropToVisualCrop(
  canonicalCrop: CropRect,
  rotation: number
): CropRect {
  const { x, y, width: w, height: h } = canonicalCrop;
  const corners = [
    { x, y }, { x: x+w, y }, { x, y: y+h }, { x: x+w, y: y+h }
  ];

  const visualCorners = corners.map(p => {
    switch (rotation % 360) {
      case 0: return { x: p.x, y: p.y };
      case 90: return { x: 1 - p.y, y: p.x };
      case 180: return { x: 1 - p.x, y: 1 - p.y };
      case 270: return { x: p.y, y: 1 - p.x };
      default: return { x: p.x, y: p.y };
    }
  });

  const minX = Math.min(...visualCorners.map(p => p.x));
  const minY = Math.min(...visualCorners.map(p => p.y));
  const maxX = Math.max(...visualCorners.map(p => p.x));
  const maxY = Math.max(...visualCorners.map(p => p.y));

  return {
    x: minX * 100,
    y: minY * 100,
    width: (maxX - minX) * 100,
    height: (maxY - minY) * 100
  };
}
