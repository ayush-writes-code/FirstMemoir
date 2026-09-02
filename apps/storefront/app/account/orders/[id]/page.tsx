'use client';

import React, { useEffect, useState } from 'react';
import { orders as ordersApi } from '@repo/api-client';
import { CustomerOrderDetailDTO } from '@repo/shared';
import { OrderItemCard } from '@/components/orders/OrderItemCard';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<CustomerOrderDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrder() {
      try {
        setIsLoading(true);
        const res = await ordersApi.getOrderDetail(orderId);
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError(res.error || 'Failed to load order details');
        }
      } catch {
        setError('An error occurred while loading order details');
      } finally {
        setIsLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
        {error || 'Order not found'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/account/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-black transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <OrderStatusTimeline currentStatus={order.status} history={order.status_history} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
              <h2 className="font-semibold">Items in Order</h2>
            </div>
            <div className="px-6">
              {order.items.map(item => (
                <OrderItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
              <h2 className="font-semibold">Order Summary</h2>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{Number(order.discount_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span>{Number(order.shipping_fee) === 0 ? 'Free' : `₹${Number(order.shipping_fee).toLocaleString('en-IN')}`}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Tax</span>
                <span>₹{Number(order.tax_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
              <h2 className="font-semibold">Shipping Address</h2>
            </div>
            <div className="p-6 text-sm text-zinc-600 space-y-1">
              <p className="font-medium text-black">{order.shipping_address?.name}</p>
              <p>{order.shipping_address?.line1}</p>
              {order.shipping_address?.line2 && <p>{order.shipping_address.line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
