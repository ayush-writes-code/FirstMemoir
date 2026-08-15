import { test, mock } from 'node:test';
import assert from 'node:assert';
import { shiprocketService, AppError } from '../shiprocket.service.js';
import { prisma } from '@repo/database';
import { Prisma } from '@repo/database';

test('ShiprocketService Authentication', async (t) => {
  await t.test('1. Authentication success', async () => {
    process.env.SHIPROCKET_EMAIL = 'test@example.com';
    process.env.SHIPROCKET_PASSWORD = 'password';

    mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({ token: 'mock-token' })
      };
    });

    shiprocketService.token = null; // reset
    const token = await shiprocketService.authenticate();
    assert.strictEqual(token, 'mock-token');
    
    mock.restoreAll();
  });

  await t.test('2. Authentication failure', async () => {
    process.env.SHIPROCKET_EMAIL = 'test@example.com';
    process.env.SHIPROCKET_PASSWORD = 'password';

    mock.method(global, 'fetch', async () => {
      return { ok: false, statusText: 'Unauthorized' };
    });

    shiprocketService.token = null; // reset
    await assert.rejects(() => shiprocketService.authenticate(), /Shiprocket authentication failed/);
    mock.restoreAll();
  });
});

test('ShiprocketService Order Creation Orchestration', async (t) => {
  const mockOrderTemplate = {
    id: 'order-123',
    shiprocket_order_id: null,
    shiprocket_shipment_id: null,
    tracking_awb: null,
    created_at: new Date('2026-08-15T12:00:00Z'),
    customer_email: 'test@weprintit.in',
    customer_phone: '1234567890',
    total_amount: new Prisma.Decimal(1000),
    shipping_address_snapshot: {
      name: 'John Doe',
      line1: '123 Main St',
      city: 'Delhi',
      state: 'DL',
      postal_code: '110001',
      country: 'India'
    },
    items: [
      {
        quantity: 1,
        unit_price: new Prisma.Decimal(1000),
        product: { name: 'Print', sku: 'SKU-01' },
        customization_data: {
          physical_width: 10,
          physical_height: 12,
          physical_dimension_unit: 'in'
        }
      }
    ]
  };

  t.beforeEach(() => {
    shiprocketService.token = 'mock-token';
    shiprocketService.tokenExpiresAt = new Date(Date.now() + 10000);
  });

  t.afterEach(() => {
    mock.restoreAll();
  });

  await t.test('10. PACKAGE_FULFILLMENT_METRICS_UNDEFINED', async () => {
    // We do NOT mock calculateFulfillmentMetrics here
    const baseOrder = JSON.parse(JSON.stringify(mockOrderTemplate));
    baseOrder.created_at = new Date(baseOrder.created_at);
    (prisma as any).order = { findUnique: async () => baseOrder };
    
    await assert.rejects(
      () => shiprocketService.createCustomOrder('order-123'),
      /PACKAGE_FULFILLMENT_METRICS_UNDEFINED/
    );
  });

  await t.test('8 & 9. Missing fulfillment dimensions & weight', async () => {
    // Tests that real prod throws error if missing required business data (it's covered by test 10 basically)
    const baseOrder = JSON.parse(JSON.stringify(mockOrderTemplate));
    baseOrder.items[0].customization_data = null;
    baseOrder.created_at = new Date(baseOrder.created_at);
    (prisma as any).order = { findUnique: async () => baseOrder };

    await assert.rejects(
      () => shiprocketService.createCustomOrder('order-123'),
      /Fulfillment data incomplete: Missing customization_data/
    );
  });

  await t.test('17. Different customization snapshots produce different metrics when a rule exists', async () => {
    // Suppose the future rule returns length = width + padding
    const ruleMock = mock.method(shiprocketService, 'calculateFulfillmentMetrics', (item: any) => {
      const w = Number(item.customization_data.physical_width);
      const h = Number(item.customization_data.physical_height);
      return { length: w + 2, width: h + 2, height: 5, weight_kg: 1 };
    });

    const order1 = JSON.parse(JSON.stringify(mockOrderTemplate));
    order1.created_at = new Date(order1.created_at);
    order1.items[0].customization_data = { physical_width: 8, physical_height: 10, physical_dimension_unit: 'in' };
    
    (prisma as any).order = { findUnique: async () => order1 };

    let payload1: any;
    mock.method(global, 'fetch', async (url: string, opts: any) => {
      if (url.includes('orders/create/adhoc')) {
        payload1 = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ order_id: 1, shipment_id: 2 }) };
      }
      if (url.includes('courier/assign/awb')) {
        return { ok: true, json: async () => ({ response: { data: { awb_code: 'AWB' } } }) };
      }
    });

    await shiprocketService.createCustomOrder('order-123');
    mock.restoreAll();
    
    const ruleMock2 = mock.method(shiprocketService, 'calculateFulfillmentMetrics', (item: any) => {
      const w = Number(item.customization_data.physical_width);
      const h = Number(item.customization_data.physical_height);
      return { length: w + 2, width: h + 2, height: 5, weight_kg: 1 };
    });

    const order2 = JSON.parse(JSON.stringify(mockOrderTemplate));
    order2.created_at = new Date(order2.created_at);
    order2.items[0].customization_data = { physical_width: 16, physical_height: 24, physical_dimension_unit: 'in' };
    (prisma as any).order = { findUnique: async () => order2 };

    let payload2: any;
    mock.method(global, 'fetch', async (url: string, opts: any) => {
      if (url.includes('orders/create/adhoc')) {
        payload2 = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ order_id: 1, shipment_id: 2 }) };
      }
      if (url.includes('courier/assign/awb')) {
        return { ok: true, json: async () => ({ response: { data: { awb_code: 'AWB' } } }) };
      }
    });

    await shiprocketService.createCustomOrder('order-123');
    
    assert.strictEqual(payload1.length, 10);
    assert.strictEqual(payload2.length, 18);
    assert.notStrictEqual(payload1.length, payload2.length);
  });

  await t.test('3, 4, 11. Successful order creation + AWB assignment (no defaults)', async () => {
    // For HTTP orchestration, we mock metrics to bypass the business logic blocker
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    
    const order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    (prisma as any).order = { findUnique: async () => order };

    let createCalled = false;
    let awbCalled = false;

    mock.method(global, 'fetch', async (url: string, opts: any) => {
      if (url.includes('orders/create/adhoc')) {
        createCalled = true;
        const payload = JSON.parse(opts.body);
        assert.strictEqual(payload.billing_email, 'test@weprintit.in');
        assert.strictEqual(payload.billing_phone, '1234567890');
        assert.strictEqual(payload.weight, 1);
        return { ok: true, json: async () => ({ order_id: 111, shipment_id: 222 }) };
      }
      if (url.includes('courier/assign/awb')) {
        awbCalled = true;
        return { ok: true, json: async () => ({ response: { data: { awb_code: 'AWB123' } } }) };
      }
    });

    const res = await shiprocketService.createCustomOrder('order-123');
    assert.strictEqual(createCalled, true);
    assert.strictEqual(awbCalled, true);
    assert.strictEqual(res.shiprocketOrderId, '111');
    assert.strictEqual(res.shipmentId, '222');
    assert.strictEqual(res.awbCode, 'AWB123');
  });

  await t.test('5, 6, 7. Missing SKU, phone, email', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));

    // Missing SKU
    let order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    order.items[0].product.sku = null;
    (prisma as any).order = { findUnique: async () => order };
    await assert.rejects(() => shiprocketService.createCustomOrder('order-123'), /Missing product SKU/);

    // Missing email
    order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    order.customer_email = null;
    (prisma as any).order = { findUnique: async () => order };
    await assert.rejects(() => shiprocketService.createCustomOrder('order-123'), /Missing customer email/);

    // Missing phone
    order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    order.customer_phone = null;
    (prisma as any).order = { findUnique: async () => order };
    await assert.rejects(() => shiprocketService.createCustomOrder('order-123'), /Missing customer phone/);
  });

  await t.test('12. Duplicate Shiprocket order recovery (Partial DB-write failure during creation)', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    
    const order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    (prisma as any).order = { findUnique: async () => order };

    let recoverCalled = false;
    let awbCalled = false;

    mock.method(global, 'fetch', async (url: string) => {
      if (url.includes('orders/create/adhoc')) {
        return { ok: false, status: 400, json: async () => ({ message: 'Channel order ID already exists' }) };
      }
      if (url.includes('orders/show?channel_order_id=')) {
        recoverCalled = true;
        return { ok: true, json: async () => ({ data: [{ id: 999, shipments: [{ id: 888 }] }] }) };
      }
      if (url.includes('courier/assign/awb')) {
        awbCalled = true;
        return { ok: true, json: async () => ({ response: { data: { awb_code: 'AWB999' } } }) };
      }
    });

    const res = await shiprocketService.createCustomOrder('order-123');
    assert.strictEqual(recoverCalled, true);
    assert.strictEqual(awbCalled, true);
    assert.strictEqual(res.shiprocketOrderId, '999');
    assert.strictEqual(res.shipmentId, '888');
    assert.strictEqual(res.awbCode, 'AWB999');
  });

  await t.test('13 & 14. Repeated Admin request (fully processed) & Partial DB-write failure recovery (AWB missing)', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    
    // Fully processed idempotency
    let order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    order.shiprocket_order_id = '111';
    order.shiprocket_shipment_id = '222';
    order.tracking_awb = 'AWB123';
    (prisma as any).order = { findUnique: async () => order };

    let fetchCalled = false;
    mock.method(global, 'fetch', async () => { fetchCalled = true; return {}; });

    let res = await shiprocketService.createCustomOrder('order-123');
    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(res.awbCode, 'AWB123');

    // Partial processed idempotency (Missing AWB)
    order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    order.shiprocket_order_id = '111';
    order.shiprocket_shipment_id = '222';
    (prisma as any).order = { findUnique: async () => order };

    mock.restoreAll();
    let createCalled = false;
    let awbCalled = false;
    mock.method(global, 'fetch', async (url: string) => {
      if (url.includes('orders/create/adhoc')) {
        createCalled = true;
      }
      if (url.includes('courier/assign/awb')) {
        awbCalled = true;
        return { ok: true, json: async () => ({ response: { data: { awb_code: 'AWB222' } } }) };
      }
    });

    res = await shiprocketService.createCustomOrder('order-123');
    assert.strictEqual(createCalled, false); // skips creation!
    assert.strictEqual(awbCalled, true);
    assert.strictEqual(res.awbCode, 'AWB222');
  });

  await t.test('15. AWB assignment failure', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    const order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    (prisma as any).order = { findUnique: async () => order };

    mock.method(global, 'fetch', async (url: string) => {
      if (url.includes('orders/create/adhoc')) {
        return { ok: true, json: async () => ({ order_id: 111, shipment_id: 222 }) };
      }
      if (url.includes('courier/assign/awb')) {
        return { ok: false, statusText: 'Bad Request', json: async () => ({ message: 'Cannot assign AWB' }) };
      }
    });

    await assert.rejects(() => shiprocketService.createCustomOrder('order-123'), /Shiprocket AWB assignment failure: Cannot assign AWB/);
  });

  await t.test('16. Shiprocket API failure', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    const order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    (prisma as any).order = { findUnique: async () => order };

    mock.method(global, 'fetch', async (url: string) => {
      if (url.includes('orders/create/adhoc')) {
        return { ok: false, status: 500, json: async () => ({ message: 'Internal Server Error' }) };
      }
    });

    await assert.rejects(() => shiprocketService.createCustomOrder('order-123'), /Shiprocket API failure: Internal Server Error/);
  });
});

