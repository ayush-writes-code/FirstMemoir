import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';

export default function Loading() {
  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-12 min-h-screen">
      <div className="mb-8 space-y-2">
        <div className="h-8 bg-surface-soft w-48 rounded animate-pulse"></div>
        <div className="h-4 bg-surface-soft w-24 rounded animate-pulse"></div>
      </div>

      <div className="flex gap-2 mb-8">
        <div className="h-10 bg-surface-soft w-16 rounded-pill animate-pulse"></div>
        <div className="h-10 bg-surface-soft w-24 rounded-pill animate-pulse"></div>
        <div className="h-10 bg-surface-soft w-32 rounded-pill animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
