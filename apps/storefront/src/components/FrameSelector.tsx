'use client';
import { useState } from 'react';
import type { FrameMaterial } from '@repo/api-client';

export function FrameSelector({ materials, type, label }: { materials: FrameMaterial[], type: 'FRAME' | 'GLASS', label: string }) {
  const filteredMaterials = materials.filter(m => m.type === type && m.is_active);
  const [selectedId, setSelectedId] = useState<string | null>(filteredMaterials[0]?.id || null);

  if (filteredMaterials.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-ink mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        {filteredMaterials.map(material => (
          <button
            key={material.id}
            onClick={() => setSelectedId(material.id)}
            className={`flex flex-col items-start p-4 rounded-card border-2 transition-colors text-left ${
              selectedId === material.id 
                ? 'border-brand bg-surface-cream' 
                : 'border-border-strong bg-white hover:border-ink'
            }`}
          >
            <span className="font-medium text-ink">{material.name}</span>
            <span className="text-sm text-brand mt-1">+₹{Number(material.price_modifier).toLocaleString('en-IN')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
