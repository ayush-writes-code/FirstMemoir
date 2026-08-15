'use client';

import { useCartStore } from '@/store/cart.store';
import Link from 'next/link';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export default function CartPage() {
  const { cart, isLoading, error, fetchCart, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading && !cart) {
    return (
      <div className="max-w-content mx-auto px-4 py-16 text-center text-muted">
        Loading cart...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-content mx-auto px-4 py-16 text-center text-error">
        {error}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-content mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-serif font-bold text-ink mb-4">Your Cart is Empty</h1>
        <p className="text-muted mb-8">Looks like you haven't added any personalized prints yet.</p>
        <Link 
          href="/products" 
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3 rounded-pill font-medium transition-colors"
        >
          Browse Collections <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  return (
    <div className="max-w-content mx-auto px-4 py-12 md:py-16">
      <h1 className="text-3xl font-serif font-bold text-ink mb-8">Your Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items List */}
        <div className="w-full lg:w-2/3 space-y-6">
          {cart.items.map((item) => (
            <div key={item.id} className="flex gap-6 p-6 rounded-2xl border border-hairline bg-canvas">
              {/* Thumbnail */}
              <div className="w-24 h-24 md:w-32 md:h-32 bg-surface rounded-lg overflow-hidden shrink-0 border border-hairline relative">
                {item.preview_url ? (
                  <img src={item.preview_url} alt="Crop preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                    No Preview
                  </div>
                )}
              </div>

              {/* Item Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-ink text-lg">{item.product_name}</h3>
                    <p className="font-medium text-ink">₹{(item.unit_price * item.quantity).toLocaleString()}</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    {item.selected_options.map(opt => (
                      <p key={opt.option_id} className="text-sm text-muted">
                        {opt.option_name}: <span className="text-ink">{opt.value_name}</span>
                        {opt.price_modifier > 0 && ` (+₹${opt.price_modifier})`}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4 bg-surface rounded-full p-1 border border-hairline">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas text-ink transition-colors disabled:opacity-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={isLoading}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-canvas text-ink transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeItem(item.id)}
                    disabled={isLoading}
                    className="text-muted hover:text-error transition-colors p-2"
                    aria-label="Remove item"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-1/3">
          <div className="sticky top-28 bg-canvas border border-hairline rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-muted">
                <span>Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-hairline pt-4 mb-8">
              <div className="flex justify-between text-ink font-semibold text-lg">
                <span>Total</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full flex items-center justify-center bg-brand hover:bg-brand-pressed text-white font-medium text-lg rounded-pill h-12 transition-colors"
            >
              Proceed to Checkout
            </Link>
            
            <p className="text-xs text-center text-muted mt-4">
              Taxes and shipping calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
