'use client';

import React from 'react';
import Link from 'next/link';
import { CustomerOrderSummaryDTO } from '@repo/shared';
import { Package, ChevronRight, Calendar, Layers } from 'lucide-react';
import { getOrderStatusBadge, formatOrderDate } from '@/utils/order-status';

export function OrderCard({ order }: { order: CustomerOrderSummaryDTO }) {
  const statusInfo = getOrderStatusBadge(order.status);
  const formattedDate = formatOrderDate(order.created_at);
  const orderRef = order.id.slice(0, 8).toUpperCase();

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="group block bg-white border border-paper-border rounded-2xl p-5 sm:p-6 transition-all duration-200 hover:border-brand/40 hover:shadow-card active:scale-[0.998]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon & Order Info */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center text-ink shrink-0 group-hover:text-brand group-hover:bg-brand/5 transition-colors">
            <Package size={22} strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold tracking-wider text-zinc-500 uppercase">
                Order
              </span>
              <span className="text-sm font-mono font-bold text-ink">
                #{orderRef}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-zinc-600">
              <span className="font-semibold text-ink">
                ₹{Number(order.total_amount).toLocaleString('en-IN')}
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Layers size={13} className="text-zinc-400" />
                {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <Calendar size={13} className="text-zinc-400" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status Pill & Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>
          <div className="flex items-center text-xs font-medium text-zinc-500 group-hover:text-brand transition-colors">
            <span className="hidden sm:inline mr-1">View Details</span>
            <ChevronRight
              size={18}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

