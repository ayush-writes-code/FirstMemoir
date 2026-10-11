'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { ProductImageDto } from '@/lib/api-client';
import { ProductLivePreview } from './ProductLivePreview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProductImageGallery({ images, productName, productSlug, mockupMetadata }: { images: ProductImageDto[], productName: string, productSlug: string, mockupMetadata?: any }) {
  const defaultImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200';
  const hasImages = images && images.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const mainImageDto = hasImages ? images[selectedIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-square rounded-card overflow-hidden bg-surface-soft border border-hairline">
        {mainImageDto ? (
          <ProductLivePreview 
            baseImage={mainImageDto} 
            productSlug={productSlug} 
            productName={productName}
            mockupMetadata={mockupMetadata}
          />
        ) : (
          <Image 
            src={defaultImageUrl} 
            alt={productName} 
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        )}
      </div>
      
      {hasImages && images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, idx) => (
            <GalleryThumbnail
              key={image.id}
              image={image}
              productName={productName}
              index={idx}
              isSelected={selectedIndex === idx}
              onClick={() => setSelectedIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryThumbnail({
  image,
  productName,
  index,
  isSelected,
  onClick,
}: {
  image: ProductImageDto;
  productName: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [src, setSrc] = useState(image.url || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800');

  return (
    <button
      onClick={onClick}
      className={`relative w-20 h-20 flex-shrink-0 rounded-card overflow-hidden border-2 transition-colors ${
        isSelected ? 'border-brand' : 'border-transparent hover:border-border-strong'
      }`}
    >
      <Image
        src={src}
        alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
        fill
        sizes="80px"
        className="object-cover"
        onError={() => setSrc('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800')}
      />
    </button>
  );
}
