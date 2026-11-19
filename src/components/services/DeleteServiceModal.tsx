"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2, X, Ban, FileText, CheckCircle2, DollarSign } from "lucide-react";
import type { ServiceDeletionEligibility } from "@/app/actions/services";
import { formatINR } from "@/lib/utils";

interface DeleteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  serviceName: string;
  eligibility: ServiceDeletionEligibility | null;
  isLoadingCheck?: boolean;
}

export function DeleteServiceModal({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  eligibility,
  isLoadingCheck = false,
}: DeleteServiceModalProps) {
  const [matchInput, setMatchInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const canDelete = eligibility ? eligibility.canDelete : false;
  const isBlocked = eligibility ? !eligibility.canDelete : false;

  const handleConfirm = async () => {
    if (!canDelete) return;
    if (matchInput.trim().toLowerCase() !== serviceName.trim().toLowerCase()) {
      setError(`Please type "${serviceName}" to confirm.`);
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete service.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-5 flex items-start gap-3 border-b border-slate-100 ${isBlocked ? "bg-amber-50/60" : "bg-red-50/40"}`}>
          <div className={`p-2.5 rounded-xl shrink-0 ${isBlocked ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
            {isBlocked ? <Ban size={20} /> : <Trash2 size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {isBlocked ? "Service Deletion Restricted" : "Delete Client Service"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Service: <span className="font-semibold text-slate-800">{serviceName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
              {error}
            </div>
          )}

          {isLoadingCheck ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin text-[#0481A2]" />
              <span>Verifying service financial eligibility...</span>
            </div>
          ) : eligibility ? (
            <>
              {/* Financial Dependency Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Financial Audit Status</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      canDelete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {canDelete ? "Eligible for Deletion" : "Permanent Deletion Blocked"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-center">
                    <span className="text-[10px] text-slate-500 block">Draft Invoices</span>
                    <span className="text-xs font-bold text-slate-800">{eligibility.draftInvoicesCount}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-center">
                    <span className="text-[10px] text-slate-500 block">Issued Invoices</span>
                    <span className={`text-xs font-bold ${eligibility.issuedInvoicesCount > 0 ? "text-amber-600" : "text-slate-800"}`}>
                      {eligibility.issuedInvoicesCount}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-center">
                    <span className="text-[10px] text-slate-500 block">Allocated Payments</span>
                    <span className={`text-xs font-bold ${eligibility.allocatedTotal > 0 ? "text-rose-600" : "text-slate-800"}`}>
                      {formatINR(eligibility.allocatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consequence / Explanation banner */}
              <div
                className={`p-3.5 rounded-xl border leading-relaxed space-y-1.5 ${
                  isBlocked
                    ? "bg-amber-50/70 border-amber-200/80 text-amber-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <p className="font-semibold text-slate-900">
                  {isBlocked ? "Reason Deletion is Blocked:" : "Consequences & Scope:"}
                </p>
                <p>{eligibility.reason}</p>
                {canDelete && (
                  <p className="text-[11px] text-slate-500 pt-1">
                    • Other services belonging to this client will remain completely untouched.
                    <br />
                    • Client contract totals and active deliverable counts will update automatically.
                  </p>
                )}
              </div>

              {canDelete && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-slate-700 font-medium">
                    To confirm, type <span className="font-bold select-all text-slate-900">"{serviceName}"</span> below:
                  </label>
                  <input
                    type="text"
                    value={matchInput}
                    onChange={(e) => setMatchInput(e.target.value)}
                    placeholder={serviceName}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isBlocked ? "Close" : "Cancel"}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || matchInput.trim().toLowerCase() !== serviceName.trim().toLowerCase()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Delete Service Permanently</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

