'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { CartItemThumbnail } from './CartItemThumbnail';
import { resolveProductPageHref } from '@/utils/cart-image';

export function CartDrawer() {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    mutatingItemIds,
  } = useCartStore();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and prevent body scroll when open
  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 transition-visibility duration-300 ${
        isDrawerOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-labelledby="cart-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-ink-deep/40 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-canvas shadow-2xl flex flex-col border-l border-editorial-border transition-transform duration-300 ease-out transform ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-editorial-border bg-canvas-warm/50">
          <div className="flex items-center gap-3">
            <h2 id="cart-drawer-title" className="font-serif text-2xl font-normal text-ink-deep">
              Your Cart
            </h2>
            {itemCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-pill bg-canvas-sand text-ink-deep border border-editorial-border">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-ink-deep hover:bg-canvas-warm transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            aria-label="Close cart"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center bg-canvas">
            <div className="w-16 h-16 rounded-full bg-canvas-warm flex items-center justify-center text-muted mb-5 border border-editorial-border">
              <ShoppingBag size={28} strokeWidth={1.5} className="text-ink-deep/70" />
            </div>
            <h3 className="font-serif text-xl font-normal text-ink-deep mb-2">
              Your cart is empty
            </h3>
            <p className="text-sm text-muted max-w-xs mb-8 leading-relaxed">
              Explore our curated collection of handcrafted gallery frames and archival photo prints.
            </p>
            <Link
              href="/products"
              onClick={closeDrawer}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-pill bg-brand hover:bg-brand-pressed text-white text-sm font-medium transition-colors shadow-sm"
            >
              Browse Collections
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-editorial-border/70">
            {items.map((item) => {
              const isItemMutating = mutatingItemIds?.includes(item.id) || false;
              const productHref = resolveProductPageHref(item);

              return (
                <div
                  key={item.id}
                  className={`py-4 flex gap-4 transition-opacity duration-200 ${
                    isItemMutating ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {/* Thumbnail */}
                  <div onClick={closeDrawer} className="shrink-0">
                    <CartItemThumbnail item={item} className="w-20 h-20 md:w-20 md:h-20" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={productHref}
                          onClick={closeDrawer}
                          className="font-medium text-sm text-ink-deep hover:text-brand transition-colors line-clamp-1 focus:outline-none focus:underline"
                        >
                          {item.product_name}
                        </Link>
                        <span className="font-semibold text-sm text-ink-deep shrink-0">
                          ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Selected Options */}
                      {item.selected_options && item.selected_options.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.selected_options.map((opt) => (
                            <span
                              key={opt.option_id}
                              className="inline-flex items-center text-[11px] text-muted bg-canvas-warm px-2 py-0.5 rounded border border-editorial-border/60"
                            >
                              {opt.option_name}: <span className="ml-1 text-ink-deep font-medium">{opt.value_name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity controls & Delete */}
                    <div className="flex items-center justify-between mt-3 pt-2">
                      <div className="flex items-center bg-canvas-warm rounded-full border border-editorial-border px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity === 1) {
                              removeItem(item.id);
                            } else {
                              updateQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          disabled={isItemMutating}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-ink hover:bg-canvas transition-colors disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-mono font-medium w-6 text-center flex items-center justify-center text-ink-deep">
                          {isItemMutating ? (
                            <RefreshCw size={11} className="animate-spin text-muted" aria-label="Updating" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isItemMutating}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-ink hover:bg-canvas transition-colors disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={isItemMutating}
                        className="text-muted hover:text-error transition-colors p-1.5 rounded-full hover:bg-canvas-warm disabled:opacity-40"
                        aria-label={`Remove ${item.product_name} from cart`}
                      >
                        {isItemMutating ? (
                          <RefreshCw size={15} className="animate-spin text-muted" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer (when cart has items) */}
        {items.length > 0 && (
          <div className="p-6 border-t border-editorial-border bg-canvas-warm/60 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-semibold text-lg text-ink-deep">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[12px] text-muted leading-relaxed">
                Taxes and standard shipping calculated at checkout.
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white font-medium text-sm rounded-pill h-12 transition-colors shadow-sm"
              >
                Proceed to Checkout
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="w-full flex items-center justify-center text-ink-deep hover:text-brand font-medium text-xs tracking-wide uppercase transition-colors py-1"
              >
                View Full Cart
              </Link>
            </div>

            <div className="pt-2 border-t border-editorial-border/60 flex items-center justify-center gap-2 text-[11px] text-muted">
              <ShieldCheck size={14} className="text-success" />
              <span>Handcrafted in India • 100% Archival Quality</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
