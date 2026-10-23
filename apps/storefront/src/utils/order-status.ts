/**
 * Authoritative Order Status Mapping & Styling Utilities
 */

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface OrderStatusBadgeInfo {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const ORDER_STATUS_MAP: Record<string, OrderStatusBadgeInfo> = {
  PENDING: {
    label: 'Payment Pending',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Order Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  },
  PROCESSING: {
    label: 'In Production',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
    dotClass: 'bg-sky-500',
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
    dotClass: 'bg-purple-500',
  },
  SHIPPED: {
    label: 'Dispatched',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    dotClass: 'bg-indigo-500',
  },
  DELIVERED: {
    label: 'Delivered',
    badgeClass: 'bg-green-50 text-green-800 border-green-200/80',
    dotClass: 'bg-green-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
    dotClass: 'bg-red-500',
  },
  REFUNDED: {
    label: 'Refunded',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dotClass: 'bg-rose-500',
  },
  EXPIRED: {
    label: 'Session Expired',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200/80',
    dotClass: 'bg-zinc-400',
  },
};

export function getOrderStatusBadge(status: string): OrderStatusBadgeInfo {
  const normalized = (status || '').toUpperCase().trim();
  return ORDER_STATUS_MAP[normalized] || {
    label: normalized.replace(/_/g, ' ') || 'Unknown',
    badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    dotClass: 'bg-zinc-400',
  };
}

export function formatOrderDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatOrderDateTime(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
