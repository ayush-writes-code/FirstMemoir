export function ProductCardSkeleton() {
  return (
    <div className="block bg-transparent">
      <div className="aspect-square rounded-card bg-surface-soft border border-editorial-border/60 animate-pulse" />
      <div className="mt-3.5 space-y-2">
        <div className="h-2.5 bg-surface-soft rounded w-1/4 animate-pulse" />
        <div className="h-4 bg-surface-soft rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-surface-soft rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
}
