import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center bg-canvas">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-5xl font-serif text-brand-orange tracking-tight">404</h2>
        <h3 className="text-2xl font-serif text-ink tracking-tight mt-4">Page Not Found</h3>
        <p className="text-ink/70 text-base mb-8 mt-2">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex px-8 py-3 bg-brand-orange text-white rounded-md font-medium hover:bg-brand-orange/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange"
        >
          Return to Catalog
        </Link>
      </div>
    </div>
  );
}
