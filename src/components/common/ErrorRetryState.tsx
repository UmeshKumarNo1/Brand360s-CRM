"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorRetryStateProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function ErrorRetryState({
  message = "Failed to load data from Supabase.",
  onRetry,
  className = "",
}: ErrorRetryStateProps) {
  return (
    <div className={`p-8 text-center space-y-3 bg-red-50/40 border border-red-100 rounded-xl ${className}`}>
      <div className="w-10 h-10 rounded-full bg-red-100 text-rose-600 flex items-center justify-center mx-auto">
        <AlertCircle size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-800">{message}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Please check your network connection and retry.</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <RefreshCw size={13} className="text-[#077EA1]" />
        <span>Retry</span>
      </button>
    </div>
  );
}

