import { fetchClient } from '../client';
import type { ApiResponse, PaginatedApiResponse, OrderStatusResponse } from '../types';
import type { CustomerOrderSummaryDTO, CustomerOrderDetailDTO, GuestTrackOrderInput, GuestTrackOrderResponseDTO } from '@repo/shared';

export const getOrderStatus = (orderId: string): Promise<ApiResponse<OrderStatusResponse>> => {
  return fetchClient<OrderStatusResponse>(`/orders/${orderId}/status`, {
    method: 'GET',
  });
};

export const getMyOrders = (page: number = 1, limit: number = 10): Promise<PaginatedApiResponse<CustomerOrderSummaryDTO>> => {
  return fetchClient<CustomerOrderSummaryDTO[]>(`/orders/my-orders?page=${page}&limit=${limit}`, {
    method: 'GET',
  }) as Promise<PaginatedApiResponse<CustomerOrderSummaryDTO>>;
};

export const getOrderDetail = (orderId: string): Promise<ApiResponse<CustomerOrderDetailDTO>> => {
  return fetchClient<CustomerOrderDetailDTO>(`/orders/${orderId}`, {
    method: 'GET',
  });
};

export const trackGuestOrder = (input: GuestTrackOrderInput): Promise<ApiResponse<GuestTrackOrderResponseDTO>> => {
  return fetchClient<GuestTrackOrderResponseDTO>(`/orders/track`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
};
