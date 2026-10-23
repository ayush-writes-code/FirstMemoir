import { fetchClient } from '../client';
import type { AdminMetricsResponse, AdminNotificationsResponse } from '../types';

export const getMetrics = async () => {
  return fetchClient<AdminMetricsResponse>('/admin/metrics');
};

export const getNotifications = async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return fetchClient<AdminNotificationsResponse>(`/admin/notifications${queryString}`);
};

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  payment_status?: string;
  search?: string;
}

export interface ListOrdersResponse {
  orders: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrderDetailResponse {
  order: any;
  fulfillmentDataComplete: boolean;
  missingFields: string[];
  shiprocketStatus?: {
    isConfigured: boolean;
    isDryRun: boolean;
  };
}

export const listOrders = async (params?: ListOrdersParams) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.payment_status && params.payment_status !== 'ALL') query.append('payment_status', params.payment_status);
  if (params?.search && params.search.trim()) query.append('search', params.search.trim());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return fetchClient<ListOrdersResponse>(`/admin/orders${queryString}`);
};

export const getOrderDetail = async (id: string) => {
  return fetchClient<OrderDetailResponse>(`/admin/orders/${id}`);
};

export const processOrder = async (id: string) => {
  return fetchClient<any>(`/admin/orders/${id}/process`, {
    method: 'POST',
  });
};

export const completeProduction = async (id: string) => {
  return fetchClient<any>(`/admin/orders/${id}/complete-production`, {
    method: 'POST',
  });
};

export const generateAwb = async (id: string) => {
  return fetchClient<any>(`/admin/orders/${id}/shiprocket/awb`, {
    method: 'POST',
  });
};
export const getManufacturingQueue = async () => {
  return fetchClient<any[]>(`/admin/manufacturing/items`);
};

export const downloadMasterAsset = async (orderId: string, itemId: string) => {
  return fetchClient<{ url: string }>(`/admin/orders/${orderId}/items/${itemId}/download-asset`);
};
