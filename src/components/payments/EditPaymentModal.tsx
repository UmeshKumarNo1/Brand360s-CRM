"use client";

import { useState } from "react";
import { X, Calendar, AlertCircle, Edit3, ShieldAlert } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { editPaymentAction } from "@/app/actions/payments";
import { useToast } from "@/components/common/ToastProvider";

interface EditPaymentModalProps {
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
    notes?: string;
    status: string;
  } | null;
}

export function EditPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  payment,
}: EditPaymentModalProps) {
  const { success, error: toastError } = useToast();

  const [amount, setAmount] = useState<string>(payment ? payment.amount.toString() : "");
  const [paymentDate, setPaymentDate] = useState<string>(payment ? payment.paymentDate : "");
  const [paymentMethod, setPaymentMethod] = useState<string>(
    payment ? payment.paymentMethod : "Bank Transfer / NEFT"
  );
  const [transactionRef, setTransactionRef] = useState<string>(
    payment?.transactionRef && payment.transactionRef !== "-" ? payment.transactionRef : ""
  );
  const [notes, setNotes] = useState<string>(payment?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const totalAllocated = payment.totalAllocated || 0;
  const isAllocated = totalAllocated > 0;
  const minAllowedAmount = totalAllocated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError("Payment amount must be greater than zero.");
      return;
    }

    if (numAmount < minAllowedAmount - 0.001) {
      setValidationError(
        `Amount cannot be reduced below the already allocated amount of ${formatINR(minAllowedAmount)}.`
      );
      return;
    }

    if (!paymentDate) {
      setValidationError("Payment date is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await editPaymentAction({
        paymentId: payment.id,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        success("Payment Updated", "The payment record has been successfully updated.");
        onSuccess();
        onClose();
      } else {
        const errMsg = res.error || "Failed to update payment record.";
        setValidationError(errMsg);
        toastError("Update Failed", errMsg);
      }
    } catch {
      setValidationError("An unexpected error occurred while saving the payment.");
      toastError("Update Error", "Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#243E76] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Edit3 size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Edit Payment</h3>
              <p className="text-xs text-slate-200 mt-0.5">
                Update transaction details & amount
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

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Validation Notice */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Allocation Warning / Info Badge */}
          {isAllocated ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Partially Allocated Transaction</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  This payment has <strong className="font-bold">{formatINR(totalAllocated)}</strong> already allocated to invoices. The total amount cannot be reduced below this threshold.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center justify-between">
              <span className="font-medium">Allocation Status:</span>
              <span className="font-bold px-2 py-0.5 rounded-full bg-white text-sky-700 text-[11px] border border-sky-100">
                Unallocated
              </span>
            </div>
          )}

          {/* Client (Read-only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Client Name
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={payment.companyName + (payment.clientCode ? ` (${payment.clientCode})` : "")}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs sm:text-sm font-medium cursor-not-allowed"
            />
          </div>

          {/* Payment Amount & Payment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  min={minAllowedAmount > 0 ? minAllowedAmount : 1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0481A2]/20 focus:border-[#0481A2]"
                />
              </div>
              {minAllowedAmount > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Min allowed: {formatINR(minAllowedAmount)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0481A2]/20 focus:border-[#0481A2]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method & Reference / UTR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0481A2]/20 focus:border-[#0481A2]"
              >
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / UTR
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR12345678"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0481A2]/20 focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add optional payment or adjustment notes..."
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0481A2]/20 focus:border-[#0481A2]"
            />
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

