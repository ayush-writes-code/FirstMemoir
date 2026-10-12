'use client';

import { useState } from 'react';
import type { StorefrontProduct } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800';

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const images = product.images && product.images.length > 0
    ? product.images
    : [{ id: 'fallback', url: FALLBACK_IMAGE, alt_text: product.name, order: 0 }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const hasMultiple = images.length > 1;
  const currentImage = images[activeIndex] ?? images[0] ?? { id: 'fallback', url: FALLBACK_IMAGE, alt_text: product.name, order: 0 };
  const imgSrc = failedIndices.has(activeIndex) ? FALLBACK_IMAGE : currentImage.url;

  const handlePrev = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEnd = e.changedTouches[0];
    if (!touchEnd) return;
    const touchEndX = touchEnd.clientX;
    const diffX = touchStartX - touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      } else {
        setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
    }
    setTouchStartX(null);
  };

  return (
    <Link 
      href={`/products/${product.slug}`} 
      className="group block bg-canvas relative focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-card"
    >
      <div 
        className="relative aspect-square rounded-card overflow-hidden bg-surface-soft"
        onTouchStart={hasMultiple ? handleTouchStart : undefined}
        onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
      >
        <Image
          src={imgSrc}
          alt={currentImage.alt_text || product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none"
          onError={() => {
            setFailedIndices((prev) => new Set(prev).add(activeIndex));
          }}
        />

        {/* Gallery navigation controls */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={`Previous image for ${product.name}`}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-canvas/85 backdrop-blur-sm text-ink hover:bg-canvas shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={`Next image for ${product.name}`}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-canvas/85 backdrop-blur-sm text-ink hover:bg-canvas shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
            >
              <ChevronRight size={16} />
            </button>

            {/* Subtle dot indicators */}
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeIndex
                      ? 'w-4 bg-white shadow-sm'
                      : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
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
