'use client';

import React, { useState } from 'react';
import { orders as ordersApi } from '@/lib/api-client';
import { GuestTrackOrderResponseDTO } from '@repo/shared';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { Search, Package } from 'lucide-react';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<GuestTrackOrderResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !phone) {
      setError('Please provide both Order ID and Phone Number');
      return;
    }

    setIsLoading(true);
    setError('');
    setOrder(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    try {
      const res = await ordersApi.trackGuestOrder({
        order_id: orderId.trim(),
        phone_number: formattedPhone.trim(),
      });

      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.error || 'Order not found. Please check your details and try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold font-serif mb-4">Track Your Order</h1>
          <p className="text-zinc-600">Enter your order ID and phone number to see the current status of your shipment.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="orderId" className="block text-sm font-medium text-zinc-700 mb-1">
                  Order ID
                </label>
                <input
                  id="orderId"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., a1b2c3d4-..."
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone.replace(/^\+91/, '')}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isLoading || !orderId || phone.length < 10}
                  className="w-full md:w-auto px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search size={18} />
                      Track
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100 flex items-start gap-3">
                <div className="mt-0.5">
                  <Search size={18} />
                </div>
                {error}
              </div>
            )}
          </div>
        </div>

        {order && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="px-4 py-2 bg-zinc-50 rounded-lg border border-zinc-100 flex items-center gap-3">
                  <Package size={20} className="text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total</p>
                    <p className="font-bold">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <OrderStatusTimeline currentStatus={order.status} history={order.status_history} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2">
                <Package size={18} className="text-zinc-500" />
                <h3 className="font-semibold">Items in Order</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-4 px-6 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                    </div>
                    <p className="text-zinc-500 text-sm">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
