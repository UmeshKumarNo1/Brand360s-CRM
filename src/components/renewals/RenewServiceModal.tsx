"use client";

import { useState } from "react";
import { RenewalItem, processServiceRenewalAction } from "@/app/actions/renewals";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";
import { X, RefreshCw, Loader2, Calendar, FileText } from "lucide-react";

interface RenewServiceModalProps {
  renewal: RenewalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenewServiceModal({
  renewal,
  isOpen,
  onClose,
  onSuccess,
}: RenewServiceModalProps) {
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default next renewal date to 1 year ahead
  const defaultNextDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };

  const [newRenewalDate, setNewRenewalDate] = useState(defaultNextDate());
  const [renewalAmount, setRenewalAmount] = useState<number>(renewal?.renewalAmount || 0);
  const [notes, setNotes] = useState("");
  const [createInvoice, setCreateInvoice] = useState(true);
  const [createFollowup, setCreateFollowup] = useState(false);

  if (!isOpen || !renewal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await processServiceRenewalAction(
        renewal.id,
        newRenewalDate,
        Number(renewalAmount) || 0,
        createInvoice,
        notes,
        createFollowup
      );

      if (res.success) {
        success("Service Renewed", `${renewal.serviceName} renewed for ${renewal.clientName}.`);
        onSuccess();
        onClose();
      } else {
        toastError("Renewal Failed", res.error || "Could not process renewal.");
      }
    } catch {
      toastError("Renewal Failed", "Network connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#243E76] text-white">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-[#0481A2]" />
            <h2 className="text-sm font-bold">Renew Client Service</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Service & Client summary */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <div className="font-semibold text-slate-900 text-sm">{renewal.clientName}</div>
            <div className="text-slate-500">Service: <span className="font-medium text-slate-700">{renewal.serviceName}</span></div>
            <div className="text-slate-500">Current Expiry: <span className="font-medium text-slate-700">{renewal.currentExpiryDate}</span></div>
          </div>

          {/* New Renewal Expiry Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              New Expiry / Renewal Date *
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                required
                value={newRenewalDate}
                onChange={(e) => setNewRenewalDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              The service cycle will be extended until this date.
            </span>
          </div>

          {/* Renewal Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewal Fee (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={renewalAmount}
              onChange={(e) => setRenewalAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Renewal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Renewed for another annual term..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-1">
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="createInvoice"
                checked={createInvoice}
                onChange={(e) => setCreateInvoice(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0481A2] focus:ring-[#0481A2]"
              />
              <label htmlFor="createInvoice" className="text-slate-700 cursor-pointer">
                <span className="font-semibold block text-[11px] text-[#1B3260]">
                  Automatically generate renewal invoice
                </span>
                <span className="text-[10px] text-slate-500">
                  Creates an Unpaid invoice for this client to track collection and receivables.
                </span>
              </label>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="createFollowup"
                checked={createFollowup}
                onChange={(e) => setCreateFollowup(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0481A2] focus:ring-[#0481A2]"
              />
              <label htmlFor="createFollowup" className="text-slate-700 cursor-pointer">
                <span className="font-semibold block text-[11px] text-[#1B3260]">
                  Schedule Renewal Follow-up Reminder
                </span>
                <span className="text-[10px] text-slate-500">
                  Creates a follow-up task on the renewal due date for the assigned salesperson.
                </span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>Confirm Renewal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
