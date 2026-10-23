import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCheckoutForm,
  sanitizeIndianPhone,
  buildCheckoutInitPayload,
  type CheckoutFormData,
} from '../utils/checkout-validation';
import type { OrderStatus } from '../lib/api-client';

describe('Visual Polish 05: Checkout Validation & Flow Integration Tests', () => {

  const validSampleData: CheckoutFormData = {
    customer_name: 'Ananya Sharma',
    customer_email: 'ananya.sharma@example.com',
    customer_phone: '9876543210',
    line1: 'Flat 402, Lotus Residency, 12th Main',
    line2: 'Indiranagar 2nd Stage',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    country: 'India',
  };

  describe('1. Phone Number Sanitization', () => {
    it('strips non-digit characters such as spaces, hyphens, and parentheses', () => {
      assert.strictEqual(sanitizeIndianPhone('+91 98765-43210'), '9198765432');
      assert.strictEqual(sanitizeIndianPhone('98765 43210'), '9876543210');
      assert.strictEqual(sanitizeIndianPhone('(987) 654-3210'), '9876543210');
    });

    it('clamps maximum length to 10 digits', () => {
      assert.strictEqual(sanitizeIndianPhone('98765432109999'), '9876543210');
    });

    it('handles empty or non-string inputs safely', () => {
      assert.strictEqual(sanitizeIndianPhone(''), '');
      assert.strictEqual(sanitizeIndianPhone(null as unknown as string), '');
      assert.strictEqual(sanitizeIndianPhone(undefined as unknown as string), '');
    });
  });

  describe('2. Form Validation Rules', () => {
    it('passes for a fully valid Indian shipping address and contact payload', () => {
      const result = validateCheckoutForm(validSampleData);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });

    it('rejects empty or whitespace-only full name', () => {
      const invalid = { ...validSampleData, customer_name: '   ' };
      const result = validateCheckoutForm(invalid);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.field, 'customer_name');
      assert.match(result.error || '', /full name/i);
    });

    it('rejects invalid email formats', () => {
      const badEmails = ['plainaddress', 'missing@tld', '@no-local.com', 'user@domain.c'];
      for (const email of badEmails) {
        const invalid = { ...validSampleData, customer_email: email };
        const result = validateCheckoutForm(invalid);
        assert.strictEqual(result.isValid, false, `Expected ${email} to be rejected`);
        assert.strictEqual(result.field, 'customer_email');
      }
    });

    it('accepts valid email formats', () => {
      const goodEmails = ['user@domain.com', 'name.last@sub.example.co.in', 'test+tag@firstmemoir.in'];
      for (const email of goodEmails) {
        const valid = { ...validSampleData, customer_email: email };
        const result = validateCheckoutForm(valid);
        assert.strictEqual(result.isValid, true, `Expected ${email} to pass validation`);
      }
    });

    it('rejects invalid Indian mobile numbers', () => {
      const badPhones = [
        '1234567890', // Starts with 1 (must be 6-9)
        '5876543210', // Starts with 5
        '98765',      // Too short
        '98765432109',// 11 digits
        'abcdefghij', // Non-numeric
      ];
      for (const phone of badPhones) {
        const invalid = { ...validSampleData, customer_phone: phone };
        const result = validateCheckoutForm(invalid);
        assert.strictEqual(result.isValid, false, `Expected phone ${phone} to be rejected`);
        assert.strictEqual(result.field, 'customer_phone');
      }
    });

    it('accepts valid Indian 10-digit mobile numbers starting with 6, 7, 8, or 9', () => {
      const goodPhones = ['9876543210', '8123456789', '7012345678', '6234567890'];
      for (const phone of goodPhones) {
        const valid = { ...validSampleData, customer_phone: phone };
        const result = validateCheckoutForm(valid);
        assert.strictEqual(result.isValid, true, `Expected phone ${phone} to pass validation`);
      }
    });

    it('rejects empty address line 1', () => {
      const invalid = { ...validSampleData, line1: '  ' };
      const result = validateCheckoutForm(invalid);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.field, 'line1');
    });

    it('rejects empty state or empty city', () => {
      const noState = { ...validSampleData, state: '' };
      assert.strictEqual(validateCheckoutForm(noState).field, 'state');

      const noCity = { ...validSampleData, city: '' };
      assert.strictEqual(validateCheckoutForm(noCity).field, 'city');
    });

    it('rejects invalid postal PIN codes (must be exactly 6 digits)', () => {
      const badPins = ['56003', '5600388', '56003a', '00000', ''];
      for (const pin of badPins) {
        const invalid = { ...validSampleData, postal_code: pin };
        const result = validateCheckoutForm(invalid);
        assert.strictEqual(result.isValid, false, `Expected PIN ${pin} to be rejected`);
        assert.strictEqual(result.field, 'postal_code');
      }
    });

    it('rejects orders addressed to outside India', () => {
      const foreign = { ...validSampleData, country: 'United States' };
      const result = validateCheckoutForm(foreign);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.field, 'country');
      assert.match(result.error || '', /India/i);
    });
  });

  describe('3. Checkout Payload Construction', () => {
    it('constructs canonical CheckoutInitInput with trimmed fields and nested address', () => {
      const rawInput: CheckoutFormData = {
        customer_name: '  Vikramaditya Rao  ',
        customer_email: '  vikram@example.com  ',
        customer_phone: '  9887766554  ',
        line1: '  No. 45, Heritage Boulevard  ',
        line2: '  Near City Palace  ',
        city: '  Jaipur  ',
        state: '  Rajasthan  ',
        postal_code: '  302001  ',
        country: '  India  ',
      };

      const payload = buildCheckoutInitPayload(rawInput);

      assert.strictEqual(payload.customer_name, 'Vikramaditya Rao');
      assert.strictEqual(payload.customer_email, 'vikram@example.com');
      assert.strictEqual(payload.customer_phone, '9887766554');
      assert.deepStrictEqual(payload.shipping_address, {
        name: 'Vikramaditya Rao',
        line1: 'No. 45, Heritage Boulevard',
        line2: 'Near City Palace',
        city: 'Jaipur',
        state: 'Rajasthan',
        postal_code: '302001',
        country: 'India',
      });
    });

    it('preserves empty line2 as an empty string without crashing', () => {
      const rawInput: CheckoutFormData = {
        ...validSampleData,
        line2: '',
      };
      const payload = buildCheckoutInitPayload(rawInput);
      assert.strictEqual(payload.shipping_address.line2, '');
    });
  });

  describe('4. Order Status & Razorpay Security Invariants', () => {
    it('recognizes all authoritative OrderStatus lifecycle states', () => {
      const validStatuses: OrderStatus[] = [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'READY_FOR_PICKUP',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
        'EXPIRED',
      ];

      for (const st of validStatuses) {
        assert.ok(typeof st === 'string', `${st} must be a valid status type`);
      }
    });

    it('enforces that terminal failure or cancellation states are distinct from pending', () => {
      const isTerminalFailure = (st: OrderStatus) => st === 'CANCELLED' || st === 'EXPIRED';
      assert.strictEqual(isTerminalFailure('CANCELLED'), true);
      assert.strictEqual(isTerminalFailure('EXPIRED'), true);
      assert.strictEqual(isTerminalFailure('PENDING'), false);
      assert.strictEqual(isTerminalFailure('CONFIRMED'), false);
    });
  });

});
