'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { checkout } from '@repo/api-client';
import { State, City } from 'country-state-city';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading } = useCartStore();

  const [formData, setFormData] = useState({
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
    if (!isCartLoading && (!cart || cart.items.length === 0)) {
      router.replace('/cart');
    }
  }, [cart, isCartLoading, router]);

  if (isCartLoading || !cart || cart.items.length === 0) {
    return <div className="p-8 text-center">Loading checkout...</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setFormData(prev => ({ ...prev, customer_phone: val }));
    }
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
    if (!formData.customer_name || formData.customer_name.trim() === '') {
      setError('Please enter your full name.');
      return;
    }

    if (!formData.customer_email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customer_email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!formData.customer_phone || !/^[6-9]\d{9}$/.test(formData.customer_phone)) {
      setError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    if (!formData.line1 || formData.line1.trim() === '') {
      setError('Address Line 1 is required.');
      return;
    }

    if (!formData.city || formData.city.trim() === '') {
      setError('City is required.');
      return;
    }

    if (!formData.state || formData.state.trim() === '') {
      setError('State is required.');
      return;
    }

    if (!formData.postal_code || !/^\d{6}$/.test(formData.postal_code)) {
      setError('Please enter a valid 6-digit postal code.');
      return;
    }

    if (formData.country !== 'India') {
      setError('Shipping is only available in India.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initialize Checkout (Backend locks order & calculates authoritative amount)
      const res = await checkout.initializeCheckout({
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.trim(),
        shipping_address: {
          name: formData.customer_name.trim(),
          line1: formData.line1.trim(),
          line2: formData.line2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postal_code: formData.postal_code.trim(),
          country: formData.country.trim(),
        },
      });

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
        description: 'Premium Custom Prints',
        handler: function (response: any) {
          // 3. Success: Redirect to polling page (Do NOT assume order is confirmed yet)
          router.push(`/checkout/success?order_id=${initData.order_id}`);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setInfo('Payment window closed. You can try again.');
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
    <div className="max-w-xl mx-auto px-4 py-12 md:py-16">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div ref={topRef} className="-mt-24 pt-24" />

      <h1 className="text-3xl font-serif font-bold text-ink mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 shadow-sm" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {info && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 border border-blue-100 shadow-sm" role="status" aria-live="polite">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-ink">Contact Information</h2>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
            <input
              required
              type="text"
              name="customer_name"
              autoComplete="name"
              value={formData.customer_name}
              onChange={handleInputChange}
              className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                required
                type="email"
                name="customer_email"
                autoComplete="email"
                value={formData.customer_email}
                onChange={handleInputChange}
                className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Phone</label>
              <div className="flex w-full border border-hairline rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand bg-white">
                <div className="bg-surface px-4 py-2 text-muted border-r border-hairline flex items-center select-none">
                  +91
                </div>
                <input
                  required
                  type="tel"
                  name="customer_phone"
                  autoComplete="tel-national"
                  value={formData.customer_phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-2 text-base focus:outline-none bg-transparent"
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-ink">Shipping Address</h2>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Address Line 1</label>
            <input
              required
              type="text"
              name="line1"
              autoComplete="address-line1"
              value={formData.line1}
              onChange={handleInputChange}
              className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Address Line 2 (Optional)</label>
            <input
              type="text"
              name="line2"
              autoComplete="address-line2"
              value={formData.line2}
              onChange={handleInputChange}
              className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">State</label>
              <select
                required
                name="state"
                autoComplete="address-level1"
                value={stateCode}
                onChange={handleStateChange}
                className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand bg-white"
              >
                <option value="">Select State</option>
                {indianStates.map(s => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">City</label>
              <select
                required
                name="city"
                autoComplete="address-level2"
                value={formData.city}
                onChange={handleInputChange}
                disabled={!stateCode}
                className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand bg-white disabled:bg-surface disabled:cursor-not-allowed"
              >
                <option value="">Select City</option>
                {availableCities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Postal Code</label>
              <input
                required
                type="text"
                name="postal_code"
                autoComplete="postal-code"
                value={formData.postal_code}
                onChange={handleInputChange}
                className="w-full border border-hairline rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Country</label>
              <input
                required
                disabled
                type="text"
                name="country"
                autoComplete="country-name"
                value={formData.country}
                className="w-full border border-hairline rounded-lg px-4 py-2 text-base bg-surface text-muted cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-brand hover:bg-brand-pressed text-white font-medium text-lg rounded-pill h-14 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}
