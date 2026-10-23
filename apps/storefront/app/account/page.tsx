'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/store/auth.context';
import {
  Package,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Gem,
  CheckCircle2,
} from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth();
  const firstName = user?.first_name || 'Collector';

  return (
    <div className="space-y-8">
      {/* Studio Greeting Banner */}
      <div className="bg-white border border-paper-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-warm border border-paper-border text-xs font-mono font-medium text-brand">
              <Sparkles size={13} />
              <span>Studio Member Dashboard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-ink tracking-tight">
              Welcome back, {firstName}
            </h2>
            <p className="text-sm text-zinc-600 max-w-xl leading-relaxed">
              From this studio space, you can review order records, follow ongoing frame crafting, and track live nationwide deliveries.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand active:bg-brand-pressed transition-colors shadow-xs shrink-0 self-start md:self-center"
          >
            <span>Start a New Print</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Order History */}
        <div className="bg-white border border-paper-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand/40 transition-colors shadow-xs group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center text-ink group-hover:text-brand group-hover:bg-brand/5 transition-colors">
              <Package size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-serif font-medium text-lg text-ink">
                Order History & Invoices
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                Inspect details of your custom framed prints, download tax invoices, and track workshop production stages.
              </p>
            </div>
          </div>
          <div className="pt-6 mt-4 border-t border-paper-border">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ink group-hover:text-brand transition-colors"
            >
              <span>View All Orders</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Card 2: Track Shipment */}
        <div className="bg-white border border-paper-border rounded-2xl p-6 flex flex-col justify-between hover:border-brand/40 transition-colors shadow-xs group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-paper-warm border border-paper-border flex items-center justify-center text-ink group-hover:text-brand group-hover:bg-brand/5 transition-colors">
              <Search size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-serif font-medium text-lg text-ink">
                Courier Tracking
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                Direct lookup for packages in transit with real-time Air Waybill (AWB) updates and estimated delivery schedules.
              </p>
            </div>
          </div>
          <div className="pt-6 mt-4 border-t border-paper-border">
            <Link
              href="/track-order"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ink group-hover:text-brand transition-colors"
            >
              <span>Track a Shipment</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Account Profile & Craftsmanship Standards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="bg-white border border-paper-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-paper-border">
            <ShieldCheck size={18} className="text-brand" />
            <h3 className="font-serif font-medium text-base text-ink">
              Profile & Security
            </h3>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider block mb-0.5">
                Full Name
              </span>
              <span className="font-medium text-ink">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Not provided'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider block mb-0.5">
                Registered Mobile
              </span>
              <span className="font-medium text-ink font-mono">
                {user?.phone_number || 'Not provided'}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider block mb-0.5">
                Authentication
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 size={14} /> Passwordless SMS OTP
              </span>
            </div>
          </div>
        </div>

        {/* Craftsmanship Guarantee Card */}
        <div className="lg:col-span-2 bg-white border border-paper-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-paper-border">
            <Gem size={18} className="text-brand" />
            <h3 className="font-serif font-medium text-base text-ink">
              The FirstMemoir Craftsmanship Standard
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-ink">Archival Fine Art Paper</p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                100% cotton-rag, acid-free museum media guaranteed fade-resistant for 100+ years.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-ink">Solid Hardwood Framing</p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                FSC-certified timber corner-joined by hand with archival mount boards and shatter-resistant acrylic.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-ink">Insured White-Glove Transit</p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Multi-layer protective edge casing delivered door-to-door across all pin codes in India.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-paper-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
            <span>Questions regarding an order or custom framing?</span>
            <a
              href="mailto:support@firstmemoir.com"
              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
            >
              <HelpCircle size={14} />
              <span>Contact Artisan Concierge</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

