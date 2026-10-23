'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import {
  resolveCanonicalCartImageUrl,
  resolveProductPageHref,
  type CartImageResolvable
} from '@/utils/cart-image';

interface CartItemThumbnailProps {
  item: CartImageResolvable;
  className?: string;
}

export function CartItemThumbnail({ item, className = '' }: CartItemThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = resolveCanonicalCartImageUrl(item);
  const productHref = resolveProductPageHref(item);
  const altText = item.product_name || 'Product thumbnail';

  return (
    <div
      className={`w-24 h-24 md:w-28 md:h-28 bg-canvas-warm rounded-xl overflow-hidden shrink-0 border border-editorial-border/90 relative group ${className}`}
    >
      <Link
        href={productHref}
        className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 rounded-xl"
        tabIndex={0}
        aria-label={`View ${item.product_name || 'product'}`}
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={altText}
            width={128}
            height={128}
            unoptimized={imageUrl.startsWith('data:')}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted p-2 text-center bg-surface-soft">
            <Package size={24} className="mb-1 opacity-40 text-ink" />
            <span className="text-[11px] font-medium text-muted">Wall Art</span>
          </div>
        )}
      </Link>
    </div>
  );
}
