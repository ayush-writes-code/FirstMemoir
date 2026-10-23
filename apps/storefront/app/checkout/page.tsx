'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { checkout } from '@/lib/api-client';
import { State, City } from 'country-state-city';
import { CartItemThumbnail } from '@/components/cart/CartItemThumbnail';
import {
  validateCheckoutForm,
  sanitizeIndianPhone,
  buildCheckoutInitPayload,
  type CheckoutFormData,
} from '@/utils/checkout-validation';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  ArrowLeft,
  AlertCircle,
  Truck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, fetchCart } = useCartStore();
  const [isInitializing, setIsInitializing] = useState(true);

  const [formData, setFormData] = useState<CheckoutFormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const [stateCode, setStateCode] = useState<string>('');
  const indianStates = State.getStatesOfCountry('IN');
  const availableCities = stateCode ? City.getCitiesOfState('IN', stateCode) : [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error || info) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error, info]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (!cart) {
        await fetchCart();
      }
      if (active) {
        setIsInitializing(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [cart, fetchCart]);

  useEffect(() => {
    if (!isInitializing && !isCartLoading && (!cart || cart.items.length === 0)) {
      router.replace('/cart');
    }
  }, [cart, isInitializing, isCartLoading, router]);

  if (isInitializing || isCartLoading || !cart || cart.items.length === 0) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-canvas-warm border border-editorial-border flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={22} className="animate-spin text-brand" />
        </div>
        <p className="font-serif text-lg text-ink-deep">Securing your checkout session...</p>
        <p className="text-sm text-muted mt-1">Verifying cart contents and availability</p>
      </div>
    );
  }

  const items = cart.items;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeIndianPhone(e.target.value);
    setFormData(prev => ({ ...prev, customer_phone: val }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setStateCode(code);
    const stateObj = indianStates.find(s => s.isoCode === code);
    setFormData(prev => ({ ...prev, state: stateObj ? stateObj.name : '', city: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validation = validateCheckoutForm(formData);
    if (!validation.isValid && validation.error) {
      setError(validation.error);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initialize Checkout (Backend locks order & calculates authoritative amount)
      const payload = buildCheckoutInitPayload(formData);
      const res = await checkout.initializeCheckout(payload);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to initialize checkout');
      }

      const initData = res.data;

      // 2. Open Razorpay Modal
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please disable adblockers and try again.');
      }

      const options = {
        key: initData.razorpay_key_id,
        amount: initData.amount, // Backend-authoritative amount in paise
        currency: initData.currency, // Backend-authoritative currency
        order_id: initData.razorpay_order_id,
        name: 'First Memoir',
        description: 'Premium Custom Prints & Fine Art Framing',
        handler: function () {
          // 3. Success: Redirect to polling page (Do NOT assume order is confirmed yet)
          router.push(`/checkout/success?order_id=${initData.order_id}`);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setInfo('Payment window closed. You can complete your purchase anytime.');
          },
          escape: true,
          backdropclose: false,
          handleback: true,
        },
        prefill: {
          name: formData.customer_name,
          email: formData.customer_email,
          contact: formData.customer_phone,
        },
        theme: {
          color: '#1a1a1a', // Match brand ink color
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error?.description || response.error?.reason || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });

      rzp.open();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div ref={topRef} className="-mt-24 pt-24" />

      {/* Navigation Kicker */}
      <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase text-muted mb-6 md:mb-8">
        <Link
          href="/cart"
          className="hover:text-brand transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-brand rounded"
        >
          <ArrowLeft size={13} />
          <span>RETURN TO CART</span>
        </Link>
        <span>/</span>
        <span className="text-ink-deep font-semibold">SECURE CHECKOUT</span>
      </div>

      {/* Page Title */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-3xl sm:text-4xl font-serif font-normal text-ink-deep tracking-tight mb-2">
          Complete Your Order
        </h1>
        <p className="text-muted text-sm sm:text-base">
          All custom prints and handcrafted frames are created on-demand using archival inks and gallery-grade finishes.
        </p>
      </div>

      {/* Main Grid: Form on Left, Order Summary Sticky on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          {error && (
            <div
              className="bg-red-50/90 text-red-800 p-4 sm:p-5 rounded-2xl border border-red-200/80 shadow-xs flex items-start gap-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-900">Please review your information</p>
                <p className="mt-0.5 text-red-700/90">{error}</p>
              </div>
            </div>
          )}

          {info && (
            <div
              className="bg-canvas-warm text-ink-deep p-4 sm:p-5 rounded-2xl border border-editorial-border shadow-xs flex items-start gap-3"
              role="status"
              aria-live="polite"
            >
              <Sparkles size={18} className="text-brand shrink-0 mt-0.5" />
              <p className="text-sm">{info}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Step 1: Contact Information */}
            <div className="bg-canvas border border-editorial-border/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-3 border-b border-editorial-border/60 pb-4">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-mono font-medium flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg sm:text-xl font-serif text-ink-deep font-medium">
                  Contact Information
                </h2>
              </div>

              <div>
                <label htmlFor="customer_name" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                  Full Name <span className="text-brand">*</span>
                </label>
                <input
                  id="customer_name"
                  required
                  type="text"
                  name="customer_name"
                  autoComplete="name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-muted/60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="customer_email" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    Email Address <span className="text-brand">*</span>
                  </label>
                  <input
                    id="customer_email"
                    required
                    type="email"
                    name="customer_email"
                    autoComplete="email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-muted/60"
                  />
                  <p className="text-[11px] text-muted mt-1">Receipt & tracking sent here</p>
                </div>

                <div>
                  <label htmlFor="customer_phone" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    Phone Number <span className="text-brand">*</span>
                  </label>
                  <div className="flex w-full border border-editorial-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand focus-within:border-brand bg-canvas transition-all">
                    <div className="bg-canvas-warm px-3.5 py-3 text-sm font-medium text-ink-deep/70 border-r border-editorial-border flex items-center select-none">
                      +91
                    </div>
                    <input
                      id="customer_phone"
                      required
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name="customer_phone"
                      autoComplete="tel-national"
                      value={formData.customer_phone}
                      onChange={handlePhoneChange}
                      className="w-full px-4 py-3 text-base text-ink-deep focus:outline-none bg-transparent placeholder:text-muted/60"
                      placeholder="98765 43210"
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-1">For courier delivery updates</p>
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="bg-canvas border border-editorial-border/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-3 border-b border-editorial-border/60 pb-4">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-mono font-medium flex items-center justify-center">
                  2
                </span>
                <h2 className="text-lg sm:text-xl font-serif text-ink-deep font-medium">
                  Delivery Address
                </h2>
              </div>

              <div>
                <label htmlFor="line1" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                  Street Address Line 1 <span className="text-brand">*</span>
                </label>
                <input
                  id="line1"
                  required
                  type="text"
                  name="line1"
                  autoComplete="address-line1"
                  value={formData.line1}
                  onChange={handleInputChange}
                  placeholder="House / Flat No., Building, Street"
                  className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-muted/60"
                />
              </div>

              <div>
                <label htmlFor="line2" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                  Address Line 2 <span className="text-muted/70 text-[11px] lowercase">(optional)</span>
                </label>
                <input
                  id="line2"
                  type="text"
                  name="line2"
                  autoComplete="address-line2"
                  value={formData.line2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, landmark, or area"
                  className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-muted/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="state" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    State <span className="text-brand">*</span>
                  </label>
                  <select
                    id="state"
                    required
                    name="state"
                    autoComplete="address-level1"
                    value={stateCode}
                    onChange={handleStateChange}
                    className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                  >
                    <option value="">Select State</option>
                    {indianStates.map(s => (
                      <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="city" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    City <span className="text-brand">*</span>
                  </label>
                  <select
                    id="city"
                    required
                    name="city"
                    autoComplete="address-level2"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={!stateCode}
                    className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all disabled:bg-canvas-warm disabled:text-muted disabled:cursor-not-allowed"
                  >
                    <option value="">{stateCode ? 'Select City' : 'Select State first'}</option>
                    {availableCities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="postal_code" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    Postal PIN Code <span className="text-brand">*</span>
                  </label>
                  <input
                    id="postal_code"
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]*"
                    name="postal_code"
                    autoComplete="postal-code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="e.g. 560001"
                    className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base text-ink-deep bg-canvas focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-muted/60"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-xs font-mono tracking-wider uppercase text-muted mb-1.5">
                    Country
                  </label>
                  <div className="w-full border border-editorial-border rounded-xl px-4 py-3 text-base bg-canvas-warm text-muted flex items-center justify-between select-none">
                    <span>India</span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted/80">IN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Reassurance Badge */}
            <div className="bg-canvas-warm/70 border border-editorial-border rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <Truck size={20} className="text-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink-deep">Complimentary Insured Courier Delivery</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Every order is securely packed with corner protectors, dust jackets, and shockproof framing cushions for transit anywhere in India.
                </p>
              </div>
            </div>

            {/* Pay Now Button */}
            <div className="space-y-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-brand hover:bg-brand-pressed text-white font-medium text-base sm:text-lg rounded-pill h-14 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={19} className="animate-spin text-white" />
                    <span>Connecting to Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    <span>Pay ₹{subtotal.toLocaleString('en-IN')} with Razorpay</span>
                  </>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-1 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-brand" />
                  <span>256-Bit SSL Secured</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard size={15} className="text-brand" />
                  <span>UPI • Cards • NetBanking</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Sticky Order Summary */}
        <aside className="lg:col-span-5 w-full">
          <div className="bg-canvas-warm/75 border border-editorial-border/90 rounded-2xl p-6 sm:p-7 sticky top-24 shadow-sm backdrop-blur-xs space-y-6">
            <div className="flex items-center justify-between border-b border-editorial-border/70 pb-4">
              <h2 className="text-lg sm:text-xl font-serif text-ink-deep font-medium">
                Order Summary
              </h2>
              <span className="text-xs font-mono bg-canvas px-2.5 py-1 rounded-full border border-editorial-border/80 text-muted">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Line items scrollable container */}
            <div className="divide-y divide-editorial-border/60 max-h-[360px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-3.5">
                  <CartItemThumbnail item={item} className="!w-16 !h-16 rounded-lg shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm font-medium text-ink-deep line-clamp-1">
                      {item.product_name}
                    </p>

                    {item.selected_options && item.selected_options.length > 0 && (
                      <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                        {item.selected_options.map(opt => `${opt.option_name}: ${opt.value_name}`).join(' • ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-mono text-muted">
                        Qty {item.quantity}
                      </span>
                      <span className="text-xs font-medium text-ink-deep">
                        ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="border-t border-editorial-border/70 pt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-medium text-ink-deep">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span className="flex items-center gap-1.5">
                  <span>Shipping</span>
                  <span className="text-[10px] font-mono uppercase bg-canvas px-1.5 py-0.5 rounded text-brand border border-editorial-border">Complimentary</span>
                </span>
                <span className="font-medium text-green-700">₹0</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Estimated Taxes (GST)</span>
                <span className="text-xs text-muted">Included</span>
              </div>

              <div className="border-t border-editorial-border/70 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-base font-serif font-medium text-ink-deep">Total Due</span>
                  <p className="text-[11px] text-muted">Final calculated price in INR</p>
                </div>
                <span className="text-xl font-serif font-semibold text-ink-deep">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Archival Quality Promise */}
            <div className="border-t border-editorial-border/70 pt-4 flex items-start gap-2.5 text-xs text-muted leading-relaxed">
              <Sparkles size={16} className="text-brand shrink-0 mt-0.5" />
              <p>
                <strong className="text-ink-deep font-medium">FirstMemoir Guarantee:</strong> Printed on heavyweight 310gsm cotton rag with museum-certified pigment inks for over 100 years of display life.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
