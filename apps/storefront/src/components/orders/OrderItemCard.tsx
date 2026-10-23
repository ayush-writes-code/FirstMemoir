'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CustomerOrderItemDTO } from '@repo/shared';
import { Package } from 'lucide-react';

export function OrderItemCard({ item }: { item: CustomerOrderItemDTO }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.print_asset_url || item.preview_url;
  const unitPrice = Number(item.unit_price || 0);
  const lineTotal = unitPrice * item.quantity;

  const summary = item.customization_summary;
  const dimensions =
    summary?.physical_width && summary?.physical_height
      ? `${summary.physical_width} × ${summary.physical_height} ${summary.physical_dimension_unit || 'in'}`
      : null;

  const frameInfo = summary?.frame_color || summary?.frame_material || summary?.frame;
  const matInfo = summary?.mat_color || summary?.mat_size ? `Mat: ${summary.mat_size || 'Standard'}` : null;
  const finishInfo = summary?.finish || summary?.paper_type;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 border-b border-paper-border last:border-0">
      {/* Left: Thumbnail & Details */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-paper-warm rounded-xl overflow-hidden shrink-0 border border-paper-border">
          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={item.product_name}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-2 text-center bg-zinc-50">
              <Package size={22} className="opacity-40 text-ink mb-1" />
              <span className="text-[10px] font-medium text-zinc-500">Print</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="font-serif font-medium text-base text-ink line-clamp-1">
            {item.product_name}
          </h3>

          {/* Customization Details */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
            {dimensions && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-paper-warm border border-paper-border font-medium text-ink">
                {dimensions}
              </span>
            )}
            {frameInfo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/60 text-zinc-600 capitalize">
                Frame: {frameInfo}
              </span>
            )}
            {matInfo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/60 text-zinc-600">
                {matInfo}
              </span>
            )}
            {finishInfo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/60 text-zinc-600 capitalize">
                {finishInfo}
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-2 pt-0.5">
            <span>₹{unitPrice.toLocaleString('en-IN')} each</span>
            <span className="text-zinc-300">•</span>
            <span className="font-medium text-zinc-700">Qty: {item.quantity}</span>
          </div>
        </div>
      </div>

      {/* Right: Line Total */}
      <div className="sm:text-right shrink-0 self-end sm:self-center">
        <p className="text-xs text-zinc-500 font-medium sm:mb-0.5">Line Total</p>
        <p className="text-base font-semibold text-ink">
          ₹{lineTotal.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}

