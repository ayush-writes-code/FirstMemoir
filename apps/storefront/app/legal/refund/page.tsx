import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_CONFIG } from '@/config/business';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" lastUpdated="August 2026">
      <p>
        We want you to be absolutely thrilled with your {BUSINESS_CONFIG.brandName} prints. Because every product is custom-made using your personal photographs, our refund and cancellation policies reflect the unique nature of our manufacturing process.
      </p>

      <h2>1. Cancellations</h2>
      <p>
        Our automated manufacturing systems begin processing orders quickly to ensure fast delivery. Therefore, order cancellations or modifications are only accepted {BUSINESS_CONFIG.cancellationWindow}. Once an order enters the printing phase, we cannot cancel or modify it.
      </p>

      <h2>2. Transit Damage & Defects</h2>
      <p>
        If your order arrives damaged (e.g., broken glass, dented frame) or with a manufacturing defect, please contact us at <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`}>{BUSINESS_CONFIG.supportEmail}</a> {BUSINESS_CONFIG.returnWindow}.
      </p>
      <p>
        To process a replacement, we will require:
      </p>
      <ul>
        <li>Your order ID</li>
        <li>Clear photographs of the damaged product</li>
        <li>Photographs of the external packaging</li>
      </ul>

      <h2>3. Returns and Refunds</h2>
      <p>
        Because products are personalized, we do not accept returns or offer refunds for &quot;change of mind&quot; or if a low-resolution image was provided by the customer despite our quality warnings.
      </p>
      <p>
        Refunds (if applicable and approved for defective items where a replacement is not possible) will be processed to the original method of payment within 5-7 business days.
      </p>

    </LegalLayout>
  );
}
