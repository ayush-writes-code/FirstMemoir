'use client';

import React from 'react';
import Link from 'next/link';
import { CustomerOrderSummaryDTO } from '@repo/shared';
import { Package, ChevronRight } from 'lucide-react';

export function OrderCard({ order }: { order: CustomerOrderSummaryDTO }) {
  const date = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <Link 
      href={`/account/orders/${order.id}`}
      className="block bg-white border border-zinc-200 rounded-xl p-5 hover:border-black transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-500">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">
              Order <span className="font-medium text-black">#{order.id.slice(-8).toUpperCase()}</span>
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
              <span className="text-zinc-300">•</span>
              <p className="text-sm text-zinc-600">{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</p>
              <span className="text-zinc-300">•</span>
              <p className="text-sm text-zinc-600">{date}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          <ChevronRight size={20} className="text-zinc-400 group-hover:text-black transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
    case 'PROCESSING': return 'bg-purple-100 text-purple-800';
    case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
    case 'DELIVERED': return 'bg-green-100 text-green-800';
    case 'CANCELLED': 
    case 'EXPIRED': return 'bg-red-100 text-red-800';
    default: return 'bg-zinc-100 text-zinc-800';
  }
}
