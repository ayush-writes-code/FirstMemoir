'use client';

import { useMemo } from 'react';
import type { ProductWithOptionsDto } from '@repo/api-client';

interface Props {
  product: ProductWithOptionsDto;
  selectedValueIds: string[];
}

/**
 * PriceSummary calculates and displays the optimistic price in the browser.
 *
 * IMPORTANT: This price is purely informational. The backend always recalculates
 * the authoritative price from selectedOptionValueIds at checkout using pricing.service.ts.
 * This component must never be used as the source of truth for payment amounts.
 */
export function PriceSummary({ product, selectedValueIds }: Props) {
  const { basePrice, modifiers, total } = useMemo(() => {
    const base = Number(product.base_price);
    let subtotalModifier = 0;

    const modifierLines: { label: string; amount: number; type: 'FLAT' | 'PERCENTAGE' }[] = [];

    for (const option of product.options) {
      const selectedValue = option.values.find(v => selectedValueIds.includes(v.id));
      if (!selectedValue || Number(selectedValue.price_modifier) === 0) continue;

      const modAmt = Number(selectedValue.price_modifier);

      if (selectedValue.modifier_type === 'FLAT') {
        modifierLines.push({ label: `${option.name}: ${selectedValue.value}`, amount: modAmt, type: 'FLAT' });
        subtotalModifier += modAmt;
      } else {
        // PERCENTAGE modifier is applied to the base price
        const pct = (base * modAmt) / 100;
        modifierLines.push({ label: `${option.name}: ${selectedValue.value}`, amount: pct, type: 'PERCENTAGE' });
        subtotalModifier += pct;
      }
    }

    return {
      basePrice: base,
      modifiers: modifierLines,
      total: Math.round(base + subtotalModifier),
    };
  }, [product, selectedValueIds]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-1">
      {modifiers.length > 0 ? (
        <>
          <div className="flex justify-between text-sm text-muted">
            <span>Base price</span>
            <span>{fmt(basePrice)}</span>
          </div>
          {modifiers.map((m, i) => (
            <div key={i} className="flex justify-between text-sm text-muted">
              <span>{m.label}</span>
              <span>+{fmt(Math.round(m.amount))}</span>
            </div>
          ))}
          <div className="flex justify-between text-xl font-semibold text-ink pt-1 border-t border-hairline">
            <span>Total</span>
            <span className="text-brand">{fmt(total)}</span>
          </div>
        </>
      ) : (
        <p className="text-3xl font-semibold text-brand">{fmt(total)}</p>
      )}
      <p className="text-xs text-muted">Final price calculated at checkout</p>
    </div>
  );
}
