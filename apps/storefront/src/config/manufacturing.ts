export interface ManufacturingProfile {
  bleedInches: number;
  safeZoneInches: number;
}

export const DEFAULT_MANUFACTURING_PROFILE: ManufacturingProfile = {
  bleedInches: 0.25,
  safeZoneInches: 0.5,
};
