import React from 'react';
import Image from 'next/image';
import { CustomerOrderItemDTO } from '@repo/shared';

export function OrderItemCard({ item }: { item: CustomerOrderItemDTO }) {
  return (
    <div className="flex gap-4 py-4 border-b border-zinc-100 last:border-0">
      <div className="relative w-24 h-24 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.print_asset_url || item.preview_url ? (
          <Image
            src={item.print_asset_url || item.preview_url}
            alt={item.product_name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            No Image
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-medium text-black">{item.product_name}</h3>
          
          <div className="mt-1 text-sm text-zinc-500 space-y-0.5">
            {item.customization_summary && (
              <>
                <p>Size: {item.customization_summary.physical_width}x{item.customization_summary.physical_height} {item.customization_summary.physical_dimension_unit}</p>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-medium text-black">
            ₹{Number(item.unit_price).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-zinc-600">Qty: {item.quantity}</p>
        </div>
      </div>
    </div>
  );
}
