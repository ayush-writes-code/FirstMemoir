import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_CONFIG } from '@/config/business';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" lastUpdated="August 2026">
      <p>
        Welcome to {BUSINESS_CONFIG.brandName}. These Terms and Conditions govern your use of our website and services.
        By placing an order, you agree to these terms.
      </p>

      <h2>1. General Structure</h2>
      <p>
        The website is operated by {BUSINESS_CONFIG.registeredCompanyName}. Throughout the site, the terms "we", "us" and "our" refer to {BUSINESS_CONFIG.brandName}.
      </p>

      <h2>2. Custom Products</h2>
      <p>
        Because our products are custom printed using your uploaded photographs, it is your responsibility to ensure you have the legal right and copyright permissions to reproduce the images. We do not edit, enhance, or modify your images prior to printing unless explicitly stated.
      </p>

      <h2>3. Order Modifications</h2>
      <p>
        Due to the automated nature of our manufacturing pipeline, orders can generally only be modified or cancelled {BUSINESS_CONFIG.cancellationWindow}. 
      </p>

      <h2>4. Pricing and Payments</h2>
      <p>
        All prices are subject to change without notice. We reserve the right to modify or discontinue any product.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        We do not guarantee that your use of our service will be uninterrupted, timely, secure, or error-free. 
        In no case shall {BUSINESS_CONFIG.registeredCompanyName} be liable for any consequential damages arising from the use of our services.
      </p>

      <h2>6. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of India.
      </p>

      <h2>7. Contact Information</h2>
      <p>
        Questions about the Terms of Service should be sent to us at <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`}>{BUSINESS_CONFIG.supportEmail}</a>.
      </p>
    </LegalLayout>
  );
}
