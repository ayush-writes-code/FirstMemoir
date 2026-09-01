'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth.context';
import { Package, User as UserIcon } from 'lucide-react';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { name: 'My Orders', href: '/account/orders', icon: Package },
    // { name: 'Profile', href: '/account/profile', icon: UserIcon }, // for later
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-content mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 mb-4">
                <UserIcon size={24} />
              </div>
              <h2 className="font-semibold text-lg">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'My Account'}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">{user?.phone_number}</p>
            </div>

            <nav className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-zinc-50 text-black border-l-2 border-black' 
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-black border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
