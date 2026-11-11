"use client";

import { useActionState, useEffect, useState } from "react";
import { CreditCard, X, Loader2, IndianRupee, Calendar } from "lucide-react";
import { recordPaymentAction } from "@/app/actions/payments";
import { fetchClientsAction } from "@/app/actions/clients";
import { formatINR } from "@/lib/utils";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultInstallmentId?: string;
  defaultAmount?: number;
  availableInstallments?: Array<{
    id: string;
    title: string;
    amount: number;
    amount_paid: number;
    remaining?: number;
    due_date: string;
    status: string;
  }>;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClientId,
  defaultClientName,
  defaultInstallmentId,
  defaultAmount,
  availableInstallments = [],
}: RecordPaymentModalProps) {
  const [state, formAction, isPending] = useActionState(recordPaymentAction, null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(defaultInstallmentId || "");
  const [amountValue, setAmountValue] = useState<string>(defaultAmount ? String(defaultAmount) : "");

  useEffect(() => {
    if (!defaultClientId && isOpen) {
      fetchClientsAction().then((data) => setClients(data || []));
    }
  }, [defaultClientId, isOpen]);

  useEffect(() => {
    if (defaultClientId) setSelectedClientId(defaultClientId);
    if (defaultInstallmentId) setSelectedInstallmentId(defaultInstallmentId);
    if (defaultAmount) setAmountValue(String(defaultAmount));
  }, [defaultClientId, defaultInstallmentId, defaultAmount, isOpen]);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onClose();
    }
  }, [state, onSuccess, onClose]);

  // Handle installment selection auto-filling amount if remaining > 0
  const handleInstallmentChange = (instId: string) => {
    setSelectedInstallmentId(instId);
    if (instId) {
      const match = availableInstallments.find((i) => i.id === instId);
      if (match) {
        const rem = Math.max(0, (Number(match.amount) || 0) - (Number(match.amount_paid) || 0));
        if (rem > 0 && !amountValue) {
          setAmountValue(String(rem));
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
              <p className="text-[11px] text-slate-500">Log client collection and update balance</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client *</label>
            {defaultClientId ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between">
                <span>{defaultClientName || "Selected Client"}</span>
                <input type="hidden" name="client_id" value={defaultClientId} />
              </div>
            ) : (
              <select
                name="client_id"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="">Select Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Installment Milestone Linkage */}
          {availableInstallments.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Allocate to Installment Milestone (Optional)
              </label>
              <select
                name="installment_id"
                value={selectedInstallmentId}
                onChange={(e) => handleInstallmentChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="">General Payment (Not allocated to specific milestone)</option>
                {availableInstallments.map((inst) => {
                  const rem = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.amount_paid) || 0));
                  return (
                    <option key={inst.id} value={inst.id}>
                      {inst.title} — Due: ₹{rem.toLocaleString('en-IN')} (Target: ₹{Number(inst.amount).toLocaleString('en-IN')})
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Allocating this payment will credit the installment's paid amount and update its milestone status.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                name="amount"
                required
                type="number"
                step="any"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                name="payment_date"
                required
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                name="payment_method"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
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
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                name="status"
                defaultValue="Verified"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="Verified">Verified (Confirmed)</option>
                <option value="Pending Verification">Pending Verification</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / UTR / Cheque No.</label>
            <input
              name="transaction_ref"
              type="text"
              placeholder="e.g. UTR198273642"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono text-xs uppercase"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. 1st installment for Pvt Ltd registration & GST..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 font-semibold text-white bg-[#077EA1] hover:bg-[#066B89] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm & Record</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
