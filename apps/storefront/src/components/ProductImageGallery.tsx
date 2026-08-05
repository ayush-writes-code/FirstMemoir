'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ProductImageDto } from '@repo/api-client';

export function ProductImageGallery({ images, productName }: { images: ProductImageDto[], productName: string }) {
  const defaultImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200';
  const hasImages = images && images.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const mainImage = hasImages ? images[selectedIndex]?.url || defaultImageUrl : defaultImageUrl;
  const mainAlt = hasImages ? (images[selectedIndex]?.alt_text || productName) : productName;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-square rounded-card overflow-hidden bg-surface-soft border border-hairline">
        <Image 
          src={mainImage} 
          alt={mainAlt} 
          fill 
          priority
          className="object-cover"
        />
      </div>
      
      {hasImages && images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, idx) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-card overflow-hidden border-2 transition-colors ${
                selectedIndex === idx ? 'border-brand' : 'border-transparent hover:border-border-strong'
              }`}
            >
              <Image 
                src={image.url} 
                alt={image.alt_text || `${productName} thumbnail ${idx + 1}`} 
                fill 
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
