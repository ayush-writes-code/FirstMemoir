import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_CONFIG } from '@/config/business';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="August 2026">
      <p>
        At {BUSINESS_CONFIG.brandName}, we value your privacy. This Privacy Policy outlines how we collect, use, and protect your personal information when you visit our website or make a purchase.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        When you make a purchase or attempt to make a purchase, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, and phone number.
      </p>
      <p>
        Additionally, to provide our custom printing services, we securely store the photographs and images you upload.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To fulfill any orders placed through the Site (including processing payment and arranging shipping).</li>
        <li>To communicate with you regarding your order status.</li>
        <li>To screen our orders for potential risk or fraud.</li>
      </ul>

      <h2>3. Data Retention and Deletion</h2>
      <p>
        We retain your uploaded images only for the duration necessary to manufacture and fulfill your order, and to handle any potential immediate reprints due to transit damage.
      </p>

      <h2>4. Payment Security</h2>
      <p>
        We use industry-standard payment gateways to process transactions. We do not store your raw credit card or UPI details on our servers.
      </p>

      <h2>5. Grievance Officer</h2>
      <p>
        In accordance with the Information Technology Act, the contact details of our Grievance Officer are:
      </p>
      <p>
        Name: {BUSINESS_CONFIG.grievanceOfficer.name || '[To be assigned]'}<br />
        Email: {BUSINESS_CONFIG.grievanceOfficer.email || BUSINESS_CONFIG.supportEmail}
      </p>
    </LegalLayout>
  );
}
