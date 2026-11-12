"use client";

import { RefreshCw, Calendar, Plus } from "lucide-react";

interface PaymentsHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onCreateInstallment: () => void;
  onRecordPayment: () => void;
}

export function PaymentsHeader({
  onRefresh,
  isLoading,
  onCreateInstallment,
  onRecordPayment,
}: PaymentsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-[#1B3260] tracking-tight">
          Payments & Installments
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-normal">
          Track client payments, invoice allocations, and installment collections.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={onRefresh}
          className="p-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer"
          title="Refresh payment data"
        >
          <RefreshCw
            size={16}
            className={isLoading ? "animate-spin text-[#0481A2]" : ""}
          />
        </button>

        <button
          onClick={onCreateInstallment}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl shadow-2xs transition-all duration-150 cursor-pointer"
        >
          <Calendar size={16} className="text-[#0481A2]" />
          <span>Create Installment</span>
        </button>

        <button
          onClick={onRecordPayment}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-sm font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer"
        >
          <Plus size={18} />
          <span>Record Payment</span>
        </button>
      </div>
    </div>
  );
}

