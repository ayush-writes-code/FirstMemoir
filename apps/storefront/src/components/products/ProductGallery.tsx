'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: {
    id: string;
    url: string;
    alt_text: string;
  }[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[4/5] md:aspect-square bg-surface-soft flex items-center justify-center rounded-sm">
        <span className="text-muted-soft">No image available</span>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col md:flex-row-reverse gap-4 md:gap-6">
      {/* Main Image */}
      <div className="flex-1 relative aspect-[4/5] md:aspect-square bg-surface-soft rounded-sm overflow-hidden">
        {activeImage ? (
          <Image
            src={activeImage.url}
            alt={activeImage.alt_text || 'Product image'}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-soft">Image not found</span>
          </div>
        )}
      </div>

      {/* Thumbnails (Only show if > 1 image) */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto scrollbar-hide w-full md:w-20 lg:w-24 shrink-0">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative aspect-square w-20 md:w-full shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${
                activeIndex === idx ? 'border-ink' : 'border-transparent hover:border-border-strong'
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt_text || `Thumbnail ${idx + 1}`}
                fill
                sizes="100px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
