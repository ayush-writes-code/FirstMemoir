import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyProductName,
  resolveCanonicalCartImageUrl,
  resolveProductPageHref,
  CANONICAL_R2_PUBLIC_URL
} from '../utils/cart-image';

describe('Storefront Cart Image Resolution Tests', () => {
  it('slugifyProductName converts product names cleanly to kebab-case', () => {
    assert.strictEqual(slugifyProductName('Motivation Quote Frame 30'), 'motivation-quote-frame-30');
    assert.strictEqual(slugifyProductName('Porsche GT3 RS Frame'), 'porsche-gt3-rs-frame');
    assert.strictEqual(slugifyProductName('F&F Cars (Camaro)'), 'f-f-cars-camaro');
    assert.strictEqual(slugifyProductName(''), '');
  });

  it('prioritizes item.preview_url for custom cropped photo prints', () => {
    const item = {
      preview_url: 'https://cdn.example.com/previews/user-crop-123.jpg',
      product_image: 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/custom/primary.webp',
      product_name: 'Custom Framed Print',
      product_slug: 'custom-framed-print'
    };
    const resolved = resolveCanonicalCartImageUrl(item);
    assert.strictEqual(resolved, 'https://cdn.example.com/previews/user-crop-123.jpg');
  });

  it('uses item.product_image when preview_url is not set', () => {
    const item = {
      preview_url: null,
      product_image: 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/motivation-quote-frame-30/primary.webp',
      product_name: 'Motivation Quote Frame 30',
      product_slug: 'motivation-quote-frame-30'
    };
    const resolved = resolveCanonicalCartImageUrl(item);
    assert.strictEqual(resolved, 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/products/motivation-quote-frame-30/primary.webp');
  });

  it('resolves Motivation Quote Frame 30 via product_name when product_image is missing (e.g. pre-migration cart)', () => {
    const item = {
      preview_url: null,
      product_image: null,
      product_name: 'Motivation Quote Frame 30',
    };
    const resolved = resolveCanonicalCartImageUrl(item);
    assert.strictEqual(
      resolved,
      `${CANONICAL_R2_PUBLIC_URL}/products/motivation-quote-frame-30/primary.webp`
    );
  });

  it('resolves legacy alias slugs (porsche-gt3-rs-frame -> porsche-gt3-rs-wall-frame-set)', () => {
    const item = {
      preview_url: null,
      product_image: null,
      product_slug: 'porsche-gt3-rs-frame',
      product_name: 'Porsche GT3 RS Frame'
    };
    const resolved = resolveCanonicalCartImageUrl(item);
    assert.strictEqual(
      resolved,
      `${CANONICAL_R2_PUBLIC_URL}/products/porsche-gt3-rs-wall-frame-set/primary.webp`
    );
  });

  it('returns null if item has no identifiers', () => {
    const item = {
      preview_url: null,
      product_image: null,
      product_name: null,
      product_slug: null
    };
    assert.strictEqual(resolveCanonicalCartImageUrl(item), null);
  });

  it('derives correct product page href with alias mapping', () => {
    assert.strictEqual(
      resolveProductPageHref({ product_slug: 'porsche-gt3-rs-frame' }),
      '/products/porsche-gt3-rs-wall-frame-set'
    );
    assert.strictEqual(
      resolveProductPageHref({ product_name: 'Motivation Quote Frame 30' }),
      '/products/motivation-quote-frame-30'
    );
  });
});
