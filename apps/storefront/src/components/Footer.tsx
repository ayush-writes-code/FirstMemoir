import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-canvas border-t border-hairline mt-16">
      <div className="max-w-content mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-semibold text-ink mb-4">Shop</h3>
            <ul className="flex flex-col gap-3">
              <li><Link href="/products" className="text-muted hover:text-brand">All Prints</Link></li>
              <li><Link href="/products?category=framed" className="text-muted hover:text-brand">Framed Prints</Link></li>
              <li><Link href="/products?category=canvas" className="text-muted hover:text-brand">Canvas Prints</Link></li>
              <li><Link href="/products?category=posters" className="text-muted hover:text-brand">Posters</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-4">Help</h3>
            <ul className="flex flex-col gap-3">
              <li><Link href="/faq" className="text-muted hover:text-brand">FAQ</Link></li>
              <li><Link href="/shipping" className="text-muted hover:text-brand">Shipping</Link></li>
              <li><Link href="/returns" className="text-muted hover:text-brand">Returns</Link></li>
              <li><Link href="/contact" className="text-muted hover:text-brand">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-4">Company</h3>
            <ul className="flex flex-col gap-3">
              <li><Link href="/about" className="text-muted hover:text-brand">About</Link></li>
              <li><Link href="/blog" className="text-muted hover:text-brand">Blog</Link></li>
              <li><Link href="/careers" className="text-muted hover:text-brand">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-4">Legal</h3>
            <ul className="flex flex-col gap-3">
              <li><Link href="/privacy" className="text-muted hover:text-brand">Privacy</Link></li>
              <li><Link href="/terms" className="text-muted hover:text-brand">Terms</Link></li>
              <li><Link href="/cookies" className="text-muted hover:text-brand">Cookies</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">&copy; {new Date().getFullYear()} First Memoir.in. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" aria-label="Instagram" className="text-muted hover:text-brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="#" aria-label="Twitter" className="text-muted hover:text-brand">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
