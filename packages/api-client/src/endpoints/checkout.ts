import { fetchClient } from '../client';
import type { ApiResponse, CheckoutInitInput, CheckoutInitResponse } from '../types';

/**
 * Initialize checkout for the current cart session.
 * Backend recalculates all prices and creates an immutable Order snapshot.
 * Returns the Razorpay Order ID for the payment modal.
 */
export const initializeCheckout = (
  input: CheckoutInitInput
): Promise<ApiResponse<CheckoutInitResponse>> => {
  return fetchClient<CheckoutInitResponse>('/checkout/initialize', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};
