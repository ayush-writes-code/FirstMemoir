'use client';

import React, { useEffect, useState } from 'react';
import { orders as ordersApi } from '@/lib/api-client';
import { CustomerOrderDetailDTO } from '@repo/shared';
import { OrderItemCard } from '@/components/orders/OrderItemCard';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import Link from 'next/link';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Receipt,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { getOrderStatusBadge, formatOrderDateTime } from '@/utils/order-status';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<CustomerOrderDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedAwb, setCopiedAwb] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setIsLoading(true);
        setError('');
        const res = await ordersApi.getOrderDetail(orderId);
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError(res.error || 'Order not found');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading order details');
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleCopyAwb = (awb: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(awb);
      setCopiedAwb(true);
      setTimeout(() => setCopiedAwb(false), 2000);
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-paper-warm rounded" />
        <div className="h-10 w-64 bg-paper-warm rounded" />
        <div className="h-48 bg-white border border-paper-border rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-white border border-paper-border rounded-2xl" />
          <div className="h-64 bg-white border border-paper-border rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to All Orders</span>
        </Link>
        <div className="bg-red-50/70 border border-red-200/80 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800">
              {error || 'Unable to locate order details'}
            </p>
          </div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-xs"
          >
            <span>Return to Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getOrderStatusBadge(order.status);
  const formattedDateTime = formatOrderDateTime(order.created_at);
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const subtotal = Number(order.subtotal_amount || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const taxAmount = Number(order.tax_amount || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const totalAmount = Number(order.total_amount || 0);

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-ink transition-colors mb-4 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to Order History</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-paper-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                Order
              </span>
              <h1 className="text-2xl font-serif font-medium text-ink">
                #{orderRef}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-1">
              Placed on {formattedDateTime}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}`} />
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Courier AWB Banner (If dispatched/tracking available) */}
      {order.tracking_awb && (
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Truck size={20} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-indigo-600 font-semibold">
                Courier Consignment Number
              </p>
              <p className="text-sm sm:text-base font-mono font-bold text-indigo-950 mt-0.5">
                AWB: {order.tracking_awb}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyAwb(order.tracking_awb!)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-xl text-xs font-medium hover:bg-indigo-50 transition-colors shadow-xs"
          >
            {copiedAwb ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Consignment No.</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Order Status & Artisan Production Timeline */}
      <div className="bg-white border border-paper-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <OrderStatusTimeline
          currentStatus={order.status}
          history={order.status_history}
        />
      </div>

      {/* Main Content Grid: Items (Left) + Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-paper-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-paper-border bg-paper-warm/50 flex items-center justify-between">
              <h2 className="font-serif font-medium text-base text-ink">
                Custom Prints in Order
              </h2>
              <span className="text-xs font-mono font-medium text-zinc-500">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="p-6 divide-y divide-paper-border">
              {order.items.map((item) => (
                <OrderItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* Customer Order Notes (If provided) */}
          {order.notes && (
            <div className="bg-white border border-paper-border rounded-2xl p-6 shadow-xs">
              <h3 className="font-serif font-medium text-sm text-ink mb-1">
                Order Instructions
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 italic">
                &ldquo;{order.notes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary & Shipping Address */}
        <div className="space-y-6">
          {/* Order Financial Summary */}
          <div className="bg-white border border-paper-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-paper-border bg-paper-warm/50 flex items-center gap-2">
              <Receipt size={16} className="text-brand" />
              <h2 className="font-serif font-medium text-base text-ink">
                Payment Summary
              </h2>
            </div>
            <div className="p-6 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-medium text-ink font-mono">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount</span>
                  <span className="font-medium font-mono">
                    -₹{discountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600">
                <span>Insured Nationwide Shipping</span>
                <span className="font-medium text-ink">
                  {shippingFee === 0 ? 'Complimentary' : `₹${shippingFee.toLocaleString('en-IN')}`}
                </span>
              </div>

              <div className="flex justify-between text-zinc-600">
                <span>Estimated GST (18%)</span>
                <span className="font-medium text-ink font-mono">
                  ₹{taxAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3 border-t border-paper-border flex justify-between items-baseline font-semibold text-base sm:text-lg text-ink">
                <span className="font-serif">Total Paid</span>
                <span className="font-mono text-brand">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Destination */}
          <div className="bg-white border border-paper-border rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-paper-border bg-paper-warm/50 flex items-center gap-2">
              <MapPin size={16} className="text-brand" />
              <h2 className="font-serif font-medium text-base text-ink">
                Delivery Address
              </h2>
            </div>
            <div className="p-6 text-xs sm:text-sm text-zinc-600 space-y-1">
              <p className="font-semibold text-ink text-sm sm:text-base">
                {order.shipping_address?.name || 'Customer'}
              </p>
              <p>{order.shipping_address?.line1}</p>
              {order.shipping_address?.line2 && (
                <p>{order.shipping_address.line2}</p>
              )}
              <p>
                {order.shipping_address?.city}, {order.shipping_address?.state}{' '}
                <span className="font-mono font-medium text-ink">
                  {order.shipping_address?.postal_code}
                </span>
              </p>
              {order.shipping_address?.phone && (
                <p className="pt-2 text-zinc-500 font-mono text-xs">
                  Phone: {order.shipping_address.phone}
                </p>
              )}
            </div>
          </div>

          {/* Concierge Assistance Card */}
          <div className="bg-paper-warm/70 border border-paper-border rounded-2xl p-5 space-y-2 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <HelpCircle size={15} className="text-brand" />
              <span>Need Assistance?</span>
            </div>
            <p className="leading-relaxed">
              If you have any questions regarding your custom print, framing, or delivery schedule, contact our artisan support.
            </p>
            <a
              href="mailto:support@firstmemoir.com"
              className="inline-block pt-1 font-semibold text-brand hover:underline"
            >
              support@firstmemoir.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

