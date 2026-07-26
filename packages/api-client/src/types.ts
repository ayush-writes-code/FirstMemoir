export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface User {
  id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  categories: Array<{ category: Category }>;
}

export interface FrameMaterial {
  id: string;
  name: string;
  type: 'FRAME' | 'MAT' | 'GLASS';
  description: string | null;
  price_modifier: string;
  image_url: string | null;
  is_active: boolean;
}

export interface ProductDetailResponse {
  product: Product;
  frameMaterials: FrameMaterial[];
}

export interface ProductsListResponse {
  products: Product[];
}
