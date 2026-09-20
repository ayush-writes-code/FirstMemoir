export interface MockupCoordinates {
  top: string;
  left: string;
  width: string;
  height: string;
}

export type MockupMap = Record<string, Record<number, MockupCoordinates>>;

export const MOCKUP_COORDINATES: MockupMap = {};

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

  // Only warn if we fall back to DEFAULT_COORDINATES here, though now we expect 
  // most products to be data-driven via mockupMetadata passed to the component directly.
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
  // Hardcoded proof-of-concept removed. The system is now fully data-driven.
  return null;
}
