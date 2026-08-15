import { fetchClient } from '../client';
import type { ApiResponse, OrderStatusResponse } from '../types';

export const getOrderStatus = (orderId: string): Promise<ApiResponse<OrderStatusResponse>> => {
  return fetchClient<OrderStatusResponse>(`/orders/${orderId}/status`, {
    method: 'GET',
  });
};
