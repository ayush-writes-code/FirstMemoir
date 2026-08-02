import { fetchClient } from '../client';
import type { ApiResponse, Product, CreateProductInput, UpdateProductInput, ProductImage } from '../types';

/**
 * Fetch a paginated list of products.
 */
export const getProducts = (options?: { category?: string; limit?: number; page?: number; sort?: string }): Promise<ApiResponse<Product[]>> => {
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
  
  // Notice we are returning the array directly instead of ProductsListResponse to match getCategories
  return fetchClient<Product[]>(url).then(res => {
    // Our fetchClient casts the T onto the response data, but because our backend returns
    // res.json(paginatedResponse(products, ...)), the 'data' field is the array.
    return res;
  });
};

/**
 * Fetch a single product by its slug.
 */
export const getProductBySlug = (slug: string): Promise<ApiResponse<{ product: Product; frameMaterials: any[] }>> => {
  return fetchClient<{ product: Product; frameMaterials: any[] }>(`/products/slug/${slug}`);
};

/**
 * Create a new product.
 * Requires name, base_price, and at least one category.
 */
export const createProduct = (input: CreateProductInput): Promise<ApiResponse<Product>> => {
  return fetchClient<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Update an existing product by ID.
 * The slug cannot be updated.
 * The `category_ids` array will completely replace existing assignments.
 */
export const updateProduct = (id: string, input: UpdateProductInput): Promise<ApiResponse<Product>> => {
  return fetchClient<Product>(`/products/${id}`, {
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
export const confirmProductImage = (productId: string, input: { file_key: string; alt_text?: string }): Promise<ApiResponse<ProductImage>> => {
  return fetchClient<ProductImage>(`/products/${productId}/images/confirm`, {
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
