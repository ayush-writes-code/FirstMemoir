'use client';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductImageDto } from '@/lib/api-client';
import { ProductLivePreview } from './ProductLivePreview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProductImageGallery({ images, productName, productSlug, mockupMetadata }: { images: ProductImageDto[], productName: string, productSlug: string, mockupMetadata?: any }) {
  const defaultImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200';
  const hasImages = images && images.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const mainImageDto = hasImages ? images[selectedIndex] : null;

  const handlePrev = useCallback(() => {
    if (!hasImages) return;
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [hasImages, images?.length]);

  const handleNext = useCallback(() => {
    if (!hasImages) return;
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [hasImages, images?.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  return (
    <div className="flex flex-col gap-4">
      <div 
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`${productName} image gallery, viewing image ${selectedIndex + 1} of ${images?.length || 1}`}
        className="group relative w-full aspect-square rounded-2xl overflow-hidden bg-canvas-warm border border-editorial-border/80 shadow-gallery ring-1 ring-inset ring-black/[0.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
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

        {/* Gallery Edge Navigation Buttons */}
        {hasImages && images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous gallery image"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-ink-deep shadow-md flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 border border-editorial-border/80 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none z-10"
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next gallery image"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-ink-deep shadow-md flex items-center justify-center transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100 border border-editorial-border/80 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none z-10"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </button>

            {/* Position indicator pill */}
            <div className="absolute bottom-3.5 right-3.5 bg-[#18181A]/80 backdrop-blur-md text-white text-[11px] font-mono px-2.5 py-1 rounded-full shadow-sm z-10 pointer-events-none tracking-wider">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      
      {hasImages && images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
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

  useEffect(() => {
    if (image.url) setSrc(image.url);
  }, [image.url]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${productName} image ${index + 1}`}
      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-canvas-warm ring-1 ring-inset ring-black/[0.04] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
        isSelected 
          ? 'border-[#18181A] ring-2 ring-black/15 scale-[1.03]' 
          : 'border-editorial-border hover:border-ink/50 opacity-70 hover:opacity-100'
      }`}
    >
      <div className="relative w-full h-full rounded-[9px] overflow-hidden">
        <Image
          src={src}
          alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setSrc('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800')}
        />
      </div>
    </button>
  );
}

