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

export type StorageVisibility = 'public' | 'private';

export interface PresignedUploadResponse {
  upload_url: string;
  file_key: string;
  public_url: string | null;
  expires_in: number;    // seconds the URL is valid for
  max_size_bytes: number;
}

export interface ProductImage {
  id: string;
  file_key: string;
  url: string; // Dynamically added by the backend
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

export interface CreateProductInput {
  name: string;
  description?: string;
  base_price: string;
  category_ids: string[];
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  base_price?: string;
  category_ids?: string[];
  is_active?: boolean;
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



export interface ProductsListResponse {
  products: Product[];
}
