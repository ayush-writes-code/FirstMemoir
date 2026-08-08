'use client';

import type { ProductDto } from '@repo/api-client';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';

export function ProductCard({ product }: { product: ProductDto }) {
  const mainImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800';
  
  return (
    <Link href={`/products/${product.slug}`} className="group block bg-canvas relative">
      <div className="relative aspect-square rounded-card overflow-hidden bg-surface-soft">
        <Image 
          src={mainImage} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button 
          aria-label="Add to wishlist" 
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center border border-hairline hover:text-brand transition-colors z-10"
          onClick={(e) => { e.preventDefault(); }}
        >
          <Heart size={16} />
        </button>
      </div>
      <div className="mt-2">
        <h3 className="line-clamp-2 text-sm text-ink">{product.name}</h3>
        <p className="text-base font-medium text-ink mt-1">₹{Number(product.base_price).toLocaleString('en-IN')}</p>
      </div>
    </Link>
  );
}
