"use client";

import React, { useState } from "react";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { completeFollowupAction } from "@/app/actions/followups";
import { useToast } from "@/components/common/ToastProvider";

interface CompleteFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  followup: {
    id: string;
    title: string;
    companyName?: string;
  };
}

export function CompleteFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  followup,
}: CompleteFollowupModalProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await completeFollowupAction(followup.id, notes);
      if (res.success) {
        success("Follow-up Completed", `"${followup.title}" has been moved to completed history.`);
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to complete follow-up.");
      }
    } catch (err: any) {
      setError(err?.message || "Server error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-start gap-3 border-b border-slate-100 bg-emerald-50/50">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Complete Follow-up Task</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {followup.companyName ? `${followup.companyName} • ` : ""}{followup.title}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Resolution / Completion Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Client confirmed transfer of ₹50,000 via NEFT. UTR shared."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              These notes will be archived in the client's permanent communications ledger.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Completing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Mark Completed</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

