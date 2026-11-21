"use client";

import { useState } from "react";
import { Plus, X, Loader2, IndianRupee, ShieldAlert, Check } from "lucide-react";
import { createContractAmendmentAction, ContractAmendmentRecord } from "@/app/actions/contract-amendments";
import { formatINR } from "@/lib/utils";

interface ContractAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentContractValue: number;
  onSuccess: (newAmendment: ContractAmendmentRecord) => void;
}

export function ContractAmendmentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentContractValue,
  onSuccess,
}: ContractAmendmentModalProps) {
  const [additionalAmount, setAdditionalAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAdditional = parseFloat(additionalAmount) || 0;
  const revisedContractValue = currentContractValue + numericAdditional;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAdditional <= 0) {
      setError("Please enter a valid positive amendment amount.");
      return;
    }
    if (!reason || reason.trim().length < 5) {
      setError("Please provide a reason for the amendment (at least 5 characters).");
      return;
    }

    setIsPending(true);
    setError(null);

    const res = await createContractAmendmentAction({
      clientId,
      additionalAmount: numericAdditional,
      reason: reason.trim(),
    });

    setIsPending(false);
    if (res.error) {
      setError(res.error);
    } else if (res.success && res.amendment) {
      onSuccess(res.amendment);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Contract Scope Amendment</h3>
              <p className="text-[11px] text-slate-500">{clientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Current vs Revised Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Current Agreed Contract:</span>
              <span className="font-bold text-slate-800 text-xs font-sans font-number">
                {formatINR(currentContractValue)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Revised Total Contract:</span>
              <span className="font-bold text-emerald-600 text-xs font-sans font-number">
                {formatINR(revisedContractValue)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Additional Approved Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={additionalAmount}
              onChange={(e) => setAdditionalAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Scope / Amendment Justification *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the additional deliverables or approved change request..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || numericAdditional <= 0}
              className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <span>Approve Amendment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

