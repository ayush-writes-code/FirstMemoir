'use client';

import type { ProductOptionDto } from '@repo/api-client';

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

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-ink uppercase tracking-wide">
        {option.name}
        {option.is_required && <span className="text-brand ml-1">*</span>}
      </label>

      {option.input_type === 'SELECT' && (
        <select
          value={selectedValueId ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-hairline rounded-lg px-3 py-2 text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {option.values.map(val => (
            <option key={val.id} value={val.id} disabled={isExcluded(val.id)}>
              {val.value}
              {Number(val.price_modifier) > 0 && ` (+₹${Number(val.price_modifier).toLocaleString('en-IN')})`}
            </option>
          ))}
        </select>
      )}

      {(option.input_type === 'RADIO' || option.input_type === 'BUTTON') && (
        <div className="flex flex-wrap gap-3">
          {option.values.map(val => {
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
                  'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  selected
                    ? 'bg-ink text-canvas border-ink'
                    : 'bg-surface text-ink border-hairline hover:border-ink',
                  excluded
                    ? 'opacity-30 cursor-not-allowed line-through'
                    : 'cursor-pointer',
                ].join(' ')}
              >
                {val.value}
                {Number(val.price_modifier) > 0 && (
                  <span className="ml-1 opacity-70 text-xs font-normal">
                    +₹{Number(val.price_modifier).toLocaleString('en-IN')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {option.input_type === 'SWATCH' && (
        <div className="flex flex-wrap gap-4">
          {option.values.map(val => {
            const excluded = isExcluded(val.id);
            const selected = selectedValueId === val.id;
            const hexColor = (val.metadata as any)?.hex ?? '#cccccc';
            return (
              <button
                key={val.id}
                type="button"
                disabled={excluded}
                onClick={() => !excluded && onChange(val.id)}
                title={excluded ? `${val.value} — not available` : val.value}
                className={[
                  'w-10 h-10 rounded-full border border-hairline transition-all outline-none',
                  selected ? 'ring-2 ring-ink ring-offset-2 scale-110' : 'hover:ring-2 hover:ring-hairline hover:ring-offset-2',
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
