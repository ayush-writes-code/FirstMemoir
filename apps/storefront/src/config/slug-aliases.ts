/**
 * Maps legacy/prototype product slugs to canonical ingested catalogue slugs.
 * Used for seamless routing and backward-compatibility with previously shared links.
 */
export const PRODUCT_SLUG_ALIASES: Record<string, string> = {
  'porsche-gt3-rs-frame': 'porsche-gt3-rs-wall-frame-set',
  'toyota-supra-wall-frame': 'ff-supra-frame',
  'hustle-hard-motivation-frame': 'motivation-quote-frame-03',
  'focus-motivation-frame': 'motivation-quote-frame-09',
  'ronaldo-real-madrid-split-poster': 'ronaldo-real-madrid-club-split-poster',
};
