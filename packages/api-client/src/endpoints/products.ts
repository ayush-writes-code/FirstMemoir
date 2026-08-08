import { fetchClient } from '../client';
import type { 
  ApiResponse, 
  PaginatedApiResponse,
  ProductDto, 
  ProductWithOptionsDto,
  CreateProductInput, 
  UpdateProductInput, 
  ProductImageDto,
  ProductOptionDto,
  ProductOptionValueDto,
  OptionExclusionDto,
  PricingBreakdown
} from '../types';

/**
 * Fetch a paginated list of products.
 */
export const getProducts = (options?: { category?: string; limit?: number; page?: number; sort?: string }): Promise<PaginatedApiResponse<ProductDto>> => {
  let url = '/products';
  if (options) {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.sort) params.append('sort', options.sort);
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return fetchClient<ProductDto[]>(url) as Promise<PaginatedApiResponse<ProductDto>>;
};

/**
 * Fetch a single product by its slug (unified route — accepts UUID or slug).
 */
export const getProductBySlug = (slug: string): Promise<ApiResponse<ProductWithOptionsDto>> => {
  return fetchClient<ProductWithOptionsDto>(`/products/${slug}`);
};

/**
 * Fetch a single product by ID (including options and exclusions).
 */
export const getProduct = (id: string): Promise<ApiResponse<ProductWithOptionsDto>> => {
  return fetchClient<ProductWithOptionsDto>(`/products/${id}`);
};

/**
 * Create a new product.
 * Requires name, base_price, and at least one category.
 */
export const createProduct = (input: CreateProductInput): Promise<ApiResponse<ProductDto>> => {
  return fetchClient<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Update an existing product by ID.
 * The slug cannot be updated.
 * The `category_ids` array will completely replace existing assignments.
 */
export const updateProduct = (id: string, input: UpdateProductInput): Promise<ApiResponse<ProductDto>> => {
  return fetchClient<ProductDto>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
};

/**
 * Delete a product by ID.
 * Returns 400 if the product has been ordered.
 * Returns 204 No Content on success; data will be null.
 */
export const deleteProduct = (id: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/products/${id}`, {
    method: 'DELETE',
  });
};

/**
 * Confirm a product image upload and save it to the product.
 */
export const confirmProductImage = (productId: string, input: { file_key: string; alt_text?: string }): Promise<ApiResponse<ProductImageDto>> => {
  return fetchClient<ProductImageDto>(`/products/${productId}/images/confirm`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Delete a product image.
 */
export const deleteProductImage = (productId: string, imageId: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
  });
};

/**
 * Reorder product images.
 */
export const reorderProductImages = (productId: string, imageIds: string[]): Promise<ApiResponse<ProductImageDto[]>> => {
  return fetchClient<ProductImageDto[]>(`/products/${productId}/images/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ image_ids: imageIds }),
  });
};

// --- Product Options & Variants ---

export const createProductOption = (productId: string, input: any): Promise<ApiResponse<ProductOptionDto>> => {
  return fetchClient<ProductOptionDto>(`/products/${productId}/options`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const createProductOptionValue = (productId: string, optionId: string, input: any): Promise<ApiResponse<ProductOptionValueDto>> => {
  return fetchClient<ProductOptionValueDto>(`/products/${productId}/options/${optionId}/values`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const deleteProductOption = (productId: string, optionId: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/products/${productId}/options/${optionId}`, {
    method: 'DELETE',
  });
};

export const deleteProductOptionValue = (productId: string, optionId: string, valueId: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/products/${productId}/options/${optionId}/values/${valueId}`, {
    method: 'DELETE',
  });
};

export const addOptionExclusion = (productId: string, input: { option_value_1_id: string, option_value_2_id: string }): Promise<ApiResponse<OptionExclusionDto>> => {
  return fetchClient<OptionExclusionDto>(`/products/${productId}/exclusions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const removeOptionExclusion = (productId: string, exclusionId: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/products/${productId}/exclusions/${exclusionId}`, {
    method: 'DELETE',
  });
};

export const calculatePrice = (productId: string, selectedOptionValueIds: string[]): Promise<ApiResponse<PricingBreakdown>> => {
  return fetchClient<PricingBreakdown>(`/products/${productId}/price`, {
    method: 'POST',
    body: JSON.stringify({ selected_option_value_ids: selectedOptionValueIds }),
  });
};

