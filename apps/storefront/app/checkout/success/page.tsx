'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { orders } from '@repo/api-client';
import type { OrderStatus } from '@repo/api-client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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

          // Stop polling if we reach a final state
          if (currentStatus === 'CONFIRMED' || currentStatus === 'EXPIRED' || currentStatus === 'CANCELLED') {
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
      } catch (err: any) {
        if (isMounted) {
          setError('Unable to verify order status. Please check your email for confirmation.');
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
      <div className="max-w-content mx-auto px-4 py-24 text-center">
        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-2xl max-w-lg mx-auto border border-yellow-200">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-2">Your order ID is: <span className="font-mono">{orderId}</span></p>
        </div>
      </div>
    );
  }

  if (status === 'LOADING') {
    return (
      <div className="max-w-content mx-auto px-4 py-24 text-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-serif font-bold text-ink mb-2">Confirming Payment</h1>
        <p className="text-muted">Please wait while we securely verify your payment with Razorpay...</p>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="max-w-content mx-auto px-4 py-24 text-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-serif font-bold text-ink mb-2">Payment Received</h1>
        <p className="text-muted mb-6">Payment received. We're confirming your order. This may take a few seconds.</p>
        <p className="text-sm text-muted">You will receive an email shortly once confirmed. Order ID: {orderId}</p>
        <div className="mt-8">
          <Link href="/" className="text-brand hover:underline font-medium">Return to Home</Link>
        </div>
      </div>
    );
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <div className="max-w-content mx-auto px-4 py-24 text-center">
        <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
        <h1 className="text-3xl font-serif font-bold text-ink mb-2">Payment Failed or Expired</h1>
        <p className="text-muted mb-8">We could not confirm this payment. Your cart items are still saved.</p>
        <Link 
          href="/cart" 
          className="inline-block bg-brand hover:bg-brand-pressed text-white px-8 py-3 rounded-pill font-medium transition-colors"
        >
          Return to Cart
        </Link>
      </div>
    );
  }

  // CONFIRMED
  return (
    <div className="max-w-content mx-auto px-4 py-24 text-center">
      <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-4xl font-serif font-bold text-ink mb-4">Order Confirmed!</h1>
      <p className="text-lg text-muted mb-8 max-w-lg mx-auto">
        Thank you for your order. We are preparing your custom prints and will notify you once they ship.
      </p>
      <div className="bg-surface border border-hairline rounded-2xl p-6 max-w-md mx-auto mb-8">
        <p className="text-sm text-muted mb-1">Order Reference</p>
        <p className="font-mono text-ink font-medium">{orderId}</p>
      </div>
      <Link 
        href="/" 
        className="inline-block bg-brand hover:bg-brand-pressed text-white px-8 py-3 rounded-pill font-medium transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
