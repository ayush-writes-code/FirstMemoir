export interface MockupCoordinates {
  top: string;
  left: string;
  width: string;
  height: string;
}

export type MockupMap = Record<string, Record<number, MockupCoordinates>>;

export const MOCKUP_COORDINATES: MockupMap = {
  'family-portrait-frame': {
    0: { top: '25%', left: '30%', width: '40%', height: '50%' },
  },
  'wedding-memory-frame': {
    0: { top: '20%', left: '25%', width: '50%', height: '60%' },
  },
};

const DEFAULT_COORDINATES: MockupCoordinates = {
  top: '20%',
  left: '20%',
  width: '60%',
  height: '60%',
};

export function getMockupCoordinates(slug: string, sortOrder: number): MockupCoordinates {
  const productMap = MOCKUP_COORDINATES[slug];
  
  if (productMap && productMap[sortOrder]) {
    return productMap[sortOrder];
  }

  console.warn(`[Live Preview] Missing mockup coordinates for slug: "${slug}", sort_order: ${sortOrder}. Using fallback coordinates.`);
  return DEFAULT_COORDINATES;
}

// Phase 4 Premium Mockup System (3-layer)
export interface PremiumMockupMetadata {
  orientation: string;
  printArea: MockupCoordinates;
  baseAsset: string;
  overlayAsset: string;
}

export function getPremiumMockup(slug: string, _orientation: string): PremiumMockupMetadata | null {
  // Hardcoded proof-of-concept for anniversary-canvas
  // We ignore orientation check for this POC as requested
  if (slug === 'anniversary-canvas') {
    return {
      orientation: 'portrait', 
      printArea: {
        top: '20.53%',
        left: '39.25%',
        width: '21.30%',
        height: '41.80%'
      },
      baseAsset: '/mockups/anniversary-canvas/portrait/scene.webp',
      overlayAsset: '/mockups/anniversary-canvas/portrait/frame-overlay-test.png'
    };
  }
  return null;
}
