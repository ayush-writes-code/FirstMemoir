'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function NavMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-ink">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {isOpen && (
        <div className="absolute top-[73px] left-0 right-0 bg-canvas border-b border-hairline p-4 flex flex-col gap-4 shadow-sm">
          <Link href="/products" onClick={() => setIsOpen(false)} className="text-ink font-medium">Collections</Link>
          <Link href="/how-it-works" onClick={() => setIsOpen(false)} className="text-ink font-medium">How It Works</Link>
          <Link href="/about" onClick={() => setIsOpen(false)} className="text-ink font-medium">About</Link>
        </div>
      )}
    </div>
  );
}
