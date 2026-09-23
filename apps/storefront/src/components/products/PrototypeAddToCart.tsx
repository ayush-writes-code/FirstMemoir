'use client';

import { useState } from 'react';
import { IS_PROTOTYPE_ENABLED } from '@/lib/prototype-data';

export function PrototypeAddToCart({ isMissingPrice }: { isMissingPrice?: boolean }) {
  const [added, setAdded] = useState(false);

  if (!IS_PROTOTYPE_ENABLED) {
    return (
      <div className="w-full">
        <button disabled className="w-full py-4 bg-surface-soft text-muted font-medium tracking-wide rounded-pill cursor-not-allowed">
          Currently Unavailable
        </button>
      </div>
    );
  }

  if (isMissingPrice) {
    return (
      <div className="w-full">
        <button 
          disabled
          className="w-full py-4 bg-surface-soft text-muted font-medium tracking-wide rounded-pill cursor-not-allowed"
        >
          Currently Unavailable
        </button>
        <p className="text-xs text-muted-soft text-center mt-3">This product is pending pricing confirmation.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button 
        onClick={() => {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }}
        className={`w-full py-4 font-medium tracking-wide rounded-pill transition-all duration-300 ${
          added ? 'bg-green-600 text-white' : 'bg-ink text-white hover:bg-ink/90'
        }`}
      >
        {added ? 'Added to Cart (Prototype)' : 'Add to Cart'}
      </button>
      <p className="text-xs text-muted-soft text-center mt-3 italic">
        *Prototype product. Cart transaction is isolated.
      </p>
    </div>
  );
}
