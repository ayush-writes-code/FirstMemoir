import React from 'react';

interface Props {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-4">{title}</h1>
        {lastUpdated && (
          <p className="text-muted text-sm">Last Updated: {lastUpdated}</p>
        )}
      </div>
      
      {/* 
        We use a specific container class so we can apply consistent styling 
        to nested HTML elements like h2, p, ul, etc. without needing the typography plugin.
      */}
      <div className="
        text-body leading-relaxed space-y-6
        [&>h2]:text-2xl [&>h2]:font-serif [&>h2]:font-semibold [&>h2]:text-ink [&>h2]:mt-12 [&>h2]:mb-4
        [&>h3]:text-xl [&>h3]:font-medium [&>h3]:text-ink [&>h3]:mt-8 [&>h3]:mb-3
        [&>p]:text-base [&>p]:mb-4
        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:mb-6
        [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>ol]:mb-6
        [&>a]:text-brand [&>a]:underline [&>a]:hover:text-brand-pressed
      ">
        {children}
      </div>
    </div>
  );
}
