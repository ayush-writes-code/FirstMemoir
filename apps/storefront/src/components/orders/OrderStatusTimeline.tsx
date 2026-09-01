import React from 'react';
import { OrderStatusHistoryDTO } from '@repo/shared';
import { Check, Clock, Package, Truck, Home, AlertCircle } from 'lucide-react';

const STATUS_STAGES = [
  { id: 'PENDING', label: 'Order Placed', icon: Clock },
  { id: 'CONFIRMED', label: 'Confirmed', icon: Check },
  { id: 'PROCESSING', label: 'Processing', icon: Package },
  { id: 'SHIPPED', label: 'Shipped', icon: Truck },
  { id: 'DELIVERED', label: 'Delivered', icon: Home },
];

export function OrderStatusTimeline({ 
  currentStatus, 
  history 
}: { 
  currentStatus: string; 
  history: OrderStatusHistoryDTO[]; 
}) {
  const isCancelledOrExpired = ['CANCELLED', 'EXPIRED'].includes(currentStatus);

  if (isCancelledOrExpired) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <AlertCircle size={32} className="text-red-500 mb-3" />
        <h3 className="text-lg font-medium text-red-900">Order {currentStatus === 'CANCELLED' ? 'Cancelled' : 'Expired'}</h3>
        <p className="text-red-600 mt-1">This order is no longer active.</p>
      </div>
    );
  }

  const currentStageIndex = STATUS_STAGES.findIndex(s => s.id === currentStatus);

  return (
    <div className="py-6">
      <div className="relative">
        {/* Track Line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-zinc-200" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-5 left-[10%] h-0.5 bg-black transition-all duration-500"
          style={{ width: `${(Math.max(0, currentStageIndex) / (STATUS_STAGES.length - 1)) * 80}%` }}
        />

        <div className="relative flex justify-between">
          {STATUS_STAGES.map((stage, index) => {
            const isCompleted = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const Icon = stage.icon;

            const historyEntry = history.find(h => h.new_status === stage.id);
            const dateStr = historyEntry 
              ? new Date(historyEntry.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
              : '';

            return (
              <div key={stage.id} className="flex flex-col items-center w-1/5 relative z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isCompleted 
                      ? 'bg-black border-black text-white' 
                      : 'bg-white border-zinc-200 text-zinc-300'
                    }
                    ${isCurrent ? 'ring-4 ring-black/10' : ''}
                  `}
                >
                  <Icon size={20} />
                </div>
                <div className="mt-3 text-center">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-black' : 'text-zinc-400'}`}>
                    {stage.label}
                  </p>
                  {dateStr && (
                    <p className="text-xs text-zinc-500 mt-0.5">{dateStr}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
