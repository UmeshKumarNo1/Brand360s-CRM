"use client";

import { RefreshCw, CalendarPlus } from "lucide-react";

interface RenewalsHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onCreateRenewal: () => void;
}

export function RenewalsHeader({ onRefresh, isLoading, onCreateRenewal }: RenewalsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-[#1B3260] tracking-tight">
          Renewals
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage upcoming, due, overdue, and renewed service subscriptions.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          className="p-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-xl shadow-2xs transition-colors cursor-pointer"
          title="Refresh renewals"
          aria-label="Refresh renewals"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
        </button>

        <button
          onClick={onCreateRenewal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <CalendarPlus size={16} />
          <span>Create Renewal</span>
        </button>
      </div>
    </div>
  );
}
