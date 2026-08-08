"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cart.store';

export function CartIcon() {
  const { cart, fetchCart } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const itemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <Link href="/cart" aria-label="Cart" className="relative text-ink hover:text-brand transition-colors p-2 inline-block">
      <ShoppingBag size={24} />
      {itemCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-brand rounded-full">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
