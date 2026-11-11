"use client";

import { useActionState, useEffect, useState } from "react";
import { Calendar, X, Loader2, IndianRupee } from "lucide-react";
import { createInstallmentAction, fetchClientInvoicesForAllocationAction } from "@/app/actions/payments";
import { fetchClientsAction } from "@/app/actions/clients";

interface CreateInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  clientName?: string;
}

export function CreateInstallmentModal({
  isOpen,
  onClose,
  onSuccess,
  clientId: initialClientId,
  clientName,
}: CreateInstallmentModalProps) {
  const [state, formAction, isPending] = useActionState(createInstallmentAction, null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || "");
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  useEffect(() => {
    if (!initialClientId && isOpen) {
      fetchClientsAction().then((data) => setClients(data || []));
    }
  }, [initialClientId, isOpen]);

  useEffect(() => {
    if (selectedClientId && isOpen) {
      fetchClientInvoicesForAllocationAction(selectedClientId).then((invs) => setInvoices(invs || []));
    } else {
      setInvoices([]);
    }
  }, [selectedClientId, isOpen]);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onClose();
    }
  }, [state, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Installment Schedule</h3>
              <p className="text-[11px] text-slate-500">{clientName || "Define payment milestone"}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          {initialClientId ? (
            <input type="hidden" name="client_id" value={initialClientId} />
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client *</label>
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
            </div>
          )}

          {/* Optional Linked Invoice */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Link to Tax Invoice <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              name="invoice_id"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
            >
              <option value="">No linked invoice (General contract milestone)</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — Balance ₹{inv.balanceDue} ({inv.status})
                </option>
              ))}
            </select>
          </div>

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Installment / Milestone Title *</label>
            <input
              name="title"
              required
              type="text"
              placeholder="e.g. 1st Milestone — Advance / Setup"
              defaultValue="Installment Milestone"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Installment Amount (₹) *</label>
              <input
                name="amount"
                required
                type="number"
                step="any"
                placeholder="30000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                name="due_date"
                required
                type="date"
                defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Milestone Notes / Deliverables</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Due upon filing of incorporation documents or website wireframe approval..."
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
                  <span>Adding Schedule...</span>
                </>
              ) : (
                <span>Save Installment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
