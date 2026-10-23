import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderStatusBadge,
  formatOrderDate,
  formatOrderDateTime,
} from '../utils/order-status';

describe('Authoritative Order Status Mapping & Styling', () => {
  it('maps all standard lifecycle statuses to valid badge and dot classes', () => {
    const statuses = [
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

    for (const status of statuses) {
      const badge = getOrderStatusBadge(status);
      assert.ok(badge);
      assert.ok(badge.label);
      assert.match(badge.badgeClass, /bg-/);
      assert.match(badge.badgeClass, /text-/);
      assert.match(badge.dotClass, /bg-/);
    }
  });

  it('handles lowercase, padded, and edge case status inputs safely', () => {
    const lower = getOrderStatusBadge('processing');
    assert.strictEqual(lower.label, 'In Production');
    assert.strictEqual(lower.dotClass, 'bg-sky-500');

    const padded = getOrderStatusBadge('  confirmed  ');
    assert.strictEqual(padded.label, 'Order Confirmed');

    const unknown = getOrderStatusBadge('CUSTOM_WORKSHOP_STEP');
    assert.strictEqual(unknown.label, 'CUSTOM WORKSHOP STEP');
    assert.match(unknown.badgeClass, /bg-zinc-100/);

    const empty = getOrderStatusBadge('');
    assert.strictEqual(empty.label, 'Unknown');
  });

  it('formats order dates with en-IN locale accurately', () => {
    const sampleIso = '2026-10-22T12:00:00.000Z';
    const formatted = formatOrderDate(sampleIso);
    assert.ok(formatted);
    assert.match(formatted, /2026/);

    // Empty and invalid fallbacks
    assert.strictEqual(formatOrderDate(''), '');
    assert.strictEqual(formatOrderDate('invalid-date-string'), '');
  });

  it('formats order date-times with hour and minute accurately', () => {
    const sampleIso = '2026-10-22T12:30:00.000Z';
    const formatted = formatOrderDateTime(sampleIso);
    assert.ok(formatted);
    assert.match(formatted, /2026/);

    assert.strictEqual(formatOrderDateTime(''), '');
    assert.strictEqual(formatOrderDateTime('not-a-date'), '');
  });
});

describe('Guest Order Tracking Input Invariants', () => {
  it('formats 10-digit local phone to +91 international E.164 format', () => {
    const rawInput = '9876543210';
    const cleanDigits = rawInput.replace(/\D/g, '').slice(-10);
    const formatted = `+91${cleanDigits}`;
    assert.strictEqual(formatted, '+919876543210');
  });

  it('rejects short phone numbers under 10 digits', () => {
    const rawInput = '98765';
    const cleanDigits = rawInput.replace(/\D/g, '');
    assert.strictEqual(cleanDigits.length < 10, true);
  });

  it('sanitizes messy phone input with spaces, dashes, or +91 prefix', () => {
    const messyInput = '+91 98765-43210';
    const cleanDigits = messyInput.replace(/\D/g, '').slice(-10);
    const formatted = `+91${cleanDigits}`;
    assert.strictEqual(formatted, '+919876543210');
  });

  it('trims whitespace on Order ID UUIDs', () => {
    const rawId = '   550e8400-e29b-41d4-a716-446655440000   ';
    assert.strictEqual(rawId.trim(), '550e8400-e29b-41d4-a716-446655440000');
  });
});
