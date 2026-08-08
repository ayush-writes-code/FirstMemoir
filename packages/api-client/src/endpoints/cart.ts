import { fetchClient } from '../client';
import type { ApiResponse, CartDto, AddToCartInput, CartLineItemDto } from '../types';

/**
 * Fetch the current cart for the session/user.
 */
export const getCart = (): Promise<ApiResponse<CartDto>> => {
  return fetchClient<CartDto>('/cart');
};

/**
 * Add a customized product to the cart.
 * Prices are never sent — the backend recalculates from selectedOptionValueIds.
 */
export const addToCart = (input: AddToCartInput): Promise<ApiResponse<CartLineItemDto>> => {
  return fetchClient<CartLineItemDto>('/cart/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

/**
 * Remove a line item from the cart.
 */
export const removeFromCart = (lineItemId: string): Promise<ApiResponse<null>> => {
  return fetchClient<null>(`/cart/items/${lineItemId}`, {
    method: 'DELETE',
  });
};

/**
 * Update quantity of a cart line item.
 */
export const updateCartItemQuantity = (lineItemId: string, quantity: number): Promise<ApiResponse<CartLineItemDto>> => {
  return fetchClient<CartLineItemDto>(`/cart/items/${lineItemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
};
