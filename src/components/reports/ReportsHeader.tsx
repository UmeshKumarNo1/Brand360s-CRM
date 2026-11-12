"use client";

import { RefreshCw, Download, FileSpreadsheet } from "lucide-react";

interface ReportsHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onExportCsv: () => void;
}

export function ReportsHeader({ onRefresh, isLoading, onExportCsv }: ReportsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-[#1B3260] tracking-tight">
          Reports & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Real-time financial performance, client growth, and team revenue analytics.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-2xl shadow-2xs transition-colors cursor-pointer"
          title="Refresh report metrics"
          aria-label="Refresh report metrics"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
        </button>

        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-2xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet size={15} className="text-emerald-600" />
          <span>Export Summary CSV</span>
        </button>
      </div>
    </div>
  );
}
