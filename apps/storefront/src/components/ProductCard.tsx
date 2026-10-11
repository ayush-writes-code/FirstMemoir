'use client';

import { useState } from 'react';
import type { StorefrontProduct } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800';

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const initialImage = product.images?.[0]?.url || FALLBACK_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialImage);
  
  return (
    <Link href={`/products/${product.slug}`} className="group block bg-canvas relative">
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface-soft">
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={() => {
            if (imgSrc !== FALLBACK_IMAGE) {
              setImgSrc(FALLBACK_IMAGE);
            }
          }}
        />
      </div>
      <div className="mt-4 flex flex-col items-center text-center">
        <h3 className="line-clamp-2 text-sm font-medium text-ink tracking-wide">{product.name}</h3>
        {product.base_price && Number(product.base_price) > 0 ? (
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-sm font-normal text-muted">₹{Number(product.base_price).toLocaleString('en-IN')}</p>
            {product.is_provisional_price && (
              <span className="text-[11px] text-amber-700/80 font-normal">(Est.)</span>
            )}
          </div>
        ) : (
          <p className="text-sm font-normal text-muted-soft mt-1 italic">Price coming soon</p>
        )}
      </div>
    </Link>
  );
}
