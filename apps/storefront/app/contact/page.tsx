import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_CONFIG } from '@/config/business';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        We're here to help. Whether you have a question about an order, need assistance with your photos, or just want to say hello, feel free to reach out.
      </p>

      <h2>Customer Support</h2>
      <p>
        <strong>Email:</strong> <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`}>{BUSINESS_CONFIG.supportEmail}</a>
      </p>
      {BUSINESS_CONFIG.supportPhone && (
        <p>
          <strong>Phone:</strong> {BUSINESS_CONFIG.supportPhone}
        </p>
      )}
      <p>
        <strong>Hours:</strong> {BUSINESS_CONFIG.supportHours}
      </p>

      <h2>Business Details</h2>
      <p>
        <strong>Entity Name:</strong> {BUSINESS_CONFIG.registeredCompanyName}
      </p>
      
      {BUSINESS_CONFIG.registeredAddress && (
        <p>
          <strong>Registered Address:</strong><br />
          <span className="whitespace-pre-wrap">{BUSINESS_CONFIG.registeredAddress}</span>
        </p>
      )}

      {BUSINESS_CONFIG.gstin && (
        <p>
          <strong>GSTIN:</strong> {BUSINESS_CONFIG.gstin}
        </p>
      )}

    </LegalLayout>
  );
}
