'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ShoppingBag, UserCircle, LogOut, Package, ArrowRight } from 'lucide-react';
import { useAuth } from '../store/auth.context';
import { useCartStore } from '../store/cart.store';

export function NavMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, login, logout } = useAuth();
  const { cart } = useCartStore();

  const itemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  // SSR-safe mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll and listen for Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleSignInClick = () => {
    setIsOpen(false);
    login();
  };

  const handleSignOutClick = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="md:hidden">
      {/* Mobile Hamburger Trigger Button (min 44px touch target) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center w-11 h-11 -ml-2 text-ink hover:text-brand transition-colors rounded-full active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Menu strokeWidth={1.75} size={26} />
      </button>

      {/* Full-Viewport Drawer rendered via Portal to escape header backdrop-filter containing block */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${
              isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={!isOpen}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <div
              className={`absolute inset-0 bg-white flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
                isOpen ? 'translate-y-0' : '-translate-y-4'
              }`}
            >
              {/* Drawer Top Header Bar */}
              <div className="h-[60px] px-5 flex items-center justify-between border-b border-zinc-100/80">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex items-center justify-center w-11 h-11 -ml-2 text-ink hover:text-brand transition-colors rounded-full active:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <X strokeWidth={1.75} size={26} />
                </button>

                {/* Center Brand Logo */}
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="font-serif font-semibold text-xl tracking-tight text-ink hover:text-brand transition-colors"
                >
                  FirstMemoir
                </Link>

                {/* Right Quick Cart Icon */}
                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  aria-label="Shopping Cart"
                  className="relative flex items-center justify-center w-11 h-11 -mr-2 text-ink hover:text-brand transition-colors rounded-full active:bg-zinc-100"
                >
                  <ShoppingBag strokeWidth={1.75} size={22} />
                  {itemCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-brand rounded-full">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Main Navigation Links */}
              <nav className="flex flex-col px-6 py-8 space-y-6">
                <Link
                  href="/products"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between py-2 text-2xl sm:text-3xl font-serif text-ink tracking-tight hover:text-brand transition-colors"
                >
                  <span>Shop Collection</span>
                  <ArrowRight
                    size={20}
                    className="text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all"
                  />
                </Link>

                <div className="w-12 h-px bg-zinc-100" />

                <Link
                  href="/track-order"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between py-2 text-2xl sm:text-3xl font-serif text-ink tracking-tight hover:text-brand transition-colors"
                >
                  <span>Track Order</span>
                  <ArrowRight
                    size={20}
                    className="text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all"
                  />
                </Link>

                <div className="w-12 h-px bg-zinc-100" />

                <Link
                  href="/cart"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between py-2 text-2xl sm:text-3xl font-serif text-ink tracking-tight hover:text-brand transition-colors"
                >
                  <span className="flex items-center gap-3">
                    Cart
                    {itemCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-brand/10 text-brand">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </span>
                  <ArrowRight
                    size={20}
                    className="text-zinc-300 group-hover:text-brand group-hover:translate-x-1 transition-all"
                  />
                </Link>
              </nav>

              {/* Bottom Support & Account Section */}
              <div className="mt-auto px-6 py-6 bg-zinc-50/80 border-t border-zinc-100/80 rounded-t-2xl space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account</p>
                    {isAuthenticated && (
                      <span className="text-[11px] font-medium text-brand">Signed In</span>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 p-3 bg-white border border-zinc-200/70 rounded-xl shadow-xs">
                        <UserCircle strokeWidth={1.5} size={28} className="text-zinc-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.phone_number}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">{user?.phone_number}</p>
                        </div>
                      </div>

                      <Link
                        href="/account/orders"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between p-3 bg-white border border-zinc-200/70 rounded-xl text-sm font-medium text-ink hover:text-brand hover:border-brand/40 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Package size={18} strokeWidth={1.5} className="text-zinc-600" />
                          <span>My Orders</span>
                        </div>
                        <ArrowRight size={16} className="text-zinc-400" />
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between p-3 bg-white border border-zinc-200/70 rounded-xl text-sm font-medium text-ink hover:text-brand hover:border-brand/40 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle size={18} strokeWidth={1.5} className="text-zinc-600" />
                          <span>Account Overview</span>
                        </div>
                        <ArrowRight size={16} className="text-zinc-400" />
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOutClick}
                        className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-center"
                      >
                        <LogOut size={16} strokeWidth={1.5} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleSignInClick}
                        className="w-full py-3.5 px-4 rounded-xl bg-ink text-white font-medium text-sm hover:bg-brand active:bg-brand-pressed transition-colors shadow-sm text-center"
                      >
                        Sign In / Register
                      </button>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href="/account/orders"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center gap-2 p-2.5 bg-white border border-zinc-200/70 rounded-xl text-xs font-medium text-zinc-700 hover:text-black hover:border-zinc-300 transition-colors shadow-xs"
                        >
                          <Package size={15} strokeWidth={1.5} className="text-zinc-500" />
                          <span>My Orders</span>
                        </Link>
                        <Link
                          href="/track-order"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center gap-2 p-2.5 bg-white border border-zinc-200/70 rounded-xl text-xs font-medium text-zinc-700 hover:text-black hover:border-zinc-300 transition-colors shadow-xs"
                        >
                          <ArrowRight size={15} strokeWidth={1.5} className="text-zinc-500" />
                          <span>Track Order</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>FirstMemoir Art Prints & Frames</span>
                  <span className="tracking-wide">India</span>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
