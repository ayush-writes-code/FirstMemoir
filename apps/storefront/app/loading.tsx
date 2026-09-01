export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full">
        <div className="w-full h-8 bg-ink/5 animate-pulse rounded-md"></div>
        <div className="w-3/4 h-8 bg-ink/5 animate-pulse rounded-md"></div>
        <div className="w-1/2 h-8 bg-ink/5 animate-pulse rounded-md"></div>
      </div>
    </div>
  );
}
