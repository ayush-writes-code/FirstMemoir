import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@repo/database';
import { NotificationService } from './notification.service.js';
import { mockSmsProvider } from './providers/mock.sms.provider.js';
import { mockEmailProvider } from './providers/mock.email.provider.js';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    service = new NotificationService(mockSmsProvider, mockEmailProvider);
    mock.restoreAll();
  });

  it('creates PENDING logs and processes them successfully', async () => {
    // 1. Setup mock cart and order
    const cart = await prisma.cart.create({ data: {} });
    const mockOrder = await prisma.order.create({
      data: {
        cart_id: cart.id,
        customer_phone: '+919876543210',
        customer_email: 'test@example.com',
        total_amount: 100,
        shipping_address_snapshot: {}
      }
    });

    const smsSpy = mock.method(mockSmsProvider, 'sendSms');
    const emailSpy = mock.method(mockEmailProvider, 'sendEmail');

    // 2. Dispatch
    await service.dispatchOrderConfirmed(mockOrder.id);

    // 3. Deterministic wait
    let logs: any[] = [];
    for (let i = 0; i < 20; i++) {
      logs = await prisma.notificationLog.findMany({ where: { order_id: mockOrder.id } });
      if (logs.length === 2 && logs.every(l => l.status !== 'PENDING')) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 4. Verify
    assert.strictEqual(smsSpy.mock.callCount(), 1);
    assert.strictEqual(emailSpy.mock.callCount(), 1);

    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs.every(l => l.status === 'SENT'), true);
    assert.strictEqual(logs.every(l => l.attempt_count === 1), true);
    assert.strictEqual(logs.every(l => l.provider_ref !== null), true);
  });

  it('handles provider failures by creating FAILED log without throwing', async () => {
    // 1. Setup mock cart and order with failing phone number (as designed in mock provider)
    const cart = await prisma.cart.create({ data: {} });
    const mockOrder = await prisma.order.create({
      data: {
        cart_id: cart.id,
        customer_phone: 'FAIL_9876543210',
        customer_email: 'fail@example.com',
        total_amount: 100,
        shipping_address_snapshot: {}
      }
    });

    const smsSpy = mock.method(mockSmsProvider, 'sendSms');

    // 2. Dispatch (should not throw)
    try {
      await service.dispatchOrderProcessing(mockOrder.id);
    } catch (e) {
      assert.fail('Should not throw');
    }

    // 3. Deterministic wait
    let logs: any[] = [];
    for (let i = 0; i < 20; i++) {
      logs = await prisma.notificationLog.findMany({ where: { order_id: mockOrder.id } });
      if (logs.length === 1 && logs[0] && logs[0].status !== 'PENDING') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 4. Verify
    assert.strictEqual(smsSpy.mock.callCount(), 1);

    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0]);
    assert.strictEqual(logs[0].status, 'FAILED');
    assert.strictEqual(logs[0].error_message, 'Simulated SMS provider failure');
  });
});
