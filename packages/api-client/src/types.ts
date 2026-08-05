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

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  success: boolean;
  data: T[];
  error: string | null;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryTreeDto extends CategoryDto {
  children: CategoryTreeDto[];
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

export interface ProductImageDto {
  id: string;
  file_key: string;
  url: string; // Dynamically added by the backend
  alt_text: string | null;
  sort_order: number;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImageDto[];
  categories: Array<{ category: CategoryDto }>;
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
  products: ProductDto[];
}

export interface ProductOptionValueDto {
  id: string;
  option_id: string;
  value: string;
  metadata: any | null;
  modifier_type: 'FLAT' | 'PERCENTAGE';
  price_modifier: string;
  global_material_id: string | null;
  track_inventory: boolean;
  stock_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductOptionDto {
  id: string;
  product_id: string;
  name: string;
  input_type: 'SELECT' | 'RADIO' | 'BUTTON' | 'SWATCH';
  is_required: boolean;
  sort_order: number;
  values: ProductOptionValueDto[];
}

export interface OptionExclusionDto {
  id: string;
  product_id: string;
  option_value_1_id: string;
  option_value_2_id: string;
}

export interface PricingModifierBreakdown {
  optionName: string;
  value: string;
  type: 'FLAT' | 'PERCENTAGE';
  amount: number;
}

export interface PricingBreakdown {
  version: 1;
  basePrice: number;
  modifiers: PricingModifierBreakdown[];
  subtotal: number;
  finalPrice: number;
}

export interface ProductWithOptionsDto extends ProductDto {
  options: ProductOptionDto[];
  exclusions: OptionExclusionDto[];
}
