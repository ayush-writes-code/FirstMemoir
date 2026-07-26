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
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface-soft rounded-card w-full">
      <svg 
        className="w-16 h-16 text-muted mb-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2"></circle>
        <polyline points="21 15 16 10 5 21" strokeWidth="2"></polyline>
      </svg>
      
      <h3 className="text-xl font-medium text-ink mb-2">{title}</h3>
      <p className="text-muted mb-8 max-w-md">{description}</p>
      
      {cta && (
        <Link 
          href={cta.href} 
          className="px-6 py-2 bg-brand text-white rounded-pill font-medium hover:bg-brand-pressed transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
