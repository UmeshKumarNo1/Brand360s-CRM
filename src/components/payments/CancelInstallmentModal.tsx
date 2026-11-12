"use client";

import React, { useState } from "react";
import { AlertCircle, X, Loader2, Ban } from "lucide-react";
import { cancelInstallmentAction } from "@/app/actions/payments";
import { useToast } from "@/components/common/ToastProvider";

interface CancelInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installment: any;
}

export function CancelInstallmentModal({
  isOpen,
  onClose,
  onSuccess,
  installment,
}: CancelInstallmentModalProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  if (!isOpen || !installment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setErrorMessage("Please enter a reason for cancelling this installment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await cancelInstallmentAction(installment.id, installment.clientId, cancelReason.trim());
      if (res?.error) {
        setErrorMessage(res.error);
        toastError(res.error);
      } else {
        success("Installment milestone cancelled successfully.");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel installment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <Ban size={18} />
            <h3 className="font-bold text-sm">Cancel Installment Milestone</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-semibold text-slate-900">{installment.title}</div>
            <div className="text-slate-500">
              Client: <strong>{installment.companyName}</strong>
            </div>
            <div className="text-slate-500">
              Due Date: <strong>{installment.dueDate}</strong>
            </div>
          </div>

          <p className="text-slate-500">
            Cancelling this installment will mark its status as <strong>Cancelled</strong> and exclude it from active balance collection.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Scope revised with client, merged with Milestone 2, waived per contract addendum..."
              rows={3}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