test('ShiprocketService Dry-Run mode', async (t) => {
  const mockOrderTemplate = {
    id: 'order-dry',
    shiprocket_order_id: null,
    shiprocket_shipment_id: null,
    tracking_awb: null,
    created_at: new Date('2026-08-15T12:00:00Z'),
    customer_email: 'test@weprintit.in',
    customer_phone: '1234567890',
    total_amount: new Prisma.Decimal(1000),
    shipping_address_snapshot: {
      name: 'John Doe',
      line1: '123 Main St',
      city: 'Delhi',
      state: 'DL',
      postal_code: '110001',
      country: 'India'
    },
    items: [
      {
        quantity: 1,
        unit_price: new Prisma.Decimal(1000),
        product: { name: 'Print', sku: 'SKU-01' },
        customization_data: { physical_width: 10, physical_height: 12, physical_dimension_unit: 'in' }
      }
    ]
  };

  t.beforeEach(() => {
    process.env.SHIPROCKET_DRY_RUN = 'true';
  });

  t.afterEach(() => {
    process.env.SHIPROCKET_DRY_RUN = undefined;
    mock.restoreAll();
  });

  await t.test('B. Dry-run create order & C. Dry-run AWB (Zero HTTP requests)', async () => {
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));
    const order = JSON.parse(JSON.stringify(mockOrderTemplate));
    order.created_at = new Date(order.created_at);
    (prisma as any).order = { findUnique: async () => order };

    let fetchCalled = false;
    mock.method(global, 'fetch', async () => { fetchCalled = true; return {}; });

    const res = await shiprocketService.createCustomOrder('order-dry');
    
    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(res.shiprocketOrderId, 'mock_ord_order-dry');
    assert.strictEqual(res.shipmentId, 'mock_ship_order-dry');
    assert.strictEqual(res.awbCode, 'MOCK-AWB-order-dry');
  });
});
