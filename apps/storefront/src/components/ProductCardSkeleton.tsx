export function ProductCardSkeleton() {
  return (
    <div className="block bg-canvas">
      <div className="aspect-square rounded-card bg-surface-soft animate-pulse"></div>
      <div className="mt-2 space-y-2">
        <div className="h-4 bg-surface-soft rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-surface-soft rounded w-1/2 animate-pulse"></div>
        <div className="h-5 bg-surface-soft rounded w-1/4 mt-1 animate-pulse"></div>
      </div>
    </div>
  );
}
