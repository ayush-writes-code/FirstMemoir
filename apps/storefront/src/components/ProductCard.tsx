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
  const primaryCategory = product.categories?.[0]?.name;

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
      className="group block relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 rounded-card"
    >
      <div 
        className="relative aspect-square rounded-card overflow-hidden bg-canvas-warm border border-editorial-border/70 group-hover:border-editorial-border transition-colors duration-300"
        onTouchStart={hasMultiple ? handleTouchStart : undefined}
        onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
      >
        <Image
          src={imgSrc}
          alt={currentImage.alt_text || product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none"
          onError={() => {
            setFailedIndices((prev) => new Set(prev).add(activeIndex));
          }}
        />

        {/* Inset physical mounting perimeter */}
        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/[0.04] rounded-card" aria-hidden="true" />

        {/* Gallery navigation controls */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={`Previous image for ${product.name}`}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-md text-ink-deep hover:bg-white hover:text-brand shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-editorial-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand transition-all z-10"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={`Next image for ${product.name}`}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-md text-ink-deep hover:bg-white hover:text-brand shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-editorial-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand transition-all z-10"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {/* Subtle dot indicators */}
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 z-10 pointer-events-none">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === activeIndex
                      ? 'w-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]'
                      : 'w-1.5 bg-white/60 shadow-sm'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3.5 flex flex-col items-start text-left w-full">
        {primaryCategory && (
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-muted-soft mb-1 line-clamp-1">
            {primaryCategory}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm sm:text-[15px] font-medium text-ink-deep leading-snug group-hover:text-brand transition-colors duration-200">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          {product.base_price && Number(product.base_price) > 0 ? (
            <>
              <p className="text-sm sm:text-[15px] font-semibold text-ink-deep">
                ₹{Number(product.base_price).toLocaleString('en-IN')}
              </p>
              {product.is_provisional_price && (
                <span className="text-[10px] text-muted-soft font-normal uppercase tracking-wider bg-surface-soft px-1.5 py-0.5 rounded border border-hairline">
                  Est.
                </span>
              )}
            </>
          ) : (
            <p className="text-xs sm:text-sm font-normal text-muted-soft italic">
              Price coming soon
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
