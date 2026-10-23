import Link from 'next/link';

export function EmptyState({ 
  title, 
  description, 
  cta 
}: { 
  title: string; 
  description: string; 
  cta?: { label: string; href: string } 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-canvas-warm border border-editorial-border rounded-card w-full">
      <div className="w-14 h-14 rounded-full bg-white border border-editorial-border flex items-center justify-center mb-5 text-muted shadow-sm" aria-hidden="true">
        <svg 
          className="w-7 h-7 text-muted" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
          <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
          <polyline points="21 15 16 10 5 21" strokeWidth="1.5" />
        </svg>
      </div>
      
      <h3 className="text-xl sm:text-2xl font-serif font-normal text-ink-deep mb-2">{title}</h3>
      <p className="text-body text-sm sm:text-base mb-8 max-w-md font-light leading-relaxed">{description}</p>
      
      {cta && (
        <Link 
          href={cta.href} 
          className="inline-flex items-center justify-center px-7 py-3 bg-[#18181A] text-white rounded-pill text-sm font-medium hover:bg-black transition-all shadow-sm"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
