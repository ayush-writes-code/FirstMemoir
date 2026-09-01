import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-canvas border-t border-hairline mt-24 pt-20 pb-10 sm:pt-28 sm:pb-12">
      <div className="max-w-content mx-auto px-6 sm:px-8 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-8 lg:gap-x-12 mb-20 md:mb-28">
          
          {/* Brand Section */}
          <div className="md:col-span-5 flex flex-col items-start max-w-sm">
            <Link 
              href="/" 
              className="font-serif text-3xl sm:text-4xl tracking-tight text-ink mb-6 hover:opacity-70 transition-opacity duration-300"
              aria-label="FirstMemoir Homepage"
            >
              FirstMemoir
            </Link>
            <p className="font-sans text-muted leading-relaxed text-base sm:text-lg font-light">
              Made to turn the photos you love into timeless pieces you can live with.
            </p>
          </div>

          {/* Navigation - Shop */}
          <div className="md:col-span-2">
            <h3 className="font-sans text-xs font-semibold tracking-[0.15em] text-ink uppercase mb-8">
              Shop
            </h3>
            <ul className="flex flex-col gap-5">
              <li>
                <Link href="/products" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/cart" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation - Support */}
          <div className="md:col-span-2">
            <h3 className="font-sans text-xs font-semibold tracking-[0.15em] text-ink uppercase mb-8">
              Support
            </h3>
            <ul className="flex flex-col gap-5">
              <li>
                <Link href="/contact" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/account" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation - Legal */}
          <div className="md:col-span-3">
            <h3 className="font-sans text-xs font-semibold tracking-[0.15em] text-ink uppercase mb-8">
              Legal
            </h3>
            <ul className="flex flex-col gap-5">
              <li>
                <Link href="/legal/terms" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/refund" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/shipping" className="font-sans text-sm text-muted hover:text-ink transition-colors duration-300">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>
          
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <p className="font-sans text-muted-soft text-xs tracking-wide">
            &copy; {new Date().getFullYear()} FirstMemoir. All rights reserved.
          </p>
          <p className="font-sans text-muted-soft text-xs tracking-wide uppercase">
            Crafted with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}
