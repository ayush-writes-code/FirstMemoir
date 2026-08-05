import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, PriceModifierType, Prisma } from '@repo/database';
import { pricingService } from '../pricing.service.js';

describe('PricingService Unit Tests', () => {
  const mockProductId = 'test-product-123';

  beforeEach(() => {
    // Reset or set default mock implementations before each test
  });

  it('should return base price when product has no options selected', async () => {
    // Mock prisma responses
    prisma.product.findUnique = (async () => ({
      base_price: new Prisma.Decimal(1000),
    })) as any;

    prisma.productOptionValue.findMany = (async () => []) as any;

    const result = await pricingService.calculatePrice(mockProductId, []);

    assert.equal(result.version, 1);
    assert.equal(result.basePrice, 1000);
    assert.equal(result.subtotal, 1000);
    assert.equal(result.finalPrice, 1000);
    assert.equal(result.modifiers.length, 0);
  });

  it('should correctly calculate FLAT price modifiers', async () => {
    prisma.product.findUnique = (async () => ({
      base_price: new Prisma.Decimal(1000),
    })) as any;

    prisma.productOptionValue.findMany = (async () => [
      {
        id: 'val-flat-1',
        value: 'A5 Size',
        price_modifier: new Prisma.Decimal(200),
        modifier_type: PriceModifierType.FLAT,
        option: { name: 'Size' },
      },
    ]) as any;

    const result = await pricingService.calculatePrice(mockProductId, ['val-flat-1']);

    assert.equal(result.basePrice, 1000);
    assert.equal(result.subtotal, 1200);
    assert.equal(result.finalPrice, 1200);
    assert.equal(result.modifiers.length, 1);
    assert.deepEqual(result.modifiers[0], {
      optionName: 'Size',
      value: 'A5 Size',
      type: PriceModifierType.FLAT,
      amount: 200,
    });
  });

  it('should correctly calculate PERCENTAGE price modifiers', async () => {
    prisma.product.findUnique = (async () => ({
      base_price: new Prisma.Decimal(1000),
    })) as any;

    prisma.productOptionValue.findMany = (async () => [
      {
        id: 'val-perc-1',
        value: 'Teak Frame',
        price_modifier: new Prisma.Decimal(10), // 10%
        modifier_type: PriceModifierType.PERCENTAGE,
        option: { name: 'Frame' },
      },
    ]) as any;

    const result = await pricingService.calculatePrice(mockProductId, ['val-perc-1']);

    assert.equal(result.basePrice, 1000);
    assert.equal(result.subtotal, 1100);
    assert.equal(result.finalPrice, 1100);
    assert.equal(result.modifiers.length, 1);
    assert.deepEqual(result.modifiers[0], {
      optionName: 'Frame',
      value: 'Teak Frame',
      type: PriceModifierType.PERCENTAGE,
      amount: 100,
    });
  });

  it('should correctly calculate mixed FLAT and PERCENTAGE modifiers', async () => {
    prisma.product.findUnique = (async () => ({
      base_price: new Prisma.Decimal(1000),
    })) as any;

    prisma.productOptionValue.findMany = (async () => [
      {
        id: 'val-flat-1',
        value: 'A5 Size',
        price_modifier: new Prisma.Decimal(200),
        modifier_type: PriceModifierType.FLAT,
        option: { name: 'Size' },
      },
      {
        id: 'val-perc-1',
        value: 'Teak Frame',
        price_modifier: new Prisma.Decimal(10), // 10% of 1000 = 100
        modifier_type: PriceModifierType.PERCENTAGE,
        option: { name: 'Frame' },
      },
    ]) as any;

    prisma.optionExclusion.findMany = (async () => []) as any;

    const result = await pricingService.calculatePrice(mockProductId, ['val-flat-1', 'val-perc-1']);

    assert.equal(result.basePrice, 1000);
    assert.equal(result.subtotal, 1300); // 1000 + 200 + 100
    assert.equal(result.finalPrice, 1300);
    assert.equal(result.modifiers.length, 2);
  });

  it('should throw an error when selected options violate an exclusion rule', async () => {
    prisma.product.findUnique = (async () => ({
      base_price: new Prisma.Decimal(1000),
    })) as any;

    prisma.productOptionValue.findMany = (async () => [
      {
        id: 'val-canvas',
        value: 'Canvas',
        price_modifier: new Prisma.Decimal(0),
        modifier_type: PriceModifierType.FLAT,
        option: { name: 'Material' },
      },
      {
        id: 'val-glass',
        value: 'Glass Cover',
        price_modifier: new Prisma.Decimal(50),
        modifier_type: PriceModifierType.FLAT,
        option: { name: 'Glass' },
      },
    ]) as any;

    // Simulate exclusion rule exists between val-canvas and val-glass
    prisma.optionExclusion.findMany = (async () => [
      {
        id: 'ex-1',
        product_id: mockProductId,
        option_value_1_id: 'val-canvas',
        option_value_2_id: 'val-glass',
      },
    ]) as any;

    await assert.rejects(
      async () => {
        await pricingService.calculatePrice(mockProductId, ['val-canvas', 'val-glass']);
      },
      {
        name: 'Error',
        message: 'Selected combination is not allowed.',
      }
    );
  });
});
