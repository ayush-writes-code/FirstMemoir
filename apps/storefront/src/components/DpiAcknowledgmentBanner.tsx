'use client';

import { QUALITY_LABELS } from '@/lib/dpi';
import type { PrintQualityStatus } from '@/lib/api-client';

interface Props {
  status?: PrintQualityStatus;
  acknowledged: boolean;
  onAcknowledge: () => void;
}

/**
 * DpiAcknowledgmentBanner is shown when the effective DPI is LOW_QUALITY or NOT_RECOMMENDED.
 *
 * Per architecture contract: we do NOT permanently block checkout for low-DPI images.
 * Instead, the customer must explicitly acknowledge they understand the print quality may
 * be poor before the "Add to Cart" button becomes interactive.
 *
 * This design supports legitimate use cases such as old family photos, vintage images,
 * and artistic low-resolution prints.
 *
 * The backend re-validates dpi_acknowledged === true at cart submission time.
 */
export function DpiAcknowledgmentBanner({ status = 'LOW_QUALITY', acknowledged, onAcknowledge }: Props) {
  const info = QUALITY_LABELS[status];

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      status === 'NOT_RECOMMENDED'
        ? 'border-red-200 bg-red-50'
        : 'border-orange-200 bg-orange-50'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{status === 'NOT_RECOMMENDED' ? '🚫' : '⚠️'}</span>
        <div>
          <p className={`font-semibold text-sm ${info.color}`}>{info.label}</p>
          <p className="text-sm text-muted mt-0.5">{info.description}</p>
        </div>
      </div>

      {!acknowledged ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-hairline accent-brand w-4 h-4"
            onChange={e => e.target.checked && onAcknowledge()}
          />
          <span className="text-sm text-ink">
            I understand the print quality may be poor and want to proceed anyway.
          </span>
        </label>
      ) : (
        <p className="text-sm text-green-600 font-medium flex items-center gap-1">
          <span>✓</span> Acknowledged — you can now add this to your cart.
        </p>
      )}
    </div>
  );
}
