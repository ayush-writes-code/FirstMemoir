import type { ProductDto } from "@/lib/api-client";

/**
 * StorefrontProduct is the stable UI-facing product model consumed by ProductCard and PDP.
 * It abstracts whether the data comes from the real API (ProductDto) or the prototype catalog.
 */
export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  base_price: string;
  is_missing_price?: boolean;
  images: {
    id: string;
    url: string;
    alt_text: string;
    order: number;
  }[];
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  created_at: string;
  // Options/Variants (stubbed for UI)
  options?: {
    id: string;
    name: string;
    values: {
      id: string;
      value: string;
    }[];
  }[];
  description?: string;
  is_prototype?: boolean; // Flag to isolate from real cart API
}

/**
 * Adapter to convert real API ProductDto to StorefrontProduct
 */
export function adaptApiProductToStorefront(apiProduct: ProductDto): StorefrontProduct {
  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: apiProduct.name,
    base_price: apiProduct.base_price,
    images: apiProduct.images?.map(img => ({
      id: img.id,
      url: img.url,
      alt_text: img.alt_text || apiProduct.name,
      order: 0,
    })) || [],
    categories: apiProduct.categories?.map(c => ({
      id: c.category.id,
      name: c.category.name,
      slug: c.category.slug,
    })) || [],
    created_at: apiProduct.created_at,
    description: apiProduct.description || undefined,
    is_prototype: false,
  };
}
