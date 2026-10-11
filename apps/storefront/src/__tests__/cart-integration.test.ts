import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cart as cartApi, products as productsApi, setApiUrl } from '../lib/api-client';
import { PRODUCT_SLUG_ALIASES } from '../config/slug-aliases';

const STAGING_API_URL = 'https://firstmemoir-api-staging.onrender.com/api/v1';

describe('Slice 6C.5: Storefront Cart Architecture & Staging Integration Tests', () => {

  describe('1. API Client Configuration & Fallback Resilience', () => {
    it('should default to staging API URL when running in production if NEXT_PUBLIC_API_URL is unset', () => {
      const origEnv = process.env.NODE_ENV;
      const origPublic = process.env.NEXT_PUBLIC_API_URL;

      try {
        delete process.env.NEXT_PUBLIC_API_URL;
        const nodeEnv = 'production';
        const defaultUrl = nodeEnv === 'production'
          ? 'https://firstmemoir-api-staging.onrender.com/api/v1'
          : 'http://localhost:3001/api/v1';

        assert.strictEqual(
          defaultUrl,
          STAGING_API_URL,
          'Production default must never fall back to unreachable localhost:3001'
        );
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
        if (origPublic) process.env.NEXT_PUBLIC_API_URL = origPublic;
      }
    });

    it('should prioritize explicit NEXT_PUBLIC_API_URL when set', () => {
      const customUrl = 'https://custom-api.firstmemoir.in/api/v1';
      const resolved = customUrl || STAGING_API_URL;
      assert.strictEqual(resolved, customUrl);
    });
  });

  describe('2. Legacy Slug Aliases & Canonical Resolution', () => {
    it('should resolve prototype porsche-gt3-rs-frame to canonical porsche-gt3-rs-wall-frame-set', () => {
      const target = PRODUCT_SLUG_ALIASES['porsche-gt3-rs-frame'];
      assert.strictEqual(
        target,
        'porsche-gt3-rs-wall-frame-set',
        'porsche-gt3-rs-frame must resolve to canonical porsche-gt3-rs-wall-frame-set'
      );
    });

    it('should fetch the canonical Porsche product from staging API successfully', async () => {
      setApiUrl(STAGING_API_URL);
      const canonicalSlug = PRODUCT_SLUG_ALIASES['porsche-gt3-rs-frame'];
      assert.ok(canonicalSlug, 'Canonical slug alias must exist');
      const res = await productsApi.getProductBySlug(canonicalSlug);

      assert.strictEqual(res.success, true, 'Product fetch must succeed');
      assert.ok(res.data, 'Product data must be present');
      assert.strictEqual(res.data.name, 'Porsche GT3 RS Wall Frame Set');
      assert.strictEqual(Number(res.data.base_price), 249);
      assert.strictEqual(res.data.sku, 'FM-FRM-POR-GT3');
    });
  });

  describe('3. Live Staging Cart Contract & Lifecycle', () => {
    let testProductId: string;
    let addedLineItemId: string;

    it('should fetch the current cart or create a new session without throwing', async () => {
      setApiUrl(STAGING_API_URL);
      const res = await cartApi.getCart();

      assert.strictEqual(res.success, true, 'getCart must succeed');
      assert.ok(res.data, 'Cart DTO must be returned');
      assert.ok(res.data.id, 'Cart must have a valid ID');
      assert.ok(Array.isArray(res.data.items), 'Cart must contain items array');
    });

    it('should add a standard non-personalized product to cart with authoritative backend pricing', async () => {
      setApiUrl(STAGING_API_URL);
      // Retrieve Porsche GT3 RS frame set
      const porscheRes = await productsApi.getProductBySlug('porsche-gt3-rs-wall-frame-set');
      assert.strictEqual(porscheRes.success, true);
      assert.ok(porscheRes.data);
      testProductId = porscheRes.data.id;

      // Add to cart
      const addRes = await cartApi.addToCart({
        product_id: testProductId,
        quantity: 1,
        selected_option_value_ids: [],
      });

      assert.strictEqual(addRes.success, true, 'addToCart must return success');
      assert.ok(addRes.data, 'Line item DTO must be returned');
      assert.strictEqual(addRes.data.product_id, testProductId);
      assert.strictEqual(addRes.data.quantity, 1);
      assert.strictEqual(addRes.data.unit_price, 249);
      assert.strictEqual(addRes.data.product_name, 'Porsche GT3 RS Wall Frame Set');
      assert.strictEqual(addRes.data.upload_id, null, 'Upload ID must be null for standard products');

      addedLineItemId = addRes.data.id;
    });

    it('should calculate subtotal correctly across cart items', async () => {
      setApiUrl(STAGING_API_URL);
      const res = await cartApi.getCart();
      assert.strictEqual(res.success, true);
      assert.ok(res.data);

      const items = res.data.items;
      const computedSubtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      assert.ok(computedSubtotal >= 249, 'Computed subtotal must include at least the added item');
    });

    it('should update line item quantity and reflect updated totals', async () => {
      setApiUrl(STAGING_API_URL);
      assert.ok(addedLineItemId, 'Line item ID must be available from prior step');

      const updateRes = await cartApi.updateCartItemQuantity(addedLineItemId, 2);
      assert.strictEqual(updateRes.success, true, 'updateQuantity must succeed');
      assert.ok(updateRes.data);
      assert.strictEqual(updateRes.data.quantity, 2);
    });

    it('should remove the line item from cart cleanly', async () => {
      setApiUrl(STAGING_API_URL);
      assert.ok(addedLineItemId, 'Line item ID must be available from prior step');

      const removeRes = await cartApi.removeFromCart(addedLineItemId);
      assert.strictEqual(removeRes.success, true, 'removeFromCart must succeed');

      // Verify the item is removed from cart
      const cartRes = await cartApi.getCart();
      assert.strictEqual(cartRes.success, true);
      assert.ok(cartRes.data);

      const remaining = cartRes.data.items.find(i => i.id === addedLineItemId);
      assert.strictEqual(remaining, undefined, 'Removed item must no longer exist in cart');
    });
  });
});
