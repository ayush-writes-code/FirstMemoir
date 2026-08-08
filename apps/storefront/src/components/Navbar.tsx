import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { NavMobileMenu } from './NavMobileMenu';
import { CartIcon } from './CartIcon';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-canvas border-b border-hairline shadow-sm">
      <div className="max-w-content mx-auto h-[72px] px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <NavMobileMenu />
          <Link href="/" className="font-serif font-bold text-2xl text-brand">
            First Memoir.in
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/products" className="text-ink font-medium hover:text-brand transition-colors">Collections</Link>
          <Link href="/how-it-works" className="text-ink font-medium hover:text-brand transition-colors">How It Works</Link>
          <Link href="/about" className="text-ink font-medium hover:text-brand transition-colors">About</Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="text-ink hover:text-brand transition-colors p-2">
            <Search size={24} />
          </button>
          <CartIcon />
        </div>
      </div>
    </header>
  );
}
