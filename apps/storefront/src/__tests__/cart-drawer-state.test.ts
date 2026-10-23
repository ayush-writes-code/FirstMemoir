import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useCartStore } from '../store/cart.store';
import type { CartDto, CartLineItemDto } from '@/lib/api-client';

const mockItemA: CartLineItemDto = {
  id: 'item-drawer-1',
  cart_id: 'cart-drawer-test',
  product_id: 'prod-101',
  quantity: 2,
  status: 'VALIDATED',
  upload_id: null,
  preview_url: null,
  orientation: 'PORTRAIT',
  crop: null,
  rotation: 0,
  zoom: 1,
  effective_dpi: 300,
  print_quality_status: 'EXCELLENT',
  dpi_acknowledged: false,
  pricing_version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  product_name: 'Gallery Oak Frame Set',
  unit_price: 1299,
  selected_options: [
    {
      option_id: 'opt-size',
      option_name: 'Size',
      value_name: '12x18 inches',
      price_modifier: 0,
    },
  ],
};

const mockItemB: CartLineItemDto = {
  id: 'item-drawer-2',
  cart_id: 'cart-drawer-test',
  product_id: 'prod-102',
  quantity: 1,
  status: 'VALIDATED',
  upload_id: 'upload-xyz',
  preview_url: 'https://staging.assets/custom-preview.jpg',
  orientation: 'LANDSCAPE',
  crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8, aspect_ratio: '3:2' },
  rotation: 0,
  zoom: 1,
  effective_dpi: 320,
  print_quality_status: 'EXCELLENT',
  dpi_acknowledged: false,
  pricing_version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  product_name: 'Custom Matte Print',
  unit_price: 799,
  selected_options: [],
};

const mockCart: CartDto = {
  id: 'cart-drawer-test',
  session_id: 'session-drawer-test',
  user_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [mockItemA, mockItemB],
};

describe('Visual Polish 04: Cart Drawer State & Concurrency Tests', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.setState({
      cart: JSON.parse(JSON.stringify(mockCart)),
      isLoading: false,
      isDrawerOpen: false,
      mutatingItemIds: [],
      error: null,
    });
  });

  it('starts with isDrawerOpen as false and toggles correctly with openDrawer/closeDrawer', () => {
    assert.strictEqual(useCartStore.getState().isDrawerOpen, false, 'Drawer should be closed by default');

    useCartStore.getState().openDrawer();
    assert.strictEqual(useCartStore.getState().isDrawerOpen, true, 'Drawer should be open after openDrawer()');

    useCartStore.getState().closeDrawer();
    assert.strictEqual(useCartStore.getState().isDrawerOpen, false, 'Drawer should be closed after closeDrawer()');
  });

  it('correctly computes aggregate item count and subtotal for drawer display', () => {
    const cart = useCartStore.getState().cart;
    assert.ok(cart, 'Cart should exist');

    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    // 2 of Item A (₹1299 each) + 1 of Item B (₹799 each) = 2*1299 + 799 = 2598 + 799 = 3397
    assert.strictEqual(totalQuantity, 3, 'Total quantity should equal 3');
    assert.strictEqual(subtotal, 3397, 'Subtotal should equal ₹3,397');
  });

  it('automatically triggers isDrawerOpen upon successful addToCart call', async () => {
    const origFetch = globalThis.fetch;

    try {
      // Mock fetch for adding an item
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/cart/items') && init?.method === 'POST') {
          const newItem: CartLineItemDto = {
            id: 'item-drawer-3',
            cart_id: 'cart-drawer-test',
            product_id: 'prod-103',
            quantity: 1,
            status: 'VALIDATED',
            upload_id: null,
            preview_url: null,
            orientation: 'PORTRAIT',
            crop: null,
            rotation: 0,
            zoom: 1,
            effective_dpi: 300,
            print_quality_status: 'EXCELLENT',
            dpi_acknowledged: false,
            pricing_version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product_name: 'Archival Poster',
            unit_price: 499,
            selected_options: [],
          };

          return new Response(JSON.stringify({
            success: true,
            data: newItem,
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: false }), { status: 400 });
      }) as typeof globalThis.fetch;

      assert.strictEqual(useCartStore.getState().isDrawerOpen, false);

      await useCartStore.getState().addToCart({
        product_id: 'prod-103',
        quantity: 1,
        selected_option_value_ids: [],
      });

      assert.strictEqual(
        useCartStore.getState().isDrawerOpen,
        true,
        'Drawer must automatically open when an item is added to cart'
      );
      assert.strictEqual(
        useCartStore.getState().cart?.items.length,
        3,
        'Cart should now have 3 items'
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('preserves line item mutation guard while drawer updates quantity', async () => {
    const origFetch = globalThis.fetch;

    try {
      let resolveFetch!: (res: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      globalThis.fetch = (() => fetchPromise) as typeof globalThis.fetch;

      // Start mutating item A quantity
      const updatePromise = useCartStore.getState().updateQuantity('item-drawer-1', 4);

      // Verify immediate optimistic update
      assert.strictEqual(
        useCartStore.getState().cart?.items[0]?.quantity,
        4,
        'Must optimistically reflect quantity 4'
      );
      assert.ok(
        useCartStore.getState().mutatingItemIds.includes('item-drawer-1'),
        'Item must be in mutatingItemIds'
      );

      // Concurrent update attempt on the same item while in flight must be ignored
      await useCartStore.getState().updateQuantity('item-drawer-1', 5);
      assert.strictEqual(
        useCartStore.getState().cart?.items[0]?.quantity,
        4,
        'Concurrent mutation must be ignored'
      );

      // Resolve the original request
      const updatedItemA = { ...mockItemA, quantity: 4 };
      resolveFetch(new Response(JSON.stringify({
        success: true,
        data: updatedItemA,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

      await updatePromise;

      assert.strictEqual(
        useCartStore.getState().mutatingItemIds.includes('item-drawer-1'),
        false,
        'Item mutation lock must be released after completion'
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
