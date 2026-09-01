'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error('Storefront Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center bg-canvas">
      <div className="max-w-md w-full space-y-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-600 mb-6">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-serif text-ink tracking-tight">Something went wrong</h2>
        <p className="text-ink/70 text-base mb-8">
          We're sorry, but we encountered an unexpected error while loading this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-brand-orange text-white rounded-md font-medium hover:bg-brand-orange/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-ink/5 text-ink rounded-md font-medium hover:bg-ink/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
