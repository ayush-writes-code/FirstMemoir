'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orders } from '@/lib/api-client';
import type { OrderStatus } from '@/lib/api-client';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Package,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');

  const [status, setStatus] = useState<OrderStatus | 'LOADING'>('LOADING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      router.replace('/');
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const MAX_POLLS = 15; // 45 seconds total if polling every 3s
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await orders.getOrderStatus(orderId);

        if (!isMounted) return;

        if (res.success && res.data) {
          const currentStatus = res.data.status;
          setStatus(currentStatus);

          // Stop polling if we reach a final state (anything other than PENDING)
          if (currentStatus !== 'PENDING') {
            return;
          }
        }

        // If PENDING, keep polling until max polls
        if (pollCount < MAX_POLLS) {
          pollCount++;
          timeoutId = setTimeout(checkStatus, 3000);
        } else {
          // Timeout reached, assume still pending
          if (isMounted) setStatus('PENDING');
        }
      } catch {
        if (isMounted) {
          setError('Unable to verify real-time status. Please check your email for confirmation.');
          setStatus('PENDING'); // Assume pending on error to be safe
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [orderId, router]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
        <div className="bg-canvas-warm border border-editorial-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
            <Clock size={24} />
          </div>
          <h1 className="text-2xl font-serif text-ink-deep font-medium mb-2">Order In Verification</h1>
          <p className="text-sm text-muted mb-6 leading-relaxed">{error}</p>
          <div className="bg-canvas border border-editorial-border rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-muted mb-1">Order Reference</p>
            <p className="font-mono text-sm text-ink-deep select-all">{orderId}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3 rounded-pill text-sm font-medium transition-colors shadow-sm"
          >
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'LOADING') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <div className="w-16 h-16 rounded-full bg-canvas-warm border border-editorial-border flex items-center justify-center mx-auto mb-6 shadow-xs">
          <RefreshCw size={26} className="text-brand animate-spin" />
        </div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted mb-2">
          GATEWAY VERIFICATION
        </p>
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-ink-deep mb-3">
          Confirming Your Payment
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Please wait while we verify your transaction securely with Razorpay. This will only take a moment.
        </p>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
        <div className="bg-canvas-warm border border-editorial-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Clock size={28} />
          </div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-muted mb-2">
            PAYMENT CAPTURED
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-ink-deep mb-3">
            Finalizing Your Order
          </h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Your payment was received. Our system is awaiting final webhook confirmation to begin crafting your prints. A detailed confirmation email will be sent shortly.
          </p>
          <div className="bg-canvas border border-editorial-border rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-muted mb-1">Order Reference</p>
            <p className="font-mono text-sm text-ink-deep select-all">{orderId}</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3 rounded-pill text-sm font-medium transition-colors shadow-sm"
          >
            Explore Collections
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
        <div className="bg-canvas-warm border border-editorial-border rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <XCircle size={28} />
          </div>
          <p className="text-[11px] font-mono tracking-widest uppercase text-muted mb-2">
            PAYMENT INCOMPLETE
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-ink-deep mb-3">
            Payment Session Ended
          </h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            The payment window was closed or could not be completed. Your selected prints and customizations remain safely saved in your cart.
          </p>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3.5 rounded-pill text-sm font-medium transition-colors shadow-sm"
          >
            <ShoppingBag size={16} />
            <span>Return to Cart & Retry</span>
          </Link>
        </div>
      </div>
    );
  }

  // CONFIRMED (or other positive completion state)
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20 text-center">
      {/* Success Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xs">
        <CheckCircle2 size={32} />
      </div>

      <p className="text-[11px] font-mono tracking-widest uppercase text-brand font-semibold mb-2">
        ORDER CONFIRMED
      </p>

      <h1 className="text-3xl sm:text-4xl font-serif font-normal text-ink-deep tracking-tight mb-3">
        Thank You for Your Order
      </h1>

      <p className="text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
        Your order has been officially received. Our master framers and print artisans will handcraft your pieces using museum-certified archival standards.
      </p>

      {/* Order Reference Box */}
      <div className="bg-canvas-warm/75 border border-editorial-border rounded-2xl p-6 text-left mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-editorial-border/70 pb-4 mb-4">
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-muted">Order Reference</p>
            <p className="font-mono text-base font-semibold text-ink-deep select-all mt-0.5">{orderId}</p>
          </div>
          <span className="self-start sm:self-auto text-xs font-mono uppercase bg-emerald-100/70 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200/80">
            Payment Verified
          </span>
        </div>

        {/* 3-Step Production Timeline */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-mono tracking-wider uppercase text-muted mb-2">What Happens Next</p>
          
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
              ✓
            </span>
            <div className="text-xs">
              <span className="font-semibold text-ink-deep">Order Confirmed & Payment Captured</span>
              <p className="text-muted">An itemized receipt and order details have been emailed to you.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="text-xs">
              <span className="font-semibold text-ink-deep">Fine Art Printing & Custom Framing</span>
              <p className="text-muted">Artisans inspect photo DPI, calibrate color profiles, and assemble your frames.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-canvas-warm border border-editorial-border text-muted text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="text-xs">
              <span className="font-semibold text-ink-deep">Insured Courier Dispatch (5–7 Business Days)</span>
              <p className="text-muted">Reinforced archival packaging ensures safe arrival at your door.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/products"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-pressed text-white px-8 py-3.5 rounded-pill font-medium text-sm transition-colors shadow-sm"
        >
          <span>Explore More Collections</span>
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-editorial-border bg-canvas hover:bg-canvas-warm text-ink-deep px-8 py-3.5 rounded-pill font-medium text-sm transition-colors"
        >
          Return to Home
        </Link>
      </div>

      {/* Trust reassurance */}
      <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-brand" />
          <span>Museum Guarantee</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={14} className="text-brand" />
          <span>Insured Transit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-brand" />
          <span>Handcrafted Quality</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-content mx-auto px-4 py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-canvas-warm border border-editorial-border flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={20} className="text-brand animate-spin" />
          </div>
          <p className="font-serif text-ink-deep">Loading order verification...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
