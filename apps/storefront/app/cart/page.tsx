'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { CartItemThumbnail } from '@/components/cart/CartItemThumbnail';
import { resolveProductPageHref } from '@/utils/cart-image';

export default function CartPage() {
  const {
    cart,
    isLoading,
    error,
    fetchCart,
    updateQuantity,
    removeItem,
    mutatingItemIds,
  } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading && !cart) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-canvas-warm border border-editorial-border flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={22} className="animate-spin text-brand" />
        </div>
        <p className="font-serif text-lg text-ink-deep">Preparing your gallery cart...</p>
        <p className="text-sm text-muted mt-1">Checking current items and availability</p>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-canvas-warm border border-editorial-border shadow-sm">
          <h1 className="text-2xl font-serif font-normal text-ink-deep mb-3">
            Unable to Load Cart
          </h1>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            We encountered a temporary connection issue ({error}). Your items remain safe on our server.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fetchCart()}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-6 py-3 rounded-pill text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              Try Again
            </button>
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-editorial-border bg-canvas hover:bg-canvas-warm text-ink-deep px-6 py-3 rounded-pill text-sm font-medium transition-colors"
            >
              Browse Collections
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-canvas-warm border border-editorial-border flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShoppingBag size={32} strokeWidth={1.5} className="text-ink-deep/70" />
          </div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-muted mb-2">
            YOUR CART
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-ink-deep mb-3">
            Your cart is empty
          </h1>
          <p className="text-muted text-sm sm:text-base leading-relaxed mb-8">
            You haven&apos;t added any handcrafted frames or prints yet. Explore our curated collections to bring your memories to life.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3.5 rounded-pill font-medium text-sm transition-colors shadow-sm"
          >
            Browse Collections
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-10 md:py-16">
      {/* Header & Breadcrumb Kicker */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase text-muted mb-2">
          <Link href="/products" className="hover:text-brand transition-colors">
            CATALOG
          </Link>
          <span>/</span>
          <span className="text-ink-deep">SHOPPING CART</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-editorial-border pb-5">
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-ink-deep">
            Your Cart
          </h1>
          <span className="text-sm font-mono text-muted">
            {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} selected
          </span>
        </div>
      </div>

      {/* Non-fatal error banner */}
      {error && (
        <div
          className="mb-8 p-4 rounded-xl bg-canvas-warm border border-editorial-border text-ink-deep text-sm flex items-center justify-between shadow-2xs"
          role="alert"
        >
          <span className="text-error">{error}</span>
          <button
            onClick={() => fetchCart()}
            className="underline font-medium ml-4 text-xs tracking-wide uppercase hover:text-brand transition-colors"
          >
            Refresh Cart
          </button>
        </div>
      )}

      {/* Main Grid: Items vs Order Summary */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        {/* Cart Items List */}
        <div className="w-full lg:w-2/3 space-y-4">
          {items.map((item) => {
            const isItemMutating = mutatingItemIds?.includes(item.id) || false;
            const productHref = resolveProductPageHref(item);
            const lineTotal = item.unit_price * item.quantity;

            return (
              <div
                key={item.id}
                className={`bg-canvas-warm/70 border border-editorial-border/90 rounded-2xl p-5 sm:p-6 shadow-sm transition-all duration-200 flex flex-col sm:flex-row gap-5 sm:gap-6 ${
                  isItemMutating ? 'opacity-65 pointer-events-none' : 'opacity-100'
                }`}
              >
                {/* Thumbnail */}
                <CartItemThumbnail item={item} />

                {/* Details & Controls */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={productHref}
                          className="font-medium text-base sm:text-lg text-ink-deep hover:text-brand transition-colors focus:outline-none focus:underline"
                        >
                          {item.product_name}
                        </Link>
                        {item.preview_url && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-brand font-medium">
                            <CheckCircle2 size={13} />
                            <span>Custom photo crop preserved</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-base sm:text-lg text-ink-deep font-mono">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[11px] text-muted font-mono mt-0.5">
                            ₹{item.unit_price.toLocaleString('en-IN')} each
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Selected Options Pills */}
                    {item.selected_options && item.selected_options.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.selected_options.map((opt) => (
                          <span
                            key={opt.option_id}
                            className="inline-flex items-center text-xs text-muted bg-canvas-sand/60 px-2.5 py-1 rounded-md border border-editorial-border/60"
                          >
                            <span className="text-muted">{opt.option_name}:</span>
                            <span className="ml-1 text-ink-deep font-medium">{opt.value_name}</span>
                            {opt.price_modifier > 0 && (
                              <span className="ml-1 text-muted font-mono text-[11px]">
                                (+₹{opt.price_modifier})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar: Quantity controls + Remove */}
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-editorial-border/60">
                    <div className="flex items-center bg-canvas rounded-full border border-editorial-border px-1 py-0.5 shadow-2xs">
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
                        className="w-8 h-8 rounded-full flex items-center justify-center text-ink-deep hover:bg-canvas-warm transition-colors disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-mono font-medium w-8 text-center flex items-center justify-center text-ink-deep">
                        {isItemMutating ? (
                          <RefreshCw size={12} className="animate-spin text-muted" aria-label="Updating" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isItemMutating}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-ink-deep hover:bg-canvas-warm transition-colors disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isItemMutating}
                      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-error transition-colors px-3 py-1.5 rounded-full hover:bg-canvas disabled:opacity-40"
                      aria-label={`Remove ${item.product_name} from cart`}
                    >
                      {isItemMutating ? (
                        <RefreshCw size={14} className="animate-spin text-muted" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Column */}
        <div className="w-full lg:w-1/3">
          <div className="sticky top-28 bg-canvas-warm/80 border border-editorial-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
            <h2 className="font-serif text-2xl font-normal text-ink-deep">
              Order Summary
            </h2>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center text-muted">
                <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})</span>
                <span className="font-medium text-ink-deep font-mono">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Standard Delivery</span>
                <span className="text-xs font-medium text-ink-deep bg-canvas-sand px-2 py-0.5 rounded border border-editorial-border/60">
                  Calculated at checkout
                </span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>GST & Duties</span>
                <span className="text-xs text-muted">Included in price</span>
              </div>
            </div>

            <div className="border-t border-editorial-border/80 pt-4">
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-ink-deep text-base">Estimated Total</span>
                <span className="font-semibold text-2xl text-ink-deep font-mono">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[12px] text-muted mt-1 leading-relaxed">
                Final shipping is calculated based on destination pincode at checkout.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/checkout"
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white font-medium text-base rounded-pill h-12 transition-colors shadow-sm"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/products"
                className="w-full flex items-center justify-center text-ink-deep hover:text-brand font-medium text-xs tracking-wider uppercase transition-colors py-1.5"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Quality Reassurance Badges */}
            <div className="border-t border-editorial-border/80 pt-5 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-muted">
                <ShieldCheck size={16} className="text-success shrink-0" />
                <span>Museum-grade archival cotton & inks</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-muted">
                <Package size={16} className="text-brand shrink-0" />
                <span>Custom protective timber & edge boxing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
