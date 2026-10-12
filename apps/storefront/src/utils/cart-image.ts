import { PRODUCT_SLUG_ALIASES } from '../config/slug-aliases';

export const CANONICAL_R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';

/**
 * Normalizes a product name into a canonical slug format matching the catalog.
 */
export function slugifyProductName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export interface CartImageResolvable {
  preview_url?: string | null;
  product_image?: string | null;
  product_slug?: string | null;
  product_name?: string | null;
}

/**
 * Resolves the primary thumbnail URL for a cart line item.
 * 
 * Order of precedence:
 * 1. item.preview_url (for customized photo uploads / crops)
 * 2. item.product_image (backend-calculated canonical public image URL)
 * 3. item.product_slug (direct canonical R2 storage key convention)
 * 4. item.product_name (slugified and alias-mapped fallback)
 * 
 * Returns null if no valid image URL could be derived.
 */
export function resolveCanonicalCartImageUrl(item: CartImageResolvable): string | null {
  if (!item) return null;

  // 1. Customized print crop preview has first priority
  if (item.preview_url && typeof item.preview_url === 'string' && item.preview_url.trim() !== '') {
    return item.preview_url.trim();
  }

  // 2. Explicit product_image from API DTO has second priority
  if (item.product_image && typeof item.product_image === 'string' && item.product_image.trim() !== '') {
    return item.product_image.trim();
  }

  // 3. Fallback via product_slug
  if (item.product_slug && typeof item.product_slug === 'string' && item.product_slug.trim() !== '') {
    const rawSlug = item.product_slug.trim();
    const resolvedSlug = PRODUCT_SLUG_ALIASES[rawSlug] || rawSlug;
    const baseUrl = CANONICAL_R2_PUBLIC_URL.replace(/\/+$/, '');
    return `${baseUrl}/products/${resolvedSlug}/primary.webp`;
  }

  // 4. Fallback via product_name (handles cached or older cart items from before API update)
  if (item.product_name && typeof item.product_name === 'string' && item.product_name.trim() !== '') {
    const rawSlug = slugifyProductName(item.product_name);
    if (rawSlug) {
      const resolvedSlug = PRODUCT_SLUG_ALIASES[rawSlug] || rawSlug;
      const baseUrl = CANONICAL_R2_PUBLIC_URL.replace(/\/+$/, '');
      return `${baseUrl}/products/${resolvedSlug}/primary.webp`;
    }
  }

  return null;
}

/**
 * Derives the canonical product page URL for linking from the cart item.
 */
export function resolveProductPageHref(item: {
  product_slug?: string | null;
  product_name?: string | null;
}): string {
  if (item.product_slug && typeof item.product_slug === 'string') {
    const rawSlug = item.product_slug.trim();
    const resolvedSlug = PRODUCT_SLUG_ALIASES[rawSlug] || rawSlug;
    return `/products/${resolvedSlug}`;
  }

  if (item.product_name && typeof item.product_name === 'string') {
    const rawSlug = slugifyProductName(item.product_name);
    if (rawSlug) {
      const resolvedSlug = PRODUCT_SLUG_ALIASES[rawSlug] || rawSlug;
      return `/products/${resolvedSlug}`;
    }
  }

  return '/products';
}
