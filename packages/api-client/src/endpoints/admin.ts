import { fetchClient } from '../client';

export const listOrders = async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return fetchClient<{ orders: any[]; pagination: any }>(`/admin/orders${queryString}`);
};

export const getOrderDetail = async (id: string) => {
  return fetchClient<{ order: any; fulfillmentDataComplete: boolean; missingFields: string[] }>(`/admin/orders/${id}`);
};

export const processOrder = async (id: string) => {
  return fetchClient<any>(`/admin/orders/${id}/process`, {
    method: 'POST',
  });
};

export const generateAwb = async (id: string) => {
  return fetchClient<any>(`/admin/orders/${id}/shiprocket/awb`, {
    method: 'POST',
  });
};
