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
  sku: string | null;
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
  sku?: string | null;
  description?: string;
  base_price: string;
  category_ids: string[];
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string | null;
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

export type PrintQualityStatus =
  | 'EXCELLENT'
  | 'GOOD'
  | 'ACCEPTABLE'
  | 'LOW_QUALITY'
  | 'NOT_RECOMMENDED';

export type PrintOrientation =
  | 'PORTRAIT'
  | 'LANDSCAPE'
  | 'SQUARE';

export type CartLineItemStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'STALE'
  | 'CHECKED_OUT'
  | 'CONVERTED';

export interface CropData {
  /** Normalized left edge of crop window (0.0–1.0 of original image width) */
  x: number;
  /** Normalized top edge of crop window (0.0–1.0 of original image height) */
  y: number;
  /** Normalized width of crop window (0.0–1.0) */
  width: number;
  /** Normalized height of crop window (0.0–1.0) */
  height: number;
  /** Aspect ratio string derived from the selected Size option, e.g. "8:10" */
  aspect_ratio: string;
}

export interface CartLineItemDto {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  status: CartLineItemStatus;
  upload_id: string;
  preview_url: string;
  orientation: PrintOrientation;
  crop: CropData;
  rotation: number;
  zoom: number;
  effective_dpi: number;
  print_quality_status: PrintQualityStatus;
  dpi_acknowledged: boolean;
  pricing_version: number;
  created_at: string;
  updated_at: string;
  selected_options: {
    option_id: string;
    option_name: string;
    value_name: string;
    price_modifier: number;
  }[];
}

export interface CartDto {
  id: string;
  user_id: string | null;
  session_id: string | null;
  items: CartLineItemDto[];
  created_at: string;
  updated_at: string;
}

/** Payload sent from the Storefront to POST /cart/items */
export interface AddToCartInput {
  product_id: string;
  quantity: number;
  selected_option_value_ids: string[];
  upload_id: string;
  preview_url: string;
  orientation: PrintOrientation;
  crop: CropData;
  rotation: number;
  zoom: number;
  effective_dpi: number;
  print_quality_status: PrintQualityStatus;
  /** Must be true when print_quality_status is LOW_QUALITY or NOT_RECOMMENDED */
  dpi_acknowledged: boolean;
}

export interface CheckoutInitInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface CheckoutInitResponse {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface OrderStatusResponse {
  order_id: string;
  status: OrderStatus;
  created_at: string;
}
