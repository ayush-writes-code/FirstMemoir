import { fetchClient } from '../client';
import type { ApiResponse, Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

/**
 * Fetch all categories.
 * The API currently returns the full list without pagination.
 * The response envelope is pagination-compatible via the `meta` field.
 */
export const getCategories = (): Promise<ApiResponse<Category[]>> => {
  return fetchClient<Category[]>('/categories');
};

/**
 * Create a new category.
 * The backend generates the slug from `name`; do not pass a slug.
 * Throws 400 if the name already exists (case-insensitive).
 */
export const createCategory = (input: CreateCategoryInput): Promise<ApiResponse<Category>> => {
  return fetchClient<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Update an existing category by ID.
 * The slug is immutable and cannot be changed via this endpoint.
 */
export const updateCategory = (id: string, input: UpdateCategoryInput): Promise<ApiResponse<Category>> => {
  return fetchClient<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
};

/**
 * Delete a category by ID.
 * Returns 400 if the category has associated products.
 * Returns 204 No Content on success; data will be null.
 */
export const deleteCategory = (id: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/categories/${id}`, {
    method: 'DELETE',
  });
};
