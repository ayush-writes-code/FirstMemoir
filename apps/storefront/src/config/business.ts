/**
 * BUSINESS & LEGAL CONFIGURATION
 * 
 * This file centralizes all business commitments and legal entity information.
 * It is currently populated with safe, neutral defaults.
 * 
 * TODO(client): Review and provide accurate details for all fields below before production launch.
 */

export const BUSINESS_CONFIG = {
  // Brand name used in UI and marketing
  brandName: 'First Memoir',

  // Official Registered Company Name (TODO: Provide official entity name e.g. First Memoir Pvt. Ltd.)
  registeredCompanyName: 'First Memoir',

  // Official Registered Address (TODO: Provide full physical address)
  registeredAddress: '',

  // GSTIN (TODO: Provide GSTIN if registered)
  gstin: '',

  // Support Email (TODO: Provide dedicated support email)
  supportEmail: 'support@firstmemoir.in',

  // Support Phone (TODO: Provide support phone number if applicable)
  supportPhone: '',

  // Operating Hours (TODO: Define support operating hours)
  supportHours: 'Monday to Friday, 10 AM - 6 PM',

  // Shipping & Dispatch (TODO: Define SLAs)
  shippingSLA: {
    dispatchDays: '3-5 business days',
    deliveryDays: '7-10 business days',
  },

  // Refunds & Cancellations (TODO: Define policies)
  cancellationWindow: 'within 2 hours of order placement',
  returnWindow: 'within 48 hours of delivery for damaged items',
  
  // Grievance Officer (TODO: Provide required details for Indian Privacy Law)
  grievanceOfficer: {
    name: '',
    email: '',
  }
};
