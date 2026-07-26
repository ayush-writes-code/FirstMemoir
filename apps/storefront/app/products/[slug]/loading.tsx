export default function Loading() {
  return (
    <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        {/* Left Column - Gallery Skeleton */}
        <div className="w-full lg:w-3/5">
          <div className="w-full aspect-square bg-surface-soft rounded-card animate-pulse"></div>
          <div className="flex gap-4 mt-4">
            <div className="w-20 h-20 bg-surface-soft rounded-card animate-pulse"></div>
            <div className="w-20 h-20 bg-surface-soft rounded-card animate-pulse"></div>
            <div className="w-20 h-20 bg-surface-soft rounded-card animate-pulse"></div>
            <div className="w-20 h-20 bg-surface-soft rounded-card animate-pulse"></div>
          </div>
        </div>

        {/* Right Column - Buy Box Skeleton */}
        <div className="w-full lg:w-2/5 space-y-6">
          <div className="h-4 bg-surface-soft w-32 rounded animate-pulse"></div>
          
          <div className="space-y-2">
            <div className="h-10 bg-surface-soft w-3/4 rounded animate-pulse"></div>
            <div className="h-8 bg-surface-soft w-1/3 rounded animate-pulse"></div>
          </div>
          
          <div className="border-t border-hairline my-6"></div>
          
          <div className="space-y-3">
            <div className="h-5 bg-surface-soft w-24 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-surface-soft rounded-card animate-pulse"></div>
              <div className="h-16 bg-surface-soft rounded-card animate-pulse"></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-5 bg-surface-soft w-24 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-surface-soft rounded-card animate-pulse"></div>
              <div className="h-16 bg-surface-soft rounded-card animate-pulse"></div>
            </div>
          </div>

          <div className="h-12 bg-surface-soft rounded-pill animate-pulse mt-8"></div>
        </div>
      </div>
    </div>
  );
}
