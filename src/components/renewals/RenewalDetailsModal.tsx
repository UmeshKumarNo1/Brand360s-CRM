"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";
import { fetchRenewalHistoryAction, RenewalHistoryRecord } from "@/app/actions/renewals";
import {
  X,
  RefreshCw,
  Building2,
  Calendar,
  IndianRupee,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface RenewalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  renewal: any | null;
  onCompleteRenewal?: (renewal: any) => void;
  onCancelRenewal?: (renewal: any) => void;
  onGenerateInvoice?: (renewal: any) => void;
  onPreviewInvoice?: (invoiceId: string) => void;
  isAdmin?: boolean;
}

export function RenewalDetailsModal({
  isOpen,
  onClose,
  renewal,
  onCompleteRenewal,
  onCancelRenewal,
  onGenerateInvoice,
  onPreviewInvoice,
  isAdmin = true,
}: RenewalDetailsModalProps) {
  const [history, setHistory] = useState<RenewalHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && renewal?.clientServiceId) {
      setIsLoadingHistory(true);
      fetchRenewalHistoryAction(renewal.clientServiceId)
        .then((data) => setHistory(data || []))
        .catch(() => setHistory([]))
        .finally(() => setIsLoadingHistory(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, renewal]);

  if (!isOpen || !renewal) return null;

  const isPending = renewal.renewalStatus === "Pending" || renewal.status === "Pending";
  const isRenewed = renewal.renewalStatus === "Renewed" || renewal.status === "Renewed";
  const isCancelled = renewal.renewalStatus === "Cancelled" || renewal.status === "Cancelled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0481A2] flex items-center justify-center shadow-2xs">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Service Renewal Details</h3>
              <p className="text-[11px] text-slate-500">
                Complete lifecycle, invoicing, and audit history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Top Client & Service Overview Card */}
          <div className="bg-gradient-to-r from-[#1B3260]/5 to-[#0481A2]/5 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {renewal.clientName || "Client"}
                  </span>
                  <Link
                    href={`/clients/${renewal.clientId}`}
                    className="text-[#0481A2] hover:underline inline-flex items-center gap-0.5 text-[11px]"
                    title="View client profile"
                  >
                    <span>View Profile</span>
                    <ExternalLink size={10} />
                  </Link>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Code: {renewal.clientCode || "B360-000"} | {renewal.serviceName} ({renewal.serviceCategory || "General"})
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isRenewed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isCancelled
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {renewal.renewalStatus || renewal.status || "Pending"}
                </span>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    renewal.paymentStatus === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : renewal.paymentStatus === "Partially Paid"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  Payment: {renewal.paymentStatus || "Unpaid"}
                </span>
              </div>
            </div>
          </div>

          {/* Grid of Key Properties */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Previous Expiry
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {renewal.previousExpiryDate || renewal.currentExpiryDate || "-"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Renewal Start
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {renewal.renewalStartDate || renewal.currentExpiryDate || "-"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Renewal End / Target
              </span>
              <span className="font-semibold text-[#1B3260] text-xs">
                {renewal.renewalEndDate || renewal.renewalDate || "-"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Renewal Fee
              </span>
              <span className="font-bold text-slate-900 text-sm font-number">
                {formatINR(renewal.renewalAmount || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Salesperson
              </span>
              <span className="font-semibold text-slate-700 text-xs">
                {renewal.salesperson || "Unassigned"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Tax Invoice
              </span>
              {renewal.invoiceId ? (
                <button
                  type="button"
                  onClick={() => onPreviewInvoice && onPreviewInvoice(renewal.invoiceId)}
                  className="font-mono text-xs text-[#0481A2] hover:underline font-bold text-left block"
                >
                  {renewal.invoiceNumber || "View Invoice"}
                </button>
              ) : (
                <span className="text-slate-400 text-xs">Not generated</span>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {renewal.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Renewal Notes
              </span>
              <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                {renewal.notes}
              </p>
            </div>
          )}

          {/* Renewal Lifecycle Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              Available Workflow Actions:
            </span>

            <div className="flex items-center gap-2">
              {/* Generate Invoice if not yet created */}
              {!renewal.invoiceId && onGenerateInvoice && (
                <button
                  type="button"
                  onClick={() => onGenerateInvoice(renewal)}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-[#0481A2] hover:bg-sky-100 font-semibold border border-[#0481A2]/30 cursor-pointer transition-colors"
                >
                  Generate Invoice
                </button>
              )}

              {/* Complete Renewal */}
              {isPending && onCompleteRenewal && (
                <button
                  type="button"
                  onClick={() => onCompleteRenewal(renewal)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  Complete Renewal
                </button>
              )}

              {/* Cancel Renewal */}
              {isPending && onCancelRenewal && (
                <button
                  type="button"
                  onClick={() => onCancelRenewal(renewal)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Previous History Cycles for this Client Service */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <History size={14} className="text-[#0481A2]" />
                <span>Renewal Audit Log & Past Cycles</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {history.length} recorded cycle(s)
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="py-4 text-center text-slate-400">
                <RefreshCw size={14} className="animate-spin mx-auto text-[#0481A2]" />
                <span className="text-[11px] mt-1 block">Loading history ledger...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-3 text-center bg-slate-50 rounded-xl text-slate-400 text-[11px]">
                No previous renewal history cycles logged yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {h.renewalStartDate} &rarr; {h.renewalEndDate}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Logged on: {new Date(h.createdAt).toLocaleDateString("en-IN")} by {h.createdByName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 font-number">
                        {formatINR(h.renewalAmount)}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          h.renewalStatus === "Renewed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {h.renewalStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

