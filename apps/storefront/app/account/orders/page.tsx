'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { orders as ordersApi } from '@/lib/api-client';
import { CustomerOrderSummaryDTO } from '@repo/shared';
import { OrderCard } from '@/components/orders/OrderCard';
import { PackageOpen, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/store/auth.context';

export default function OrdersPage() {
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await ordersApi.getMyOrders(page, 10);

      if (res.success && res.data) {
        // Normalize response whether it's wrapped in { orders: [...] } or a raw array
        const rawData: any = res.data;
        const normalizedOrders: CustomerOrderSummaryDTO[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.orders)
            ? rawData.orders
            : [];

        setOrders(normalizedOrders);

        // Normalize pagination
        const total = rawData?.pagination?.total ?? res.meta?.total;
        const limit = rawData?.pagination?.limit ?? res.meta?.limit ?? 10;
        if (typeof total === 'number' && typeof limit === 'number' && limit > 0) {
          setTotalPages(Math.max(1, Math.ceil(total / limit)));
        } else if (res.meta?.totalPages) {
          setTotalPages(res.meta.totalPages);
        }
      } else {
        setOrders([]);
        setError(res.error || 'Failed to load orders');
      }
    } catch (err: any) {
      setOrders([]);
      setError(err?.message || 'An error occurred while loading orders');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="w-8 h-8 border-3 border-zinc-200 border-t-brand rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  // Handle session expiration or unauthenticated state
  if (!isAuthenticated || error === 'Session expired') {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="w-14 h-14 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 mb-4">
          <LogIn size={26} strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-serif font-semibold text-ink mb-2">Sign in to view orders</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Please sign in to access your order history, live tracking, and invoices.
        </p>
        <button
          onClick={login}
          className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-sm"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-xs"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 mb-4">
          <PackageOpen size={30} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-serif font-semibold text-ink mb-2">No orders placed yet</h2>
        <p className="text-zinc-500 text-sm max-w-sm mb-6">
          Your custom framed prints and photo memories will appear here once you complete an order.
        </p>
        <Link
          href="/products"
          className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-sm"
        >
          Start Creating
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-ink">My Orders</h1>
        <span className="text-xs text-zinc-500 font-medium">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} shown
        </span>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-zinc-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
