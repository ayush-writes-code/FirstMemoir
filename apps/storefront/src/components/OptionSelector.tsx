'use client';

import type { ProductOptionDto } from '@/lib/api-client';

interface Props {
  option: ProductOptionDto;
  selectedValueId: string | null;
  excludedValueIds: Set<string>;
  onChange: (valueId: string) => void;
}

/**
 * OptionSelector renders the appropriate UI control based on the option's input_type:
 *  - RADIO: radio buttons
 *  - BUTTON: pill-style toggle buttons
 *  - SELECT: native <select>
 *  - SWATCH: colour/texture swatches (metadata.hex used for fill)
 *
 * Excluded values are visually disabled and non-interactive.
 */
export function OptionSelector({ option, selectedValueId, excludedValueIds, onChange }: Props) {
  const isExcluded = (valueId: string) => excludedValueIds.has(valueId);
  const selectedValue = option.values.find((v) => v.id === selectedValueId);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-mono uppercase tracking-[0.14em] text-muted-soft flex items-center gap-1">
          <span>{option.name}</span>
          {option.is_required && <span className="text-brand">*</span>}
        </label>
        {selectedValue && (
          <span className="font-medium text-ink-deep text-xs">
            {selectedValue.value}
          </span>
        )}
      </div>

      {option.input_type === 'SELECT' && (
        <select
          value={selectedValueId ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={option.name}
          className="w-full border border-editorial-border rounded-xl px-3.5 py-2.5 text-sm text-ink-deep bg-white focus:outline-none focus:ring-2 focus:ring-brand transition-all shadow-sm"
        >
          {option.values.map((val) => (
            <option key={val.id} value={val.id} disabled={isExcluded(val.id)}>
              {val.value}
              {Number(val.price_modifier) > 0 && ` (+₹${Number(val.price_modifier).toLocaleString('en-IN')})`}
            </option>
          ))}
        </select>
      )}

      {(option.input_type === 'RADIO' || option.input_type === 'BUTTON') && (
        <div className="flex flex-wrap gap-2.5">
          {option.values.map((val) => {
            const excluded = isExcluded(val.id);
            const selected = selectedValueId === val.id;
            return (
              <button
                key={val.id}
                type="button"
                disabled={excluded}
                onClick={() => !excluded && onChange(val.id)}
                title={excluded ? 'Not available with current selections' : val.value}
                className={[
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                  selected
                    ? 'bg-[#18181A] text-white border-[#18181A] shadow-sm'
                    : 'bg-white text-ink-deep border-editorial-border hover:border-ink/50 hover:bg-canvas-warm/60',
                  excluded
                    ? 'opacity-30 cursor-not-allowed line-through bg-surface-soft border-editorial-border/40'
                    : 'cursor-pointer active:scale-95',
                ].join(' ')}
              >
                {val.value}
                {Number(val.price_modifier) > 0 && (
                  <span className={`ml-1 text-xs font-normal ${selected ? 'text-white/80' : 'text-muted-soft'}`}>
                    +₹{Number(val.price_modifier).toLocaleString('en-IN')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {option.input_type === 'SWATCH' && (
        <div className="flex flex-wrap gap-3">
          {option.values.map((val) => {
            const excluded = isExcluded(val.id);
            const selected = selectedValueId === val.id;
            const hexColor = (val.metadata as { hex?: string } | null)?.hex ?? '#cccccc';
            return (
              <button
                key={val.id}
                type="button"
                disabled={excluded}
                onClick={() => !excluded && onChange(val.id)}
                title={excluded ? `${val.value} — not available` : val.value}
                aria-label={val.value}
                className={[
                  'w-9 h-9 rounded-full border border-black/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  selected 
                    ? 'ring-2 ring-[#18181A] ring-offset-2 ring-offset-white scale-110 shadow-sm' 
                    : 'hover:scale-105 hover:ring-1 hover:ring-editorial-border hover:ring-offset-1',
                  excluded ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
                style={{ backgroundColor: hexColor }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

