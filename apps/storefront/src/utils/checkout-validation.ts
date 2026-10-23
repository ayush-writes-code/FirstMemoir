import type { CheckoutInitInput } from '@/lib/api-client';

export interface CheckoutFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  field?: keyof CheckoutFormData;
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
export const INDIAN_PINCODE_REGEX = /^\d{6}$/;

/**
 * Sanitizes phone input to keep only up to 10 digits.
 */
export function sanitizeIndianPhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const digitsOnly = input.replace(/\D/g, '');
  return digitsOnly.slice(0, 10);
}

/**
 * Validates checkout form data against Indian shipping and contact requirements.
 */
export function validateCheckoutForm(data: CheckoutFormData): ValidationResult {
  if (!data.customer_name || data.customer_name.trim() === '') {
    return { isValid: false, error: 'Please enter your full name.', field: 'customer_name' };
  }

  const trimmedEmail = data.customer_email?.trim() || '';
  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address.', field: 'customer_email' };
  }

  const phone = data.customer_phone?.trim() || '';
  if (!phone || !INDIAN_PHONE_REGEX.test(phone)) {
    return { isValid: false, error: 'Please enter a valid 10-digit Indian phone number.', field: 'customer_phone' };
  }

  if (!data.line1 || data.line1.trim() === '') {
    return { isValid: false, error: 'Address Line 1 is required.', field: 'line1' };
  }

  if (!data.state || data.state.trim() === '') {
    return { isValid: false, error: 'Please select your delivery state.', field: 'state' };
  }

  if (!data.city || data.city.trim() === '') {
    return { isValid: false, error: 'Please select or enter your city.', field: 'city' };
  }

  const pin = data.postal_code?.trim() || '';
  if (!pin || !INDIAN_PINCODE_REGEX.test(pin)) {
    return { isValid: false, error: 'Please enter a valid 6-digit postal code.', field: 'postal_code' };
  }

  if (data.country !== 'India') {
    return { isValid: false, error: 'Shipping is only available in India.', field: 'country' };
  }

  return { isValid: true };
}

/**
 * Builds the canonical CheckoutInitInput payload for the backend API.
 */
export function buildCheckoutInitPayload(data: CheckoutFormData): CheckoutInitInput {
  return {
    customer_name: data.customer_name.trim(),
    customer_email: data.customer_email.trim(),
    customer_phone: data.customer_phone.trim(),
    shipping_address: {
      name: data.customer_name.trim(),
      line1: data.line1.trim(),
      line2: data.line2.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      postal_code: data.postal_code.trim(),
      country: data.country.trim(),
    },
  };
}
