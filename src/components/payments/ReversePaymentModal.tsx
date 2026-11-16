"use client";

import { useState } from "react";
import { X, RotateCcw, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { reversePaymentAction } from "@/app/actions/payments";
import { useToast } from "@/components/common/ToastProvider";

interface ReversePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment: {
    id: string;
    clientId: string;
    companyName: string;
    clientCode?: string;
    amount: number;
    totalAllocated: number;
    availableAmount: number;
    allocationStatus: string;
    paymentDate: string;
    paymentMethod: string;
    transactionRef?: string;
    status: string;
    allocations?: any[];
  } | null;
}

export function ReversePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  payment,
}: ReversePaymentModalProps) {
  const { success, error: toastError } = useToast();

  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const allocations = payment.allocations || [];
  const totalAllocated = payment.totalAllocated || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage("A detailed reversal reason is mandatory.");
      return;
    }

    if (!confirmed) {
      setErrorMessage("Please confirm that you understand the financial impact of this reversal.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reversePaymentAction({
        paymentId: payment.id,
        reason: reason.trim(),
      });

      if (res.success) {
        success("Payment Reversed", `Transaction of ${formatINR(payment.amount)} has been voided/reversed.`);
        onSuccess();
        onClose();
      } else {
        const errMsg = res.error || "Failed to reverse payment transaction.";
        setErrorMessage(errMsg);
        toastError("Reversal Failed", errMsg);
      }
    } catch {
      setErrorMessage("Server error during reversal. Please retry.");
      toastError("Error", "Could not complete reversal request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with warning styling */}
        <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <RotateCcw size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Reverse Payment Transaction</h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Void transaction & restore invoice balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>Financial Reversal Notice</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              This action will mark payment <strong>{formatINR(payment.amount)}</strong> as <span className="font-semibold text-rose-700">Reversed</span>. All invoice allocations will be rolled back and corresponding invoice balances will increase. The transaction record is permanently preserved in the audit log.
            </p>
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Client:</span>
              <span className="font-bold text-slate-800">{payment.companyName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Payment Amount:</span>
              <span className="font-extrabold text-slate-900 font-number">{formatINR(payment.amount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Payment Date:</span>
              <span className="font-medium text-slate-700">{payment.paymentDate}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Method / UTR:</span>
              <span className="font-mono text-slate-700">{payment.paymentMethod} • {payment.transactionRef || "-"}</span>
            </div>
          </div>

          {/* Associated Invoices Preview */}
          {allocations.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Invoices Affected by this Reversal ({allocations.length}):
              </label>
              <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-white">
                {allocations.map((alloc: any) => {
                  const invNum = alloc.invoice?.invoice_number || alloc.invoice_number || "Invoice";
                  const amt = Number(alloc.allocated_amount) || 0;
                  return (
                    <div key={alloc.id} className="py-1.5 px-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <FileText size={13} className="text-[#0481A2]" />
                        <span className="font-bold">{invNum}</span>
                      </div>
                      <span className="font-semibold text-rose-600 font-number">
                        Revert {formatINR(amt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reversal Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reversal Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State why this payment is being reversed (e.g. cheque bounce, duplicate entry, client request)..."
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-snug">
                I confirm that I want to reverse this transaction of <strong>{formatINR(payment.amount)}</strong>.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmed || !reason.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Reversing..." : "Confirm Reversal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

