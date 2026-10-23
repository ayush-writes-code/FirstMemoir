'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { orders as ordersApi } from '@/lib/api-client';
import { CustomerOrderSummaryDTO } from '@repo/shared';
import { OrderCard } from '@/components/orders/OrderCard';
import {
  PackageOpen,
  AlertCircle,
  RefreshCw,
  LogIn,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/store/auth.context';

export default function OrdersPage() {
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

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
        if (typeof total === 'number') {
          setTotalCount(total);
        }
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
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [fetchOrders, isAuthenticated]);

  // Loading Skeletons State
  if (isLoading || isAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-paper-border">
          <div className="h-7 w-40 bg-paper-warm rounded animate-pulse" />
          <div className="h-4 w-24 bg-paper-warm rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-paper-border rounded-2xl p-6 animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-paper-warm" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-paper-warm rounded" />
                  <div className="h-3.5 w-48 bg-paper-warm rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-paper-warm rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle session expiration or unauthenticated state
  if (!isAuthenticated || error === 'Session expired') {
    return (
      <div className="bg-white border border-paper-border rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 bg-paper-warm rounded-2xl border border-paper-border flex items-center justify-center text-ink mb-4">
          <LogIn size={26} strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-serif font-medium text-ink mb-2">Sign in to view orders</h2>
        <p className="text-zinc-500 text-xs sm:text-sm mb-6 max-w-sm leading-relaxed">
          Please sign in to access your order history, live framing status, and invoices.
        </p>
        <button
          type="button"
          onClick={login}
          className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-xs"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50/70 border border-red-200/80 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchOrders()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-xs"
        >
          <RefreshCw size={14} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Empty State
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white border border-paper-border rounded-2xl p-10 sm:p-16 flex flex-col items-center text-center shadow-xs">
        <div className="w-16 h-16 bg-paper-warm border border-paper-border rounded-2xl flex items-center justify-center text-ink mb-4">
          <PackageOpen size={30} strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-serif font-medium text-ink mb-2">No orders placed yet</h2>
        <p className="text-zinc-500 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Your custom framed prints and photo memories will appear here once you complete checkout. If you checked out as a guest, you can also track by phone number.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-xs"
          >
            <span>Start Creating</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/track-order"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper-warm border border-paper-border rounded-xl text-sm font-medium text-ink hover:border-brand/40 transition-colors"
          >
            <Search size={15} className="text-zinc-500" />
            <span>Track Guest Order</span>
          </Link>
        </div>
      </div>
    );
  }

  // Populated Orders List
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-paper-border">
        <div>
          <h1 className="text-2xl font-serif font-medium text-ink">Order History</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Track and review all prints crafted by our studio
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-zinc-500 bg-paper-warm px-3 py-1 rounded-full border border-paper-border self-start sm:self-center">
          {totalCount !== null ? `${totalCount} Total` : `${orders.length} Shown`}
        </span>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-6 border-t border-paper-border">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-paper-border rounded-xl text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-warm transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span className="text-xs sm:text-sm font-mono font-medium text-zinc-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-paper-border rounded-xl text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-warm transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

