'use client';

import { useMemo } from 'react';
import type { ProductWithOptionsDto } from '@/lib/api-client';

interface Props {
  product: ProductWithOptionsDto;
  selectedValueIds: string[];
}

export function useProductPrice(product: ProductWithOptionsDto, selectedValueIds: string[]) {
  return useMemo(() => {
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
}

/**
 * PriceSummary calculates and displays the optimistic price in the browser.
 *
 * IMPORTANT: This price is purely informational. The backend always recalculates
 * the authoritative price from selectedOptionValueIds at checkout using pricing.service.ts.
 * This component must never be used as the source of truth for payment amounts.
 */
export function PriceSummary({ product, selectedValueIds }: Props) {
  const { basePrice, modifiers, total } = useProductPrice(product, selectedValueIds);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  // If there are no modifiers and no options, the price is already clearly stated at the top of the purchase section
  if (modifiers.length === 0 && (!product.options || product.options.length === 0)) {
    return null;
  }

  return (
    <div className="bg-canvas-warm/80 border border-editorial-border rounded-xl p-3.5 space-y-2">
      {modifiers.length > 0 ? (
        <>
          <div className="flex justify-between text-xs text-muted-soft">
            <span>Base price</span>
            <span>{fmt(basePrice)}</span>
          </div>
          {modifiers.map((m, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-soft">
              <span>{m.label}</span>
              <span>+{fmt(Math.round(m.amount))}</span>
            </div>
          ))}
          <div className="flex justify-between items-baseline text-sm font-medium text-ink-deep pt-2 border-t border-editorial-border">
            <span>Configured Total</span>
            <span className="text-lg font-semibold text-ink-deep">{fmt(total)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between items-baseline text-sm font-medium text-ink-deep">
          <span className="text-xs uppercase tracking-wider text-muted-soft font-mono">Total</span>
          <span className="text-lg font-semibold text-ink-deep">{fmt(total)}</span>
        </div>
      )}
      <p className="text-[11px] text-muted-soft">Final authoritative price confirmed at checkout</p>
    </div>
  );
}

