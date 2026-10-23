'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { orders as ordersApi } from '@/lib/api-client';
import { GuestTrackOrderResponseDTO } from '@repo/shared';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import {
  Search,
  Package,
  AlertCircle,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getOrderStatusBadge, formatOrderDate } from '@/utils/order-status';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<GuestTrackOrderResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderId.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanId) {
      setError('Please enter your Order ID');
      return;
    }

    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    setError('');
    setOrder(null);

    const formattedPhone = `+91${cleanPhone.slice(-10)}`;

    try {
      const res = await ordersApi.trackGuestOrder({
        order_id: cleanId,
        phone_number: formattedPhone,
      });

      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(
          res.error ||
            'Order not found. Please verify your Order ID and 10-digit phone number, then try again.'
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to look up order details at this moment. Please try again shortly.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = order ? getOrderStatusBadge(order.status) : null;
  const orderRef = order ? order.id.slice(0, 8).toUpperCase() : '';
  const formattedDate = order ? formatOrderDate(order.created_at) : '';

  return (
    <div className="min-h-screen bg-canvas-warm py-10 sm:py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Kicker */}
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-semibold tracking-wider text-brand uppercase">
            Artisan Workshop &bull; Dispatch Tracker
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-ink tracking-tight">
            Track Your Shipment
          </h1>
          <p className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
            Follow the live status of your custom framing, packaging, and nationwide courier delivery without signing in.
          </p>
        </div>

        {/* Tracking Search Card */}
        <div className="bg-white rounded-2xl border border-paper-border shadow-card p-6 sm:p-8">
          <form onSubmit={handleTrack} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order ID Input */}
              <div>
                <label
                  htmlFor="orderId"
                  className="block text-xs font-mono uppercase tracking-wider text-zinc-600 font-semibold mb-1.5"
                >
                  Order ID
                </label>
                <input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-..."
                  className="w-full px-4 py-3 text-sm bg-paper-warm border border-paper-border rounded-xl focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none font-mono transition-all text-ink placeholder:text-zinc-400"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Found in your order confirmation SMS or WhatsApp
                </span>
              </div>

              {/* Phone Input */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-mono uppercase tracking-wider text-zinc-600 font-semibold mb-1.5"
                >
                  Registered Mobile
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-zinc-500">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 text-sm bg-paper-warm border border-paper-border rounded-xl focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none font-mono transition-all text-ink placeholder:text-zinc-400"
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  The mobile number provided at checkout
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50/70 border border-red-200/80 rounded-xl flex items-start gap-3 text-xs sm:text-sm text-red-800">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck size={14} className="text-brand shrink-0" />
                <span>Verification protects customer privacy</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !orderId.trim() || phone.replace(/\D/g, '').length < 10}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Locating Order...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Track Order</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tracking Results */}
        {order && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-paper-border shadow-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-paper-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      Order
                    </span>
                    <h2 className="text-2xl font-serif font-medium text-ink">
                      #{orderRef}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-500">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar size={13} className="text-zinc-400" />
                      Placed {formattedDate}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="font-semibold text-ink">
                      Total: ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {statusBadge && (
                  <div className="self-start sm:self-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotClass}`} />
                      {statusBadge.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Order Status Timeline */}
              <OrderStatusTimeline
                currentStatus={order.status}
                history={order.status_history}
              />
            </div>

            {/* Items Included Card */}
            <div className="bg-white rounded-2xl border border-paper-border shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-paper-border bg-paper-warm/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-brand" />
                  <h3 className="font-serif font-medium text-base text-ink">
                    Items in Shipment
                  </h3>
                </div>
                <span className="text-xs font-mono font-medium text-zinc-500">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="divide-y divide-paper-border p-6">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-paper-warm border border-paper-border flex items-center justify-center text-ink shrink-0">
                        <Sparkles size={16} className="text-brand" />
                      </div>
                      <p className="text-sm font-medium text-ink">
                        {item.product_name}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-zinc-500 bg-paper-warm px-2.5 py-1 rounded-md border border-paper-border shrink-0">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Help & Sign In Prompt */}
        <div className="bg-paper-warm/80 border border-paper-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-zinc-600 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-ink">Looking for full order history & invoices?</p>
            <p className="text-zinc-500 text-xs">
              Sign in with your mobile OTP to view all past orders, customize profiles, and download GST receipts.
            </p>
          </div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-paper-border text-ink rounded-xl text-xs font-semibold hover:border-brand/40 transition-colors shadow-xs shrink-0"
          >
            <span>Customer Sign In</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

