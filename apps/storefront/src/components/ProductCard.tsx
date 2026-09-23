'use client';

import type { StorefrontProduct } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const mainImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800';
  
  return (
    <Link href={`/products/${product.slug}`} className="group block bg-canvas relative">
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface-soft">
        <Image 
          src={mainImage} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>
      <div className="mt-4 flex flex-col items-center text-center">
        <h3 className="line-clamp-2 text-sm font-medium text-ink tracking-wide">{product.name}</h3>
        {product.base_price && Number(product.base_price) > 0 ? (
          <p className="text-sm font-normal text-muted mt-1">₹{Number(product.base_price).toLocaleString('en-IN')}</p>
        ) : (
          <p className="text-sm font-normal text-muted-soft mt-1 italic">Price coming soon</p>
        )}
      </div>
    </Link>
  );
}
