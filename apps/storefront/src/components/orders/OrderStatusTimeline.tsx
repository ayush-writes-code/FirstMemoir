'use client';

import React from 'react';
import { OrderStatusHistoryDTO } from '@repo/shared';
import {
  Check,
  Clock,
  Package,
  Truck,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { formatOrderDate } from '@/utils/order-status';

interface StatusStage {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

const ORDER_STAGES: StatusStage[] = [
  {
    id: 'PENDING',
    label: 'Order Placed',
    description: 'Awaiting payment confirmation',
    icon: Clock,
  },
  {
    id: 'CONFIRMED',
    label: 'Confirmed',
    description: 'Payment verified & queued for print',
    icon: ShieldCheck,
  },
  {
    id: 'PROCESSING',
    label: 'In Production',
    description: 'Fine art printing & custom framing',
    icon: Package,
  },
  {
    id: 'SHIPPED',
    label: 'Dispatched',
    description: 'On its way with insured courier',
    icon: Truck,
  },
  {
    id: 'DELIVERED',
    label: 'Delivered',
    description: 'Delivered safely to doorstep',
    icon: Sparkles,
  },
];

export function OrderStatusTimeline({
  currentStatus,
  history = [],
}: {
  currentStatus: string;
  history?: OrderStatusHistoryDTO[];
}) {
  const isCancelled = currentStatus === 'CANCELLED';
  const isRefunded = currentStatus === 'REFUNDED';
  const isExpired = currentStatus === 'EXPIRED';

  if (isCancelled || isRefunded || isExpired) {
    const title = isRefunded
      ? 'Order Refunded'
      : isCancelled
        ? 'Order Cancelled'
        : 'Session Expired';
    const description = isRefunded
      ? 'The payment has been reversed to your original payment method. Please allow 5-7 business days for bank settlement.'
      : isCancelled
        ? 'This order was cancelled. If you believe this is an error or need help reordering, our concierge team is here to assist.'
        : 'The checkout session timed out before payment completion. Items have been saved back to your cart.';

    return (
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <AlertCircle size={24} strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif font-medium text-lg text-amber-900">{title}</h3>
          <p className="text-sm text-amber-800/90 leading-relaxed">{description}</p>
          <div className="pt-2">
            <a
              href="mailto:support@firstmemoir.com"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-brand underline underline-offset-4"
            >
              <HelpCircle size={14} /> Contact Concierge Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Normalize stages matching
  const normalizedStatus = currentStatus.toUpperCase().trim();
  const currentStageIndex = ORDER_STAGES.findIndex((s) => s.id === normalizedStatus);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  return (
    <div className="py-2">
      {/* Current Stage Headline Callout */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-paper-border">
        <div>
          <span className="text-xs font-mono font-semibold text-brand uppercase tracking-wider">
            Current Status
          </span>
          <h3 className="text-lg font-serif font-semibold text-ink">
            {ORDER_STAGES[activeIndex]?.label || normalizedStatus}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-sm sm:text-right">
          {ORDER_STAGES[activeIndex]?.description}
        </p>
      </div>

      {/* Desktop Horizontal Tracker */}
      <div className="hidden md:block relative pt-4 pb-2">
        {/* Track Line Background */}
        <div className="absolute top-9 left-[10%] right-[10%] h-0.5 bg-paper-border -translate-y-1/2" />

        {/* Progress Line Active */}
        <div
          className="absolute top-9 left-[10%] h-0.5 bg-brand -translate-y-1/2 transition-all duration-700 ease-out"
          style={{
            width: `${(Math.max(0, activeIndex) / (ORDER_STAGES.length - 1)) * 80}%`,
          }}
        />

        <div className="relative flex justify-between">
          {ORDER_STAGES.map((stage, index) => {
            const isCompleted = index <= activeIndex;
            const isCurrent = index === activeIndex;
            const Icon = stage.icon;

            const historyEntry = history.find((h) => h.new_status === stage.id);
            const dateStr = historyEntry ? formatOrderDate(historyEntry.created_at) : '';

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center w-1/5 relative z-10 text-center"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-ink border-ink text-white ring-4 ring-brand/20 shadow-sm scale-110'
                      : isCompleted
                        ? 'bg-ink border-ink text-white'
                        : 'bg-white border-paper-border text-zinc-300'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check size={18} strokeWidth={2.5} />
                  ) : (
                    <Icon size={18} strokeWidth={1.75} />
                  )}
                </div>

                <div className="mt-3 space-y-0.5">
                  <p
                    className={`text-xs font-medium ${
                      isCurrent
                        ? 'text-brand font-semibold'
                        : isCompleted
                          ? 'text-ink'
                          : 'text-zinc-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                  {dateStr && (
                    <p className="text-[11px] font-mono text-zinc-400">{dateStr}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Step Tracker */}
      <div className="md:hidden space-y-4 pt-2">
        {ORDER_STAGES.map((stage, index) => {
          const isCompleted = index <= activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = stage.icon;

          const historyEntry = history.find((h) => h.new_status === stage.id);
          const dateStr = historyEntry ? formatOrderDate(historyEntry.created_at) : '';

          return (
            <div key={stage.id} className="flex items-start gap-3.5 relative">
              {/* Connector line between steps */}
              {index < ORDER_STAGES.length - 1 && (
                <div
                  className={`absolute top-8 left-4 w-0.5 h-8 -ml-px ${
                    index < activeIndex ? 'bg-brand' : 'bg-paper-border'
                  }`}
                />
              )}

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-ink border-ink text-white ring-4 ring-brand/20'
                    : isCompleted
                      ? 'bg-ink border-ink text-white'
                      : 'bg-white border-paper-border text-zinc-300'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : (
                  <Icon size={14} strokeWidth={1.75} />
                )}
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-brand font-semibold'
                        : isCompleted
                          ? 'text-ink'
                          : 'text-zinc-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                  {dateStr && (
                    <span className="text-xs font-mono text-zinc-400">{dateStr}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

