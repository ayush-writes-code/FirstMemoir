import { prisma, Prisma, PriceModifierType } from '@repo/database';

export interface PricingModifierBreakdown {
  optionName: string;
  value: string;
  type: PriceModifierType;
  amount: number;
}

export interface PricingBreakdown {
  version: 1;
  basePrice: number;
  modifiers: PricingModifierBreakdown[];
  subtotal: number;
  finalPrice: number;
}

// Strategy Pattern for Price Modifiers
type ModifierStrategy = (basePrice: Prisma.Decimal, modifierValue: Prisma.Decimal) => Prisma.Decimal;

const modifierStrategies: Record<PriceModifierType, ModifierStrategy> = {
  [PriceModifierType.FLAT]: (basePrice, modifierValue) => {
    return modifierValue;
  },
  [PriceModifierType.PERCENTAGE]: (basePrice, modifierValue) => {
    return basePrice.mul(modifierValue).div(new Prisma.Decimal(100));
  }
};

export const pricingService = {
  /**
   * Calculates the price for a product given a set of selected option values.
   * Enforces option exclusions and returns a structured breakdown.
   */
  async calculatePrice(productId: string, selectedOptionValueIds: string[]): Promise<PricingBreakdown> {
    // 1. Fetch Product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { base_price: true }
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found.`);
    }

    // 2. Fetch Selected Option Values
    const selectedValues = await prisma.productOptionValue.findMany({
      where: {
        id: { in: selectedOptionValueIds },
        option: { product_id: productId } // Ensure they belong to this product
      },
      include: {
        option: true
      }
    });

    if (selectedValues.length !== selectedOptionValueIds.length) {
      throw new Error('One or more option values are invalid or do not belong to this product.');
    }

    // 3. Check for Exclusions
    // Ensure no selected combination is excluded
    if (selectedOptionValueIds.length > 1) {
      // Create pairs of selected IDs in canonical order
      const pairs: { option_value_1_id: string; option_value_2_id: string }[] = [];
      for (let i = 0; i < selectedOptionValueIds.length; i++) {
        for (let j = i + 1; j < selectedOptionValueIds.length; j++) {
          const id1 = selectedOptionValueIds[i]!;
          const id2 = selectedOptionValueIds[j]!;
          pairs.push({
            option_value_1_id: id1 < id2 ? id1 : id2,
            option_value_2_id: id1 < id2 ? id2 : id1,
          });
        }
      }

      const exclusions = await prisma.optionExclusion.findMany({
        where: {
          product_id: productId,
          OR: pairs.map(p => ({
            option_value_1_id: p.option_value_1_id,
            option_value_2_id: p.option_value_2_id,
          }))
        }
      });

      if (exclusions.length > 0) {
        throw new Error('Selected combination is not allowed.');
      }
    }

    // 4. Calculate Final Price
    let finalPrice = new Prisma.Decimal(product.base_price);
    const modifiers: PricingModifierBreakdown[] = [];

    for (const val of selectedValues) {
      const strategy = modifierStrategies[val.modifier_type];
      if (!strategy) {
        throw new Error(`Unsupported modifier type: ${val.modifier_type}`);
      }

      const modifierAmount = strategy(new Prisma.Decimal(product.base_price), val.price_modifier);
      finalPrice = finalPrice.add(modifierAmount);

      modifiers.push({
        optionName: val.option.name,
        value: val.value,
        type: val.modifier_type,
        amount: modifierAmount.toNumber(), // Convert Decimal to JS Number
      });
    }

    // 5. Build and return structured breakdown
    return {
      version: 1,
      basePrice: new Prisma.Decimal(product.base_price).toNumber(),
      modifiers,
      subtotal: finalPrice.toNumber(),
      finalPrice: finalPrice.toNumber(),
    };
  }
};
