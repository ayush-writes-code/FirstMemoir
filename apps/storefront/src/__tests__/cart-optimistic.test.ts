import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useCartStore } from '../store/cart.store';
import type { CartDto, CartLineItemDto } from '@/lib/api-client';

const mockItem: CartLineItemDto = {
  id: 'item-123',
  cart_id: 'cart-456',
  product_id: 'prod-789',
  quantity: 1,
  status: 'VALIDATED',
  upload_id: 'upload-abc',
  preview_url: 'https://staging.assets/preview.jpg',
  orientation: 'PORTRAIT',
  crop: { x: 0, y: 0, width: 1, height: 1, aspect_ratio: '1:1' },
  rotation: 0,
  zoom: 1,
  effective_dpi: 300,
  print_quality_status: 'EXCELLENT',
  dpi_acknowledged: false,
  pricing_version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  product_name: 'Porsche GT3 RS Wall Frame Set',
  unit_price: 249,
  selected_options: [],
};

const mockCart: CartDto = {
  id: 'cart-456',
  session_id: 'session-789',
  user_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [mockItem],
};

describe('Slice 6C.5: Storefront Optimistic Cart Mutations & Concurrency Protection', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.setState({ cart: JSON.parse(JSON.stringify(mockCart)), isLoading: false, mutatingItemIds: [], error: null });
  });

  it('should immediately apply optimistic quantity update and reconcile with server', async () => {
    const origFetch = globalThis.fetch;
    let serverCalled = false;

    try {
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/cart/items/item-123') && init?.method === 'PATCH') {
          serverCalled = true;
          // Verify that while request is in flight, the store ALREADY reflects the new quantity
          const inFlightCart = useCartStore.getState().cart;
          assert.strictEqual(inFlightCart?.items[0]?.quantity, 3, 'Store must optimistically reflect quantity 3 in flight');
          assert.ok(useCartStore.getState().mutatingItemIds.includes('item-123'), 'Item must be flagged as mutating');

          return new Response(JSON.stringify({
            success: true,
            data: {
              ...mockItem,
              quantity: 3,
              updated_at: new Date().toISOString(),
            },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return origFetch(url, init);
      }) as typeof globalThis.fetch;

      await useCartStore.getState().updateQuantity('item-123', 3);

      assert.strictEqual(serverCalled, true, 'Server API must have been invoked');
      const finalCart = useCartStore.getState().cart;
      assert.strictEqual(finalCart?.items[0]?.quantity, 3);
      assert.strictEqual(useCartStore.getState().mutatingItemIds.length, 0, 'mutatingItemIds must be cleared after resolution');
      assert.strictEqual(useCartStore.getState().error, null);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('should roll back quantity to previous value when server update fails', async () => {
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/cart/items/item-123') && init?.method === 'PATCH') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Out of stock or invalid quantity',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return origFetch(url, init);
      }) as typeof globalThis.fetch;

      await useCartStore.getState().updateQuantity('item-123', 5);

      const finalCart = useCartStore.getState().cart;
      assert.strictEqual(finalCart?.items[0]?.quantity, 1, 'Quantity must roll back to 1 on failure');
      assert.strictEqual(useCartStore.getState().error, 'Out of stock or invalid quantity');
      assert.strictEqual(useCartStore.getState().mutatingItemIds.length, 0, 'mutatingItemIds must be cleared on rollback');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('should prevent duplicate concurrent submissions while a mutation is in progress for the same line item', async () => {
    const origFetch = globalThis.fetch;
    let callCount = 0;

    try {
      let resolveFirstCall: (res: Response) => void;
      const firstCallPromise = new Promise<Response>((resolve) => {
        resolveFirstCall = resolve;
      });

      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/cart/items/item-123') && init?.method === 'PATCH') {
          callCount++;
          return firstCallPromise;
        }
        return origFetch(url, init);
      }) as typeof globalThis.fetch;

      // Trigger first update (in flight)
      const promise1 = useCartStore.getState().updateQuantity('item-123', 2);

      // Attempt second duplicate update immediately while first is in flight
      const promise2 = useCartStore.getState().updateQuantity('item-123', 3);

      assert.strictEqual(callCount, 1, 'Second concurrent call must be dropped by mutation guard');

      // Resolve the first call
      resolveFirstCall!(new Response(JSON.stringify({
        success: true,
        data: { ...mockItem, quantity: 2 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      await Promise.all([promise1, promise2]);
      assert.strictEqual(callCount, 1, 'Total calls must remain 1');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('should optimistically remove item and roll back if deletion fails', async () => {
    const origFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes('/cart/items/item-123') && init?.method === 'DELETE') {
          // While in flight, the item is already removed from store
          const inFlightCart = useCartStore.getState().cart;
          assert.strictEqual(inFlightCart?.items.length, 0, 'Item must be optimistically removed');
          return new Response(JSON.stringify({
            success: false,
            error: 'Deletion forbidden',
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return origFetch(url, init);
      }) as typeof globalThis.fetch;

      await useCartStore.getState().removeItem('item-123');

      // On failure, item must be restored
      const finalCart = useCartStore.getState().cart;
      assert.strictEqual(finalCart?.items.length, 1, 'Item must be restored on failure');
      assert.strictEqual(finalCart?.items[0]?.id, 'item-123');
      assert.strictEqual(useCartStore.getState().error, 'Deletion forbidden');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
