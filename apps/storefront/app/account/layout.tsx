'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth.context';
import {
  Package,
  User as UserIcon,
  Search,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const pathname = usePathname();

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-warm py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-content mx-auto animate-pulse space-y-8">
          <div className="h-4 w-40 bg-paper-border/80 rounded" />
          <div className="bg-white border border-paper-border rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-paper-warm" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-48 bg-paper-warm rounded" />
                <div className="h-3.5 w-32 bg-paper-warm rounded" />
              </div>
            </div>
          </div>
          <div className="h-10 w-64 bg-paper-warm rounded-xl" />
          <div className="h-64 bg-white border border-paper-border rounded-2xl" />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (In-place sign in rather than bouncing redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas-warm py-12 sm:py-20 px-4 md:px-8">
        <div className="max-w-md mx-auto">
          {/* Breadcrumb kicker */}
          <div className="text-center mb-8">
            <span className="text-xs font-mono font-semibold tracking-wider text-brand uppercase">
              FirstMemoir &bull; Customer Portal
            </span>
            <h1 className="text-3xl font-serif font-medium text-ink mt-2 mb-3">
              Sign in to Your Account
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Access your order history, artisan framing updates, courier tracking, and invoices.
            </p>
          </div>

          <div className="bg-white border border-paper-border rounded-2xl p-6 sm:p-8 shadow-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-paper-warm border border-paper-border mx-auto flex items-center justify-center text-ink">
              <UserIcon size={30} strokeWidth={1.5} />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={login}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-sm"
              >
                <span>Sign In via Phone OTP</span>
                <ArrowRight size={16} />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-paper-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-zinc-400 font-mono">Or</span>
                </div>
              </div>

              <Link
                href="/track-order"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-paper-warm border border-paper-border text-ink rounded-xl text-sm font-medium hover:bg-white hover:border-brand/40 transition-colors"
              >
                <Search size={16} className="text-zinc-500" />
                <span>Track a Guest Order</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-paper-border flex items-center justify-center gap-2 text-xs text-zinc-500">
              <ShieldCheck size={14} className="text-brand" />
              <span>Secure passwordless sign-in with instant SMS OTP</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Customer Experience
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Valued Customer';
  const displayPhone = user?.phone_number || '';
  const initials = ((user?.first_name && user.first_name[0]) || 'U').toUpperCase();

  const navTabs = [
    { name: 'Overview', href: '/account', icon: Sparkles, exact: true },
    { name: 'Order History', href: '/account/orders', icon: Package, exact: false },
    { name: 'Track Shipment', href: '/track-order', icon: Search, exact: true },
  ];

  return (
    <div className="min-h-screen bg-canvas-warm">
      <div className="max-w-content mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {/* Breadcrumb Kicker */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
            <Link href="/" className="hover:text-brand transition-colors">
              Storefront
            </Link>
            <span>/</span>
            <span className="text-brand font-semibold">Customer Account</span>
          </nav>
        </div>

        {/* Customer Header Banner */}
        <div className="bg-white border border-paper-border rounded-2xl p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-paper-warm border border-paper-border flex items-center justify-center text-ink font-serif font-bold text-xl sm:text-2xl shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold">
                  FirstMemoir Collector
                </span>
                <h1 className="text-xl sm:text-2xl font-serif font-medium text-ink truncate mt-0.5">
                  {displayName}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-0.5">
                  {displayPhone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-paper-border text-xs sm:text-sm font-medium text-zinc-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                title="Sign out of your account"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="mt-8 pt-6 border-t border-paper-border flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
            {navTabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                    isActive
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-zinc-600 hover:text-ink hover:bg-paper-warm'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Child Route Content Slot */}
        <div>{children}</div>
      </div>
    </div>
  );
}

