import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductImageUrl } from '../product.service.js';
import { env } from '../../config/env.js';

describe('Slice Phase 2: Product Image URL Construction & Security Sanitization', () => {
  const origPublicUrl = env.R2_PUBLIC_URL;

  it('should normalize leading slash on standard relative keys', () => {
    env.R2_PUBLIC_URL = 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';
    const result = buildProductImageUrl('/products/ff-camaro-frame/primary.webp');
    assert.strictEqual(
      result,
      'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/ff-camaro-frame/primary.webp',
      'Must eliminate double slash when input has a leading slash'
    );
  });

  it('should handle relative key without leading slash identically', () => {
    env.R2_PUBLIC_URL = 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';
    const result = buildProductImageUrl('products/ff-camaro-frame/primary.webp');
    assert.strictEqual(
      result,
      'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/ff-camaro-frame/primary.webp'
    );
  });

  it('should normalize multiple leading slashes', () => {
    env.R2_PUBLIC_URL = 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';
    const result = buildProductImageUrl('///products/ff-camaro-frame/gallery-1.webp');
    assert.strictEqual(
      result,
      'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/ff-camaro-frame/gallery-1.webp'
    );
  });

  it('should handle R2_PUBLIC_URL with a trailing slash without creating double slashes', () => {
    env.R2_PUBLIC_URL = 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/';
    const result = buildProductImageUrl('/products/sample.webp');
    assert.strictEqual(
      result,
      'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/sample.webp',
      'Trailing slash on base and leading slash on key must collapse to single slash'
    );
  });

  it('should preserve valid absolute HTTPS URLs unchanged', () => {
    const externalUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800';
    const result = buildProductImageUrl(externalUrl);
    assert.strictEqual(result, externalUrl);
  });

  it('should preserve valid absolute HTTP URLs unchanged', () => {
    const externalHttp = 'http://example.com/mockup-art.jpg';
    const result = buildProductImageUrl(externalHttp);
    assert.strictEqual(result, externalHttp);
  });

  it('should reject arbitrary / dangerous URL schemes', () => {
    assert.throws(
      () => buildProductImageUrl('javascript:alert(1)'),
      /Unsupported URL scheme/,
      'Must reject javascript: pseudo-protocol'
    );
    assert.throws(
      () => buildProductImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'),
      /Unsupported URL scheme/,
      'Must reject data: URLs'
    );
    assert.throws(
      () => buildProductImageUrl('file:///etc/passwd'),
      /Unsupported URL scheme/,
      'Must reject file:// protocol'
    );
  });

  it('should reject directory traversal in storage keys', () => {
    assert.throws(
      () => buildProductImageUrl('products/../../etc/shadow'),
      /path traversal not allowed/,
      'Must reject .. segments in key'
    );
    assert.throws(
      () => buildProductImageUrl('/products/../secret.json'),
      /path traversal not allowed/
    );
  });

  it('should strictly reject private customer upload keys from public URL construction', () => {
    assert.throws(
      () => buildProductImageUrl('customers/customer-photo-raw.jpg'),
      /Forbidden: Cannot generate public URL for private key/,
      'Must never expose customers/* via public URL helper'
    );
    assert.throws(
      () => buildProductImageUrl('/customers/customer-photo-raw.jpg'),
      /Forbidden: Cannot generate public URL for private key/
    );
  });

  it('should strictly reject private preview proxy keys from public URL construction', () => {
    assert.throws(
      () => buildProductImageUrl('previews/preview-proxy-thumb.webp'),
      /Forbidden: Cannot generate public URL for private key/,
      'Must never expose previews/* via public URL helper'
    );
    assert.throws(
      () => buildProductImageUrl('/previews/preview-proxy-thumb.webp'),
      /Forbidden: Cannot generate public URL for private key/
    );
  });

  it('should normalize interim catalog placeholder keys without double slashes', () => {
    env.R2_PUBLIC_URL = 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev';
    const result = buildProductImageUrl('/catalog/frames/ffc-camaro-1.jpg');
    assert.strictEqual(
      result,
      'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/catalog/frames/ffc-camaro-1.jpg'
    );
  });

  it('should handle empty or falsy inputs gracefully', () => {
    assert.strictEqual(buildProductImageUrl(''), '');
    assert.strictEqual(buildProductImageUrl(null as unknown as string), '');
    assert.strictEqual(buildProductImageUrl(undefined as unknown as string), '');
  });

  // Restore environment after suite
  env.R2_PUBLIC_URL = origPublicUrl;
});
