import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_CONFIG } from '@/config/business';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy',
};

export default function ShippingPage() {
  return (
    <LegalLayout title="Shipping Policy" lastUpdated="August 2026">
      <p>
        Here is what you can expect when you place an order with {BUSINESS_CONFIG.brandName}.
      </p>

      <h2>1. Processing & Dispatch Time</h2>
      <p>
        Every piece is custom printed, framed, and carefully packaged to order. Orders are typically processed and dispatched {BUSINESS_CONFIG.shippingSLA.dispatchDays} after the order is confirmed.
      </p>

      <h2>2. Delivery Time</h2>
      <p>
        Once dispatched, transit times vary depending on your location in India. Generally, you can expect your order to arrive {BUSINESS_CONFIG.shippingSLA.deliveryDays} after dispatch.
      </p>

      <h2>3. Tracking Your Order</h2>
      <p>
        As soon as your order ships, we will send you a confirmation email containing a tracking number and a link to trace its journey to your door.
      </p>

      <h2>4. Undeliverable Packages</h2>
      <p>
        Please ensure your shipping address is accurate. If a package is returned to us due to an incorrect address provided by the customer, or multiple failed delivery attempts, the customer may be responsible for the cost of re-shipping.
      </p>
    </LegalLayout>
  );
}
