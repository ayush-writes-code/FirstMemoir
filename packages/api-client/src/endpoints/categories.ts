import { fetchClient } from '../client';
import type { Category } from '../types';

export const getCategories = (): Promise<import('../types').ApiResponse<Category[]>> => {
  return fetchClient('/categories');
};
