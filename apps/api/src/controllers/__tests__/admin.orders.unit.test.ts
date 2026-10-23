import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { adminOrdersController, inFlightAwbGenerations } from '../admin.orders.controller.js';
import { prisma } from '@repo/database';
import { shiprocketService } from '../../services/shiprocket.service.js';
import { storageService } from '../../services/storage.service.js';
import { shiprocketWebhookController } from '../shiprocket.webhook.controller.js';
import { env } from '../../config/env.js';
import { requireAdmin } from '../../middlewares/auth.middleware.js';
import { guestTrackSchema } from '../order.controller.js';
import { notificationService } from '../../services/notification/notification.service.js';

describe('Admin Orders Controller Unit Tests', () => {
  let webhookStore = new Map<string, any>();

  beforeEach(() => {
    mock.restoreAll();
    webhookStore = new Map<string, any>();
    prisma.webhookEvent = {
      create: (async (args: any) => {
        const eventId = args?.data?.event_id;
        if (webhookStore.has(eventId)) {
          const err: any = new Error('Unique constraint failed on event_id');
          err.code = 'P2002';
          throw err;
        }
        const record = { id: 'evt-mock', received_at: new Date(), ...args?.data };
        webhookStore.set(eventId, record);
        return record;
      }) as any,
      delete: (async (args: any) => {
        const eventId = args?.where?.event_id;
        webhookStore.delete(eventId);
        return { id: 'evt-mock' };
      }) as any,
      findUnique: (async (args: any) => {
        return webhookStore.get(args?.where?.event_id) || null;
      }) as any,
      findFirst: (async () => null) as any,
    } as any;
  });

  describe('listOrders', () => {
    it('should paginate and filter orders correctly with status and search', async () => {
      let capturedWhere: any = null;
      let capturedSkip: number | null = null;
      let capturedTake: number | null = null;

      prisma.order.count = (async (args: any) => {
        capturedWhere = args?.where;
        return 42;
      }) as any;

      prisma.order.findMany = (async (args: any) => {
        capturedSkip = args?.skip;
        capturedTake = args?.take;
        return [
          {
            id: 'ord-12345',
            status: 'CONFIRMED',
            customer_email: 'buyer@example.com',
            total_amount: 1500,
            created_at: new Date(),
            user: { first_name: 'Buyer', last_name: 'User', phone_number: '9876543210' },
            payments: [{ status: 'CAPTURED', method: 'card', razorpay_payment_id: 'pay_123' }],
            _count: { items: 2 }
          }
        ];
      }) as any;

      const req: any = {
        query: {
          page: '2',
          limit: '10',
          status: 'CONFIRMED',
          payment_status: 'CAPTURED',
          search: 'buyer'
        }
      };

      let statusCode: number | null = null;
      let jsonBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              jsonBody = body;
            }
          };
        }
      };

      const next = () => {};

      await adminOrdersController.listOrders(req, res, next);

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.orders.length, 1);
      assert.equal(jsonBody.data.pagination.total, 42);
      assert.equal(jsonBody.data.pagination.page, 2);
      assert.equal(jsonBody.data.pagination.limit, 10);
      assert.equal(jsonBody.data.pagination.totalPages, 5);

      assert.equal(capturedSkip, 10);
      assert.equal(capturedTake, 10);
      assert.equal(capturedWhere.status, 'CONFIRMED');
      assert.deepEqual(capturedWhere.payments, { some: { status: 'CAPTURED' } });
      assert.ok(Array.isArray(capturedWhere.OR));
    });

    it('should handle ALL filter and empty search properly', async () => {
      let capturedWhere: any = null;

      prisma.order.count = (async (args: any) => {
        capturedWhere = args?.where;
        return 5;
      }) as any;

      prisma.order.findMany = (async () => []) as any;

      const req: any = {
        query: {
          status: 'ALL',
          payment_status: 'ALL',
          search: ''
        }
      };

      let statusCode: number | null = null;
      let jsonBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              jsonBody = body;
            }
          };
        }
      };

      await adminOrdersController.listOrders(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(capturedWhere.status, undefined);
      assert.equal(capturedWhere.payments, undefined);
      assert.equal(capturedWhere.OR, undefined);
    });
  });

  describe('getOrderDetail', () => {
    it('should return 404 if order does not exist', async () => {
      prisma.order.findUnique = (async () => null) as any;

      const req: any = { params: { id: 'non-existent' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.getOrderDetail(req, res, () => {});

      assert.equal(statusCode, 404);
      assert.equal(jsonBody.success, false);
      assert.equal(jsonBody.error, 'Order not found');
    });

    it('should detect complete fulfillment data and return shiprocketStatus', async () => {
      const mockOrder = {
        id: 'ord-valid',
        status: 'CONFIRMED',
        shipping_address_snapshot: {
          name: 'Jane Doe',
          line1: '456 Art St',
          city: 'Mumbai',
          state: 'MH',
          postal_code: '400001',
          country: 'India'
        },
        items: [
          {
            product: { sku: 'SKU-CANVAS' },
            customization_data: {
              master_file_key: 'uploads/master_123.tiff',
              physical_width: 12,
              physical_height: 16
            }
          }
        ],
        payments: [{ status: 'CAPTURED' }],
        status_history: [{ new_status: 'CONFIRMED', created_at: new Date() }]
      };

      prisma.order.findUnique = (async () => mockOrder) as any;

      const req: any = { params: { id: 'ord-valid' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.getOrderDetail(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.fulfillmentDataComplete, true);
      assert.equal(jsonBody.data.missingFields.length, 0);
      assert.ok(jsonBody.data.shiprocketStatus !== undefined);
    });

    it('should detect missing fulfillment fields accurately', async () => {
      const mockOrder = {
        id: 'ord-incomplete',
        status: 'CONFIRMED',
        shipping_address_snapshot: {
          line1: '456 Art St' // missing name, city, state, postal_code
        },
        items: [
          {
            product: { sku: null },
            customization_data: {
              master_file_key: null,
              physical_width: null
            }
          }
        ],
        payments: [],
        status_history: []
      };

      prisma.order.findUnique = (async () => mockOrder) as any;

      const req: any = { params: { id: 'ord-incomplete' } };
      let jsonBody: any = null;
      const res: any = {
        status: () => ({ json: (body: any) => { jsonBody = body; } })
      };

      await adminOrdersController.getOrderDetail(req, res, () => {});

      assert.equal(jsonBody.data.fulfillmentDataComplete, false);
      assert.ok(jsonBody.data.missingFields.includes('shipping_address_snapshot'));
      assert.ok(jsonBody.data.missingFields.includes('items[0].product.sku'));
      assert.ok(jsonBody.data.missingFields.includes('items[0].customization_data.master_file_key'));
      assert.ok(jsonBody.data.missingFields.includes('items[0].customization_data.physical_dimensions'));
    });
  });

  describe('Status Transitions', () => {
    it('processOrder should reject if order status is not CONFIRMED', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-1',
        status: 'PROCESSING'
      })) as any;

      const req: any = { params: { id: 'ord-1' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.processOrder(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Cannot process order with status PROCESSING'));
    });

    it('processOrder should reject if manufacturing data is incomplete', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-1',
        status: 'CONFIRMED',
        shipping_address_snapshot: null,
        items: []
      })) as any;

      const req: any = { params: { id: 'ord-1' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.processOrder(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Manufacturing data incomplete'));
    });

    it('completeProduction should reject if status is not PROCESSING', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-1',
        status: 'CONFIRMED'
      })) as any;

      const req: any = { params: { id: 'ord-1' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.completeProduction(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Cannot complete production for order with status CONFIRMED'));
    });

    it('completeProduction should transition PROCESSING to READY_FOR_PICKUP in transaction', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-proc',
        status: 'PROCESSING'
      })) as any;

      let historyCreated: any = null;
      let orderUpdated: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            update: async (args: any) => {
              orderUpdated = args;
              return { id: 'ord-proc', status: 'READY_FOR_PICKUP' };
            }
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyCreated = args;
              return { id: 'hist-1' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: 'ord-proc' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.completeProduction(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(orderUpdated.data.status, 'READY_FOR_PICKUP');
      assert.equal(historyCreated.data.previous_status, 'PROCESSING');
      assert.equal(historyCreated.data.new_status, 'READY_FOR_PICKUP');
    });

    it('generateAwb should reject if status is not PROCESSING', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-conf',
        status: 'CONFIRMED'
      })) as any;

      const req: any = { params: { id: 'ord-conf' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Cannot generate AWB for order with status CONFIRMED'));
    });

    it('generateAwb should record AWB and status history in a transaction', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-awb',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Jane Doe',
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            product: { sku: 'SKU-001', name: 'Canvas Print' },
            customization_data: { physical_width: 12, physical_height: 16 }
          }
        ]
      })) as any;

      mock.method(shiprocketService, 'createCustomOrder', async () => ({
        shiprocketOrderId: 'SR-111',
        shipmentId: 'SHIP-222',
        awbCode: 'AWB-9999'
      }));

      let historyCreated: any = null;
      let orderUpdated: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          webhookEvent: prisma.webhookEvent,
          order: {
            findUnique: async () => ({ status: 'PROCESSING' }),
            update: async (args: any) => {
              orderUpdated = args;
              return {
                id: 'ord-awb',
                status: 'READY_FOR_PICKUP',
                tracking_awb: 'AWB-9999',
                shiprocket_order_id: 'SR-111',
                shiprocket_shipment_id: 'SHIP-222'
              };
            }
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyCreated = args;
              return { id: 'hist-awb' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: 'ord-awb' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(orderUpdated.data.status, 'READY_FOR_PICKUP');
      assert.equal(orderUpdated.data.tracking_awb, 'AWB-9999');
      assert.equal(historyCreated.data.previous_status, 'PROCESSING');
      assert.equal(historyCreated.data.new_status, 'READY_FOR_PICKUP');
      assert.ok(historyCreated.data.description.includes('AWB generated (AWB-9999)'));
    });
  });

  describe('Admin Authorization Middleware (requireAdmin)', () => {
    it('should reject unauthenticated request with 401', () => {
      const req: any = {};
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };
      let nextCalled = false;

      requireAdmin(req, res, () => { nextCalled = true; });

      assert.equal(statusCode, 401);
      assert.equal(jsonBody.error, 'Authentication required');
      assert.equal(nextCalled, false);
    });

    it('should reject non-admin (CUSTOMER) role with 403 Forbidden', () => {
      const req: any = { user: { userId: 'usr-1', role: 'CUSTOMER' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };
      let nextCalled = false;

      requireAdmin(req, res, () => { nextCalled = true; });

      assert.equal(statusCode, 403);
      assert.equal(jsonBody.error, 'Forbidden: Admin access required');
      assert.equal(nextCalled, false);
    });

    it('should allow ADMIN role to proceed', () => {
      const req: any = { user: { userId: 'admin-1', role: 'ADMIN' } };
      const res: any = {};
      let nextCalled = false;

      requireAdmin(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
    });
  });

  describe('Guest Order Tracking Security (guestTrackSchema)', () => {
    it('should accept valid UUID and phone number', () => {
      const validPayload = {
        order_id: 'a0000000-0000-0000-0000-000000000001',
        phone_number: '+919876543210'
      };

      const result = guestTrackSchema.body.safeParse(validPayload);
      assert.equal(result.success, true);
    });

    it('should reject non-UUID order IDs', () => {
      const invalidPayload = {
        order_id: 'not-a-valid-uuid',
        phone_number: '+919876543210'
      };

      const result = guestTrackSchema.body.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });

    it('should reject invalid phone numbers', () => {
      const invalidPayload = {
        order_id: 'a0000000-0000-0000-0000-000000000001',
        phone_number: 'invalid-phone'
      };

      const result = guestTrackSchema.body.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });
  });

  describe('Fulfillment Retry Safety & Concurrency', () => {
    it('generateAwb should reject concurrent in-flight generation with 409 Conflict', async () => {
      const orderId = 'ord-conflict-123';
      inFlightAwbGenerations.add(orderId);

      const req: any = { params: { id: orderId } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      try {
        await adminOrdersController.generateAwb(req, res, () => {});

        assert.equal(statusCode, 409);
        assert.equal(jsonBody.success, false);
        assert.ok(jsonBody.error.includes('already in progress'));
      } finally {
        inFlightAwbGenerations.delete(orderId);
      }
    });

    it('generateAwb should return existing shipment details idempotently if already generated', async () => {
      const existingOrder = {
        id: 'ord-already-has-awb',
        status: 'PROCESSING',
        tracking_awb: 'AWB-EXISTING-123',
        shiprocket_shipment_id: 'SHIP-EXISTING-456'
      };

      prisma.order.findUnique = (async () => existingOrder) as any;

      let createCustomOrderCalled = false;
      mock.method(shiprocketService, 'createCustomOrder', async () => {
        createCustomOrderCalled = true;
        return { shiprocketOrderId: 'new', shipmentId: 'new', awbCode: 'new' };
      });

      const req: any = { params: { id: 'ord-already-has-awb' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.tracking_awb, 'AWB-EXISTING-123');
      assert.equal(createCustomOrderCalled, false);
      assert.equal(inFlightAwbGenerations.has('ord-already-has-awb'), false);
    });

    it('generateAwb should reject when shipping address snapshot is incomplete', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-bad-addr',
        status: 'PROCESSING',
        shipping_address_snapshot: { name: 'Only Name' }, // missing line1, city, state, postal_code
        items: [{ product: { sku: 'SKU1' }, customization_data: { physical_width: 10 } }]
      })) as any;

      const req: any = { params: { id: 'ord-bad-addr' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Missing valid shipping address snapshot'));
      assert.equal(inFlightAwbGenerations.has('ord-bad-addr'), false);
    });

    it('generateAwb should reject when order has no items', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-no-items',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Jane', line1: 'Street', city: 'City', state: 'State', postal_code: '123456'
        },
        items: []
      })) as any;

      const req: any = { params: { id: 'ord-no-items' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Order contains no items'));
    });

    it('generateAwb should reject when item is missing SKU', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-missing-sku',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Jane', line1: 'Street', city: 'City', state: 'State', postal_code: '123456'
        },
        items: [
          {
            product: { sku: null, name: 'Framed Print' },
            customization_data: { physical_width: 10 }
          }
        ]
      })) as any;

      const req: any = { params: { id: 'ord-missing-sku' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Missing SKU'));
    });

    it('generateAwb should reject when item is missing dimensions', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-missing-dim',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Jane', line1: 'Street', city: 'City', state: 'State', postal_code: '123456'
        },
        items: [
          {
            product: { sku: 'SKU-OK', name: 'Framed Print' },
            customization_data: {}
          }
        ]
      })) as any;

      const req: any = { params: { id: 'ord-missing-dim' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Missing dimensions or packaging'));
    });
  });

  describe('Master Asset Download Security (downloadMasterAsset)', () => {
    it('should return 404 if order does not exist', async () => {
      prisma.order.findUnique = (async () => null) as any;

      const req: any = { params: { id: 'ord-missing', itemId: 'item-1' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 404);
      assert.equal(jsonBody.error, 'Order not found');
    });

    it('should return 403 if order is in PENDING, EXPIRED, or CANCELLED status', async () => {
      for (const forbiddenStatus of ['PENDING', 'EXPIRED', 'CANCELLED']) {
        prisma.order.findUnique = (async () => ({
          id: 'ord-status-check',
          status: forbiddenStatus,
          items: [{ id: 'item-1' }]
        })) as any;

        const req: any = { params: { id: 'ord-status-check', itemId: 'item-1' } };
        let statusCode: number | null = null;
        let jsonBody: any = null;
        const res: any = {
          status: (code: number) => {
            statusCode = code;
            return { json: (body: any) => { jsonBody = body; } };
          }
        };

        await adminOrdersController.downloadMasterAsset(req, res, () => {});

        assert.equal(statusCode, 403);
        assert.ok(jsonBody.error.includes(forbiddenStatus));
      }
    });

    it('should return 404 if item does not belong to the specified order', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-mismatch',
        status: 'CONFIRMED',
        items: [{ id: 'other-item-1' }]
      })) as any;

      const req: any = { params: { id: 'ord-mismatch', itemId: 'requested-item' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 404);
      assert.equal(jsonBody.error, 'Order item not found in this order');
    });

    it('should return 400 if master_file_key is missing', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-no-key',
        status: 'PROCESSING',
        items: [{ id: 'item-no-key', customization_data: {} }]
      })) as any;

      const req: any = { params: { id: 'ord-no-key', itemId: 'item-no-key' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('No master file key found'));
    });

    it('should reject non-customer prefixes with 400 (e.g. products/ or arbitrary paths)', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-prod-key',
        status: 'PROCESSING',
        items: [
          {
            id: 'item-prod-key',
            customization_data: { master_file_key: 'products/catalog_canvas.jpg' }
          }
        ]
      })) as any;

      const req: any = { params: { id: 'ord-prod-key', itemId: 'item-prod-key' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.ok(jsonBody.error.includes('Master assets must reside within customers/ prefix'));
    });

    it('should reject path traversal attempts with 400 (e.g. customers/../../secret)', async () => {
      for (const traversalKey of ['customers/../../etc/passwd', 'customers/foo/..\\bar', 'customers\\traversal']) {
        prisma.order.findUnique = (async () => ({
          id: 'ord-traversal',
          status: 'PROCESSING',
          items: [
            {
              id: 'item-traversal',
              customization_data: { master_file_key: traversalKey }
            }
          ]
        })) as any;

        const req: any = { params: { id: 'ord-traversal', itemId: 'item-traversal' } };
        let statusCode: number | null = null;
        let jsonBody: any = null;
        const res: any = {
          status: (code: number) => {
            statusCode = code;
            return { json: (body: any) => { jsonBody = body; } };
          }
        };

        await adminOrdersController.downloadMasterAsset(req, res, () => {});

        assert.equal(statusCode, 400);
        assert.ok(jsonBody.error.includes('Invalid master file key path'));
      }
    });

    it('should return presigned URL when order, item ownership, and customer prefix are valid', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-valid-download',
        status: 'PROCESSING',
        items: [
          {
            id: 'item-valid-download',
            customization_data: {
              master_file_key: 'customers/user_456/uploads/master_print_photo.tiff'
            }
          }
        ]
      })) as any;

      mock.method(storageService, 'generateReadUrl', async (key: string, expiry: number, filename: string) => {
        assert.equal(key, 'customers/user_456/uploads/master_print_photo.tiff');
        assert.equal(expiry, 300);
        assert.ok(filename.includes('Order_ord-va_Item_item-v.tiff'));
        return 'https://r2.example.com/presigned-master-download-url';
      });

      const req: any = { params: { id: 'ord-valid-download', itemId: 'item-valid-download' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.url, 'https://r2.example.com/presigned-master-download-url');
    });
  });

  describe('Shiprocket Webhook Reconciliation (shiprocketWebhookController)', () => {
    it('should reject webhook with 401 when x-api-key is missing or invalid', async () => {
      const req: any = {
        headers: { 'x-api-key': 'wrong_token' },
        body: Buffer.from(JSON.stringify({ current_status_id: 42 }))
      };

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: (body: string) => { responseBody = body; } };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 401);
      assert.equal(responseBody, 'Unauthorized webhook token');
    });

    it('should reject webhook with 400 when body is not a Buffer', async () => {
      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: 'string-not-buffer'
      };

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: (body: string) => { responseBody = body; } };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 400);
      assert.equal(responseBody, 'Expected raw buffer body');
    });

    it('should ignore webhook without current_status_id with 200 OK', async () => {
      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify({ event: 'ping' }))
      };

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: (body: string) => { responseBody = body; } };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(responseBody, 'OK');
    });

    it('should advance READY_FOR_PICKUP to SHIPPED and create orderStatusHistory', async () => {
      const payload = {
        current_status_id: 42,
        current_status: 'Picked Up',
        awb: 'AWB-TRK-100',
        channel_order_id: 'ord-wh-1'
      };

      let orderUpdated: any = null;
      let historyCreated: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-1' }),
            findUnique: async () => ({ id: 'ord-wh-1', status: 'READY_FOR_PICKUP' }),
            update: async (args: any) => {
              orderUpdated = args;
              return { id: 'ord-wh-1', status: 'SHIPPED' };
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async () => ({ id: 'ev-1' })
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyCreated = args;
              return { id: 'hist-wh-1' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(orderUpdated.data.status, 'SHIPPED');
      assert.equal(historyCreated.data.previous_status, 'READY_FOR_PICKUP');
      assert.equal(historyCreated.data.new_status, 'SHIPPED');
      assert.ok(historyCreated.data.description.includes('Picked Up'));
    });

    it('should advance SHIPPED to DELIVERED and create orderStatusHistory', async () => {
      const payload = {
        current_status_id: 7,
        current_status: 'Delivered',
        awb: 'AWB-TRK-200'
      };

      let orderUpdated: any = null;
      let historyCreated: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-2' }),
            findUnique: async () => ({ id: 'ord-wh-2', status: 'SHIPPED' }),
            update: async (args: any) => {
              orderUpdated = args;
              return { id: 'ord-wh-2', status: 'DELIVERED' };
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async () => ({ id: 'ev-2' })
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyCreated = args;
              return { id: 'hist-wh-2' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(orderUpdated.data.status, 'DELIVERED');
      assert.equal(historyCreated.data.previous_status, 'SHIPPED');
      assert.equal(historyCreated.data.new_status, 'DELIVERED');
      assert.ok(historyCreated.data.description.includes('Delivered'));
    });

    it('should advance READY_FOR_PICKUP directly to DELIVERED when carrier skips interim transit status', async () => {
      const payload = {
        current_status_id: 7,
        current_status: 'Delivered',
        awb: 'AWB-TRK-300'
      };

      let orderUpdated: any = null;
      let historyCreated: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-3' }),
            findUnique: async () => ({ id: 'ord-wh-3', status: 'READY_FOR_PICKUP' }),
            update: async (args: any) => {
              orderUpdated = args;
              return { id: 'ord-wh-3', status: 'DELIVERED' };
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async () => ({ id: 'ev-3' })
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyCreated = args;
              return { id: 'hist-wh-3' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(orderUpdated.data.status, 'DELIVERED');
      assert.equal(historyCreated.data.previous_status, 'READY_FOR_PICKUP');
      assert.equal(historyCreated.data.new_status, 'DELIVERED');
    });

    it('should ignore out-of-order regression webhook when order is already DELIVERED', async () => {
      const payload = {
        current_status_id: 18, // In Transit (delayed webhook)
        current_status: 'In Transit',
        awb: 'AWB-TRK-400'
      };

      let orderUpdateCalled = false;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-4' }),
            findUnique: async () => ({ id: 'ord-wh-4', status: 'DELIVERED' }),
            update: async () => {
              orderUpdateCalled = true;
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async () => ({ id: 'ev-4' })
          },
          orderStatusHistory: {
            create: async () => {}
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(orderUpdateCalled, false); // No status regression allowed
    });
  });

  describe('Visual Polish 09: Staging Acceptance, Concurrency & Resiliency', () => {
    it('generateAwb should reject with 409 Conflict when database-backed distributed lock is held by another instance', async () => {
      prisma.webhookEvent.create = (async () => {
        const err: any = new Error('Unique constraint violation');
        err.code = 'P2002';
        throw err;
      }) as any;

      prisma.webhookEvent.findUnique = (async () => ({
        id: 'lock-1',
        event_id: 'lock:awb:ord-dist-lock',
        received_at: new Date() // Active lock (0s old)
      })) as any;

      const req: any = { params: { id: 'ord-dist-lock' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 409);
      assert.ok(jsonBody.error.includes('Shipment creation is already in progress for this order'));
    });

    it('generateAwb should recover stale distributed lock (>60s old) and proceed successfully', async () => {
      let staleLockDeleted = false;
      const lockEventId = 'lock:awb:ord-stale-lock';
      webhookStore.set(lockEventId, {
        id: 'stale-lock',
        provider: 'system',
        event_id: lockEventId,
        event_type: 'AWB_GENERATION_LOCK',
        received_at: new Date(Date.now() - 75_000), // 75 seconds ago = stale!
        payload: { lockToken: 'old-stale-token' }
      });

      const origDelete = prisma.webhookEvent.delete;
      prisma.webhookEvent.delete = (async (args: any) => {
        staleLockDeleted = true;
        return origDelete(args);
      }) as any;

      prisma.order.findUnique = (async () => ({
        id: 'ord-stale-lock',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Stale Recovered',
          line1: '456 Hub St',
          city: 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560001'
        },
        items: [
          {
            product: { sku: 'SKU-REC', name: 'Photo Print' },
            customization_data: { physical_width: 8, physical_height: 10 }
          }
        ]
      })) as any;

      mock.method(shiprocketService, 'createCustomOrder', async () => ({
        shiprocketOrderId: 'SR-REC',
        shipmentId: 'SHIP-REC',
        awbCode: 'AWB-REC-111'
      }));

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          webhookEvent: prisma.webhookEvent,
          order: {
            findUnique: async () => ({ status: 'PROCESSING' }),
            update: async () => ({
              id: 'ord-stale-lock',
              status: 'READY_FOR_PICKUP',
              tracking_awb: 'AWB-REC-111'
            })
          },
          orderStatusHistory: {
            create: async () => ({ id: 'hist-1' })
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: 'ord-stale-lock' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(staleLockDeleted, true);
      assert.equal(jsonBody.data.status, 'READY_FOR_PICKUP');
    });

    it('generateAwb should abort with 409 Conflict if order status changes during generation', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-conflict',
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Jane Conflict',
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            product: { sku: 'SKU-001', name: 'Canvas Print' },
            customization_data: { physical_width: 12, physical_height: 16 }
          }
        ]
      })) as any;

      mock.method(shiprocketService, 'createCustomOrder', async () => ({
        shiprocketOrderId: 'SR-CONF',
        shipmentId: 'SHIP-CONF',
        awbCode: 'AWB-CONF'
      }));

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          webhookEvent: prisma.webhookEvent,
          order: {
            findUnique: async () => ({ status: 'CANCELLED' }),
            update: async () => {}
          },
          orderStatusHistory: {
            create: async () => {}
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: 'ord-conflict' } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 409);
      assert.ok(jsonBody.error.includes('Order status changed to CANCELLED during AWB generation'));
    });

    it('downloadMasterAsset should return 502 Bad Gateway when storage provider errors', async () => {
      prisma.order.findUnique = (async () => ({
        id: 'ord-storage-err',
        status: 'PROCESSING',
        items: [
          {
            id: 'item-storage-err',
            customization_data: {
              master_file_key: 'customers/ord-storage-err/print.png'
            }
          }
        ]
      })) as any;

      mock.method(storageService, 'generateReadUrl', async () => {
        throw new Error('Cloudflare R2 ETIMEDOUT');
      });

      const req: any = {
        params: {
          id: 'ord-storage-err',
          itemId: 'item-storage-err'
        }
      };

      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.downloadMasterAsset(req, res, () => {});

      assert.equal(statusCode, 502);
      assert.ok(jsonBody.error.includes('Storage provider error generating presigned download URL'));
    });

    it('shiprocketWebhookController should record intermediate transit update into history when order is already SHIPPED', async () => {
      const payload = {
        current_status_id: 18, // In Transit
        current_status: 'In Transit',
        awb: 'AWB-IN-TRANSIT',
        scans: [{ location: 'Bhiwandi Hub' }]
      };

      let orderUpdateCalled = false;
      let historyRecord: any = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-transit-1' }),
            findUnique: async () => ({ id: 'ord-transit-1', status: 'SHIPPED' }),
            update: async () => {
              orderUpdateCalled = true;
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async () => ({ id: 'ev-transit' })
          },
          orderStatusHistory: {
            create: async (args: any) => {
              historyRecord = args.data;
            }
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(orderUpdateCalled, false); // Order status remains SHIPPED
      assert.ok(historyRecord);
      assert.equal(historyRecord.previous_status, 'SHIPPED');
      assert.equal(historyRecord.new_status, 'SHIPPED');
      assert.ok(historyRecord.description.includes('In Transit'));
      assert.ok(historyRecord.description.includes('Bhiwandi Hub'));
    });

    it('shiprocketWebhookController should use composite logical event key and detect duplicate delivery', async () => {
      const payload = {
        shipment_id: 'SHIP-LOGICAL-1',
        current_status_id: 18,
        status_date: '2026-10-22 14:00:00',
        awb: 'AWB-LOGICAL'
      };

      let recordedEventId: string | null = null;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-logical-1' }),
            findUnique: async () => ({ id: 'ord-logical-1', status: 'SHIPPED' }),
            update: async () => {}
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              recordedEventId = args.data.event_id;
              return { id: 'ev-log' };
            }
          },
          orderStatusHistory: {
            create: async () => {}
          }
        };
        return callback(tx);
      }) as any;

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode: number | null = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(recordedEventId, 'sr_evt_SHIP-LOGICAL-1_18_2026-10-22 14:00:00');
    });

    it('notificationService should retry previously failed notification on P2002 duplicate collision', async () => {
      let createAttempted = false;
      let existingChecked = false;
      let updateAttempted = false;

      prisma.order = {
        findUnique: (async () => ({
          id: 'ord-notif-retry',
          customer_phone: '9876543210',
          customer_email: 'test@example.com',
          shipping_address_snapshot: { name: 'Retry Customer' },
          user: null
        })) as any
      } as any;

      prisma.notificationLog = {
        create: (async () => {
          createAttempted = true;
          const err: any = new Error('Unique constraint failed on order_id, channel, event_type');
          err.code = 'P2002';
          throw err;
        }) as any,
        findFirst: (async () => {
          existingChecked = true;
          return {
            id: 'notif-failed-1',
            status: 'FAILED',
            order_id: 'ord-notif-retry',
            channel: 'SMS',
            event_type: 'ORDER_PROCESSING'
          };
        }) as any,
        update: (async (args: any) => {
          updateAttempted = true;
          return { id: 'notif-failed-1', ...args.data };
        }) as any,
        updateMany: (async () => ({ count: 1 })) as any,
        findUnique: (async () => null) as any
      } as any;

      await notificationService.dispatchOrderProcessing('ord-notif-retry');

      assert.equal(createAttempted, true);
      assert.equal(existingChecked, true);
      assert.equal(updateAttempted, true);
    });
  });

  describe('Visual Polish 10: Fulfillment Correctness, Lock Fencing & Staging Acceptance', () => {
    it('generateAwb should abort with 409 Conflict if lockToken is superseded during provider latency', async () => {
      const orderId = 'ord-superseded-fence';
      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Fence Test',
          line1: '100 Fenced Rd',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            product: { sku: 'SKU-FENCE', name: 'Art Print' },
            customization_data: { physical_width: 10, physical_height: 12 }
          }
        ]
      })) as any;

      mock.method(shiprocketService, 'createCustomOrder', async () => ({
        shiprocketOrderId: 'SR-FENCE',
        shipmentId: 'SHIP-FENCE',
        awbCode: 'AWB-FENCE'
      }));

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          webhookEvent: {
            findUnique: async () => ({
              id: 'lock-superseded',
              event_id: `lock:awb:${orderId}`,
              payload: { lockToken: 'superseded-token-another-instance' }
            })
          },
          order: {
            findUnique: async () => ({ status: 'PROCESSING' }),
            update: async () => ({})
          },
          orderStatusHistory: {
            create: async () => ({})
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: orderId } };
      let statusCode: number | null = null;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (body: any) => { jsonBody = body; } };
        }
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      assert.equal(statusCode, 409);
      assert.ok(jsonBody.error.includes('Shipment creation lock expired or was superseded during provider latency'));
    });

    it('generateAwb finally block should not release lock if lockToken was superseded by another instance', async () => {
      const orderId = 'ord-safe-release';
      const lockEventId = `lock:awb:${orderId}`;

      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        shipping_address_snapshot: {
          name: 'Release Test',
          line1: '100 Release Rd',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            product: { sku: 'SKU-REL', name: 'Art Print' },
            customization_data: { physical_width: 10, physical_height: 12 }
          }
        ]
      })) as any;

      mock.method(shiprocketService, 'createCustomOrder', async () => {
        // While provider is working, another instance broke the stale lock and took over with a new lockToken
        webhookStore.set(lockEventId, {
          id: 'new-worker-lock',
          event_id: lockEventId,
          payload: { lockToken: 'new-worker-uuid-999' }
        });
        return {
          shiprocketOrderId: 'SR-REL',
          shipmentId: 'SHIP-REL',
          awbCode: 'AWB-REL'
        };
      });

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          webhookEvent: prisma.webhookEvent,
          order: {
            findUnique: async () => ({ status: 'PROCESSING' }),
            update: async () => ({ id: orderId, status: 'READY_FOR_PICKUP' })
          },
          orderStatusHistory: {
            create: async () => ({})
          }
        };
        return callback(tx);
      }) as any;

      const req: any = { params: { id: orderId } };
      const res: any = {
        status: () => ({ json: () => {} })
      };

      await adminOrdersController.generateAwb(req, res, () => {});

      // Verify that in finally block, current lock with 'new-worker-uuid-999' was NOT deleted
      const lockAfterFinally = webhookStore.get(lockEventId);
      assert.ok(lockAfterFinally, 'New worker lock must not be deleted by expired/superseded worker');
      assert.equal(lockAfterFinally.payload.lockToken, 'new-worker-uuid-999');
    });

    it('shiprocketService createCustomOrder should recover existing shipment on ambiguous network timeout', async () => {
      const orderId = 'ord-sr-timeout-rec';
      
      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        total_amount: 2500,
        customer_email: 'recovery@example.com',
        customer_phone: '9876543210',
        created_at: new Date(),
        shipping_address_snapshot: {
          name: 'Timeout Recovery',
          line1: '42 Ambiguous Lane',
          city: 'Delhi',
          state: 'Delhi',
          postal_code: '110001'
        },
        items: [
          {
            quantity: 1,
            unit_price: 2500,
            product: { sku: 'SKU-AMB', name: 'Timeout Print' },
            customization_data: {
              packaging: { length: 30, width: 25, height: 5, weight: 0.5 }
            }
          }
        ]
      })) as any;

      const origDryRun = process.env.SHIPROCKET_DRY_RUN;
      process.env.SHIPROCKET_DRY_RUN = 'false';

      // Mock login token
      mock.method(shiprocketService, 'authenticate', async () => 'mock-jwt-token');

      // First recovery probe before creation returns empty
      let recoverCount = 0;
      mock.method(shiprocketService, 'recoverExistingShipment', async () => {
        recoverCount++;
        if (recoverCount === 1) {
          throw new Error('Not found yet');
        }
        // Second recovery probe (after network timeout) finds the shipment that Shiprocket created!
        return {
          shiprocketOrderId: 'SR-RECOVERED-99',
          shipmentId: 'SHIP-RECOVERED-88',
          awbCode: 'AWB-RECOVERED-77'
        };
      });

      // Mock fetch: adhoc creation throws connection reset / timeout
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any) => {
        if (typeof url === 'string' && url.includes('orders/create/adhoc')) {
          const timeoutErr: any = new Error('fetch failed: ETIMEDOUT connection dropped');
          throw timeoutErr;
        }
        return new Response(JSON.stringify({ status: 200 }));
      }) as any;

      try {
        const result = await shiprocketService.createCustomOrder(orderId);
        assert.equal(result.shiprocketOrderId, 'SR-RECOVERED-99');
        assert.equal(result.shipmentId, 'SHIP-RECOVERED-88');
        assert.equal(result.awbCode, 'AWB-RECOVERED-77');
        assert.equal(recoverCount, 2);
      } finally {
        globalThis.fetch = origFetch;
        process.env.SHIPROCKET_DRY_RUN = origDryRun;
      }
    });

    it('shiprocketWebhookController should use stable provider event_id and deduplicate', async () => {
      let recordedEventId: string | null = null;
      let duplicateCaught = false;

      prisma.order.findFirst = (async () => ({ id: 'ord-wh-provider-id' })) as any;
      prisma.order.findUnique = (async () => ({ id: 'ord-wh-provider-id', status: 'READY_FOR_PICKUP' })) as any;
      prisma.order.update = (async () => ({ id: 'ord-wh-provider-id', status: 'SHIPPED' })) as any;
      prisma.orderStatusHistory = { create: (async () => ({ id: 'hist-provider-id' })) as any } as any;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-provider-id' }),
            findUnique: async () => ({ id: 'ord-wh-provider-id', status: 'READY_FOR_PICKUP' }),
            update: async () => ({ id: 'ord-wh-provider-id', status: 'SHIPPED' })
          },
          orderStatusHistory: { create: async () => ({ id: 'hist-1' }) },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              recordedEventId = args.data.event_id;
              if (webhookStore.has(recordedEventId!)) {
                duplicateCaught = true;
                const err: any = new Error('Duplicate');
                err.code = 'P2002';
                throw err;
              }
              webhookStore.set(recordedEventId!, args.data);
              return { id: 'evt-1' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const payload = {
        event_id: 'sr_evt_alpha_777',
        awb: 'AWB-PROVIDER-1',
        current_status_id: 42,
        current_status: 'Picked Up'
      };

      const req1: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode1: number | null = null;
      const res1: any = {
        status: (code: number) => {
          statusCode1 = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req1, res1, () => {});
      assert.equal(statusCode1, 200);
      assert.equal(recordedEventId, 'sr_evt_sr_evt_alpha_777');

      // Second delivery: identical provider event_id
      const req2: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };

      let statusCode2: number | null = null;
      const res2: any = {
        status: (code: number) => {
          statusCode2 = code;
          return { send: () => {} };
        }
      };

      await shiprocketWebhookController.handleShiprocketWebhook(req2, res2, () => {});
      assert.equal(statusCode2, 200);
      assert.equal(duplicateCaught, true);
    });

    it('shiprocketWebhookController should preserve two legitimate scans with same status at different locations', async () => {
      const createdHistoryRecords: any[] = [];
      const recordedKeys: string[] = [];

      prisma.order.findFirst = (async () => ({ id: 'ord-multi-scan' })) as any;
      prisma.order.findUnique = (async () => ({ id: 'ord-multi-scan', status: 'SHIPPED' })) as any;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-multi-scan' }),
            findUnique: async () => ({ id: 'ord-multi-scan', status: 'SHIPPED' })
          },
          orderStatusHistory: {
            create: async (args: any) => {
              createdHistoryRecords.push(args.data);
              return { id: 'hist-scan' };
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              recordedKeys.push(args.data.event_id);
              if (webhookStore.has(args.data.event_id)) {
                const err: any = new Error('Duplicate');
                err.code = 'P2002';
                throw err;
              }
              webhookStore.set(args.data.event_id, args.data);
              return { id: 'evt-scan' };
            }
          }
        };
        return callback(tx);
      }) as any;

      // Scan 1: Hub Mumbai
      const payload1 = {
        awb: 'AWB-MULTI-SCAN',
        current_status_id: 18,
        current_status: 'In Transit',
        scans: [{ location: 'Mumbai Hub', date: '2026-10-23 10:00:00' }]
      };

      const req1: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload1))
      };
      let code1 = 0;
      await shiprocketWebhookController.handleShiprocketWebhook(req1, { status: (c: number) => { code1 = c; return { send: () => {} }; } } as any, () => {});

      // Scan 2: Hub Delhi (same status 18, but legitimate forward transit update at a new location)
      const payload2 = {
        awb: 'AWB-MULTI-SCAN',
        current_status_id: 18,
        current_status: 'In Transit',
        scans: [{ location: 'Delhi Hub', date: '2026-10-23 16:00:00' }]
      };

      const req2: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload2))
      };
      let code2 = 0;
      await shiprocketWebhookController.handleShiprocketWebhook(req2, { status: (c: number) => { code2 = c; return { send: () => {} }; } } as any, () => {});

      assert.equal(code1, 200);
      assert.equal(code2, 200);
      assert.equal(recordedKeys.length, 2);
      assert.notEqual(recordedKeys[0], recordedKeys[1]);
      assert.equal(createdHistoryRecords.length, 2);
      assert.ok(createdHistoryRecords[0].description.includes('Mumbai Hub'));
      assert.ok(createdHistoryRecords[1].description.includes('Delhi Hub'));
    });

    it('notificationService processNotification should atomically claim PENDING record and prevent concurrent duplicate worker execution', async () => {
      let claimCallCount = 0;
      let sendEmailCallCount = 0;

      const origSendEmail = (notificationService as any).emailProvider.sendEmail;
      (notificationService as any).emailProvider.sendEmail = async () => {
        sendEmailCallCount++;
        return { success: true, providerRef: 'mock-resend-ref-123' };
      };

      let currentStatus = 'PENDING';

      prisma.notificationLog = {
        updateMany: (async () => {
          claimCallCount++;
          if (currentStatus === 'PENDING') {
            currentStatus = 'PROCESSING';
            return { count: 1 };
          }
          return { count: 0 };
        }) as any,
        findUnique: (async () => ({
          id: 'notif-atomic-claim-1',
          channel: 'EMAIL',
          recipient: 'test@example.com',
          status: 'PROCESSING',
          payload: { subject: 'Order Update', body: 'Your order has shipped!' }
        })) as any,
        update: (async () => ({ id: 'notif-atomic-claim-1', status: 'SENT' })) as any
      } as any;

      try {
        const p1 = (notificationService as any).processNotification('notif-atomic-claim-1');
        const p2 = (notificationService as any).processNotification('notif-atomic-claim-1');
        await Promise.all([p1, p2]);

        assert.equal(claimCallCount, 2);
        assert.equal(sendEmailCallCount, 1, 'Email must be sent exactly once despite concurrent worker claims');
      } finally {
        (notificationService as any).emailProvider.sendEmail = origSendEmail;
      }
    });
  });

  describe('Visual Polish 11: Release Candidate Acceptance, Crash Recovery & Edge Cases', () => {
    it('shiprocketService createCustomOrder should handle HTTP 400 already exists by recovering existing shipment', async () => {
      const orderId = 'ord-sr-exists-rec';

      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        total_amount: 1999,
        customer_email: 'exists@example.com',
        customer_phone: '9876543210',
        created_at: new Date(),
        shipping_address_snapshot: {
          name: 'Exists Customer',
          line1: '123 Exists Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            quantity: 1,
            unit_price: 1999,
            product: { sku: 'SKU-EXISTS', name: 'Art Frame' },
            customization_data: {
              packaging: { length: 20, width: 15, height: 4, weight: 0.8 }
            }
          }
        ]
      })) as any;

      const origDryRun = process.env.SHIPROCKET_DRY_RUN;
      process.env.SHIPROCKET_DRY_RUN = 'false';
      mock.method(shiprocketService, 'authenticate', async () => 'mock-jwt-token');

      let recoverCalls = 0;
      mock.method(shiprocketService, 'recoverExistingShipment', async () => {
        recoverCalls++;
        if (recoverCalls === 1) {
          // Initial proactive check: not found yet
          return null;
        }
        // Second check (after 400 already exists): successfully extracts existing shipment
        return {
          shiprocketOrderId: 'SR-EXISTS-101',
          shipmentId: 'SHIP-EXISTS-202',
          awbCode: 'AWB-EXISTS-303'
        };
      });

      const origFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any) => {
        if (typeof url === 'string' && url.includes('orders/create/adhoc')) {
          return new Response(JSON.stringify({ message: 'Order already exists for channel' }), { status: 400 });
        }
        return new Response(JSON.stringify({ status: 200 }));
      }) as any;

      try {
        const result = await shiprocketService.createCustomOrder(orderId);
        assert.equal(result.shiprocketOrderId, 'SR-EXISTS-101');
        assert.equal(result.shipmentId, 'SHIP-EXISTS-202');
        assert.equal(result.awbCode, 'AWB-EXISTS-303');
        assert.equal(recoverCalls, 2);
      } finally {
        globalThis.fetch = origFetch;
        process.env.SHIPROCKET_DRY_RUN = origDryRun;
      }
    });

    it('shiprocketService createCustomOrder should safely recover existing shipment after database persistence failure', async () => {
      const orderId = 'ord-sr-db-fail';

      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        total_amount: 1999,
        customer_email: 'dbfail@example.com',
        customer_phone: '9876543210',
        created_at: new Date(),
        shipping_address_snapshot: {
          name: 'Retry Customer',
          line1: '123 Retry Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            quantity: 1,
            unit_price: 1999,
            product: { sku: 'SKU-RETRY', name: 'Art Frame' },
            customization_data: {
              packaging: { length: 20, width: 15, height: 4, weight: 0.8 }
            }
          }
        ]
      })) as any;

      const origDryRun = process.env.SHIPROCKET_DRY_RUN;
      process.env.SHIPROCKET_DRY_RUN = 'false';
      mock.method(shiprocketService, 'authenticate', async () => 'mock-jwt-token');

      // The shipment was previously created in Shiprocket before DB crashed
      mock.method(shiprocketService, 'recoverExistingShipment', async () => ({
        shiprocketOrderId: 'SR-PREV-CREATED',
        shipmentId: 'SHIP-PREV-CREATED',
        awbCode: 'AWB-PREV-CREATED'
      }));

      let adhocFetchCalled = false;
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any) => {
        if (typeof url === 'string' && url.includes('orders/create/adhoc')) {
          adhocFetchCalled = true;
        }
        return new Response(JSON.stringify({ status: 200 }));
      }) as any;

      try {
        const result = await shiprocketService.createCustomOrder(orderId);
        assert.equal(result.shiprocketOrderId, 'SR-PREV-CREATED');
        assert.equal(result.shipmentId, 'SHIP-PREV-CREATED');
        assert.equal(result.awbCode, 'AWB-PREV-CREATED');
        assert.equal(adhocFetchCalled, false, 'Must not call orders/create/adhoc when shipment was already created');
      } finally {
        globalThis.fetch = origFetch;
        process.env.SHIPROCKET_DRY_RUN = origDryRun;
      }
    });

    it('shiprocketService createCustomOrder should throw 502 on malformed response from Shiprocket', async () => {
      const orderId = 'ord-sr-malformed';

      prisma.order.findUnique = (async () => ({
        id: orderId,
        status: 'PROCESSING',
        total_amount: 1999,
        customer_email: 'malformed@example.com',
        customer_phone: '9876543210',
        created_at: new Date(),
        shipping_address_snapshot: {
          name: 'Malformed Test',
          line1: '123 Malformed Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001'
        },
        items: [
          {
            quantity: 1,
            unit_price: 1999,
            product: { sku: 'SKU-MAL', name: 'Art Frame' },
            customization_data: {
              packaging: { length: 20, width: 15, height: 4, weight: 0.8 }
            }
          }
        ]
      })) as any;

      const origDryRun = process.env.SHIPROCKET_DRY_RUN;
      process.env.SHIPROCKET_DRY_RUN = 'false';
      mock.method(shiprocketService, 'authenticate', async () => 'mock-jwt-token');
      mock.method(shiprocketService, 'recoverExistingShipment', async () => null);

      const origFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any) => {
        if (typeof url === 'string' && url.includes('orders/create/adhoc')) {
          // Returns 200 OK but with malformed / empty body
          return new Response(JSON.stringify({ status: 200, data: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 200 }));
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await shiprocketService.createCustomOrder(orderId);
          },
          (err: any) => {
            assert.equal(err.statusCode, 502);
            assert.ok(err.message.includes('Malformed Shiprocket order creation response'));
            return true;
          }
        );
      } finally {
        globalThis.fetch = origFetch;
        process.env.SHIPROCKET_DRY_RUN = origDryRun;
      }
    });

    it('notificationService should reclaim stale PROCESSING notification when worker crashed (>5m lease expired)', async () => {
      let updateManyCalled = false;

      prisma.order = {
        findUnique: (async () => ({
          id: 'ord-notif-stale',
          customer_phone: '9876543210',
          customer_email: 'test@example.com',
          shipping_address_snapshot: { name: 'Stale Customer' },
          user: null
        })) as any
      } as any;

      const expiredLeaseTime = Date.now() - 400_000; // 400s ago (>300s threshold)

      prisma.notificationLog = {
        create: (async () => {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }) as any,
        findFirst: (async () => ({
          id: 'notif-stale-rec-1',
          status: 'PROCESSING',
          order_id: 'ord-notif-stale',
          channel: 'SMS',
          event_type: 'ORDER_PROCESSING',
          attempt_count: 1,
          error_message: `LEASE:${expiredLeaseTime}`,
          created_at: new Date(expiredLeaseTime)
        })) as any,
        updateMany: (async (args: any) => {
          updateManyCalled = true;
          return { count: 1 };
        }) as any,
        findUnique: (async () => null) as any
      } as any;

      await notificationService.dispatchOrderProcessing('ord-notif-stale');
      assert.equal(updateManyCalled, true, 'Must atomically reclaim stale processing notification');
    });

    it('notificationService should NOT reclaim active PROCESSING notification while worker lease is still fresh (<5m)', async () => {
      let updateManyCalled = false;

      prisma.order = {
        findUnique: (async () => ({
          id: 'ord-notif-active',
          customer_phone: '9876543210',
          customer_email: 'test@example.com',
          shipping_address_snapshot: { name: 'Active Customer' },
          user: null
        })) as any
      } as any;

      const freshLeaseTime = Date.now() - 30_000; // 30s ago (fresh lease, active worker)

      prisma.notificationLog = {
        create: (async () => {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }) as any,
        findFirst: (async () => ({
          id: 'notif-active-rec-1',
          status: 'PROCESSING',
          order_id: 'ord-notif-active',
          channel: 'SMS',
          event_type: 'ORDER_PROCESSING',
          attempt_count: 1,
          error_message: `LEASE:${freshLeaseTime}`,
          created_at: new Date(freshLeaseTime)
        })) as any,
        updateMany: (async () => {
          updateManyCalled = true;
          return { count: 1 };
        }) as any,
        findUnique: (async () => null) as any
      } as any;

      await notificationService.dispatchOrderProcessing('ord-notif-active');
      assert.equal(updateManyCalled, false, 'Must NOT reclaim active processing notification while lease is valid');
    });

    it('notificationService reclaimStaleProcessingNotifications should sweep orphaned logs and mark FAILED after max attempts', async () => {
      let updatedToFailed = false;
      let reclaimedCount = 0;

      const expiredTime = Date.now() - 400_000;

      prisma.notificationLog = {
        findMany: (async () => [
          {
            id: 'notif-sweep-recoverable',
            status: 'PROCESSING',
            attempt_count: 2,
            error_message: `LEASE:${expiredTime}`,
            created_at: new Date(expiredTime)
          },
          {
            id: 'notif-sweep-exhausted',
            status: 'PROCESSING',
            attempt_count: 5,
            error_message: `LEASE:${expiredTime}`,
            created_at: new Date(expiredTime)
          }
        ]) as any,
        update: (async (args: any) => {
          if (args.where.id === 'notif-sweep-exhausted' && args.data.status === 'FAILED') {
            updatedToFailed = true;
          }
          return args.data;
        }) as any,
        updateMany: (async (args: any) => {
          if (args.where.id === 'notif-sweep-recoverable') {
            reclaimedCount++;
            return { count: 1 };
          }
          return { count: 0 };
        }) as any,
        findUnique: (async () => null) as any
      } as any;

      const result = await notificationService.reclaimStaleProcessingNotifications(300_000);
      assert.equal(result, 1, 'Only recoverable notifications should be reclaimed');
      assert.equal(reclaimedCount, 1);
      assert.equal(updatedToFailed, true, 'Exhausted retry logs must be marked FAILED');
    });

    it('shiprocketWebhookController should advance PROCESSING to SHIPPED when carrier picks up', async () => {
      let updatedStatus: string | null = null;
      let historyCreated = false;

      prisma.order.findFirst = (async () => ({ id: 'ord-wh-processing-shipped' })) as any;
      prisma.order.findUnique = (async () => ({ id: 'ord-wh-processing-shipped', status: 'PROCESSING' })) as any;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-processing-shipped' }),
            findUnique: async () => ({ id: 'ord-wh-processing-shipped', status: 'PROCESSING' }),
            update: async (args: any) => {
              updatedStatus = args.data.status;
              return { id: 'ord-wh-processing-shipped', ...args.data };
            }
          },
          orderStatusHistory: {
            create: async () => {
              historyCreated = true;
              return { id: 'hist-proc-shipped' };
            }
          },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              webhookStore.set(args.data.event_id, args.data);
              return { id: 'evt-proc-shipped' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const payload = {
        awb: 'AWB-PROC-42',
        current_status_id: 42, // Picked Up
        current_status: 'Picked Up'
      };

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };
      let code = 0;
      await shiprocketWebhookController.handleShiprocketWebhook(req, { status: (c: number) => { code = c; return { send: () => {} }; } } as any, () => {});

      assert.equal(code, 200);
      assert.equal(updatedStatus, 'SHIPPED');
      assert.equal(historyCreated, true);
    });

    it('shiprocketWebhookController should return 200 OK and ignore unknown status without mutating order', async () => {
      let orderUpdateAttempted = false;

      prisma.order.findFirst = (async () => ({ id: 'ord-wh-unknown' })) as any;
      prisma.order.findUnique = (async () => ({ id: 'ord-wh-unknown', status: 'PROCESSING' })) as any;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-unknown' }),
            findUnique: async () => ({ id: 'ord-wh-unknown', status: 'PROCESSING' }),
            update: async () => {
              orderUpdateAttempted = true;
            }
          },
          orderStatusHistory: { create: async () => ({ id: 'hist-unknown' }) },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              webhookStore.set(args.data.event_id, args.data);
              return { id: 'evt-unknown' };
            }
          }
        };
        return callback(tx);
      }) as any;

      const payload = {
        awb: 'AWB-UNKNOWN-99',
        current_status_id: 9999, // Unknown carrier status
        current_status: 'Custom Clearance Delay'
      };

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };
      let code = 0;
      await shiprocketWebhookController.handleShiprocketWebhook(req, { status: (c: number) => { code = c; return { send: () => {} }; } } as any, () => {});

      assert.equal(code, 200);
      assert.equal(orderUpdateAttempted, false, 'Unknown status must not update order');
    });

    it('shiprocketWebhookController should safely process webhooks with missing timestamps or missing scan arrays', async () => {
      let recordedEventId: string | null = null;

      prisma.order.findFirst = (async () => ({ id: 'ord-wh-missing-fields' })) as any;
      prisma.order.findUnique = (async () => ({ id: 'ord-wh-missing-fields', status: 'READY_FOR_PICKUP' })) as any;

      prisma.$transaction = (async (callback: any) => {
        const tx = {
          order: {
            findFirst: async () => ({ id: 'ord-wh-missing-fields' }),
            findUnique: async () => ({ id: 'ord-wh-missing-fields', status: 'READY_FOR_PICKUP' }),
            update: async () => ({ id: 'ord-wh-missing-fields', status: 'SHIPPED' })
          },
          orderStatusHistory: { create: async () => ({ id: 'hist-missing' }) },
          $executeRaw: async () => 1,
          webhookEvent: {
            create: async (args: any) => {
              recordedEventId = args.data.event_id;
              webhookStore.set(args.data.event_id, args.data);
              return { id: 'evt-missing' };
            }
          }
        };
        return callback(tx);
      }) as any;

      // Payload without timestamp, scans, location, or provider event_id
      const payload = {
        awb: 'AWB-SPARSE-1',
        current_status_id: 6
      };

      const req: any = {
        headers: { 'x-api-key': env.SHIPROCKET_WEBHOOK_TOKEN },
        body: Buffer.from(JSON.stringify(payload))
      };
      let code = 0;
      await shiprocketWebhookController.handleShiprocketWebhook(req, { status: (c: number) => { code = c; return { send: () => {} }; } } as any, () => {});

      assert.equal(code, 200);
      assert.equal(recordedEventId, 'sr_evt_AWB-SPARSE-1_6');
    });
  });
});
