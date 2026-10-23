"use client";

import { useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cart.store';

export function CartIcon() {
  const { cart, fetchCart, openDrawer } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const itemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <button
      type="button"
      onClick={() => openDrawer()}
      aria-label={`Shopping Cart with ${itemCount} items`}
      className="relative text-ink-deep hover:text-brand transition-colors p-2 inline-flex items-center justify-center rounded-full hover:bg-canvas-warm/70 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <ShoppingBag size={22} strokeWidth={1.8} />
      {itemCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono font-bold text-white bg-brand rounded-full shadow-sm">
          {itemCount}
        </span>
      )}
    </button>
  );
}

