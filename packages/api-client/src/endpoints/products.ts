import { fetchClient } from '../client';
import type { ProductDetailResponse, ProductsListResponse } from '../types';

export const getProducts = (options?: { category?: string; limit?: number; page?: number; sort?: string }): Promise<import('../types').ApiResponse<ProductsListResponse['products']>> => {
  let url = '/products';
  if (options) {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.limit) params.append('limit', options.limit.toString());
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return fetchClient(url);
};

export const getProductBySlug = (slug: string): Promise<import('../types').ApiResponse<ProductDetailResponse>> => {
  return fetchClient(`/products/${slug}`);
};
