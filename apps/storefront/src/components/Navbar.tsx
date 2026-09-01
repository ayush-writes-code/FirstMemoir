'use client';

import Link from 'next/link';
import { UserCircle, ChevronDown, LogOut, Package } from 'lucide-react';
import { NavMobileMenu } from './NavMobileMenu';
import { CartIcon } from './CartIcon';
import { useAuth } from '../store/auth.context';
import { useState, useRef, useEffect } from 'react';

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100/80">
      <div className="max-w-content mx-auto h-[72px] px-4 sm:px-6 md:px-8 grid grid-cols-3 items-center">
        
        {/* Left Column: Mobile Hamburger Menu / Desktop Brand Logo */}
        <div className="flex items-center justify-start">
          <div className="md:hidden flex items-center">
            <NavMobileMenu />
          </div>
          <div className="hidden md:block">
            <Link
              href="/"
              className="font-serif font-semibold text-2xl tracking-tight text-ink hover:text-brand transition-colors"
            >
              FirstMemoir
            </Link>
          </div>
        </div>

        {/* Center Column: Mobile Centered Brand Logo / Desktop Centered Navigation Links */}
        <div className="flex items-center justify-center">
          <div className="md:hidden flex items-center justify-center">
            <Link
              href="/"
              className="font-serif font-semibold text-xl sm:text-2xl tracking-tight text-ink hover:text-brand transition-colors truncate"
            >
              FirstMemoir
            </Link>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-8 lg:gap-10">
            <Link
              href="/products"
              className="text-sm font-medium text-ink hover:text-brand transition-colors py-1"
            >
              Shop
            </Link>
            <Link
              href="/track-order"
              className="text-sm font-medium text-ink hover:text-brand transition-colors py-1"
            >
              Track Order
            </Link>
          </nav>
        </div>

        {/* Right Column: Actions (Account + Cart) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-4">
          {isAuthenticated ? (
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="User account menu"
                aria-expanded={isDropdownOpen}
                className="flex items-center gap-1.5 text-ink hover:text-brand transition-colors p-2 px-3 rounded-full hover:bg-zinc-50"
              >
                <UserCircle strokeWidth={1.5} size={20} />
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {user?.first_name || 'Account'}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-2 border border-zinc-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-zinc-50 mb-1">
                    <p className="text-xs text-zinc-500 mb-0.5 font-medium uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-semibold text-ink truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.phone_number}
                    </p>
                  </div>
                  <Link
                    href="/account/orders"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-black transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Package size={16} strokeWidth={1.5} />
                    My Orders
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={16} strokeWidth={1.5} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={login}
              className="hidden md:block text-sm font-medium text-ink hover:text-brand transition-colors p-2 px-4 rounded-full hover:bg-zinc-50"
            >
              Sign In
            </button>
          )}

          <div className="flex items-center p-1.5 hover:bg-zinc-50 rounded-full transition-colors">
            <CartIcon />
          </div>
        </div>
      </div>
    </header>
  );
}
