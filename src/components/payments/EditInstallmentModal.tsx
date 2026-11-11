"use client";

import { useActionState, useEffect, useState } from "react";
import { Edit2, X, Loader2, IndianRupee, Calendar } from "lucide-react";
import { updateInstallmentAction, fetchClientInvoicesForAllocationAction } from "@/app/actions/payments";

interface EditInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installment: {
    id: string;
    clientId?: string;
    client_id?: string;
    invoiceId?: string | null;
    invoice_id?: string | null;
    title: string;
    amount: number;
    amount_paid?: number;
    due_date?: string;
    dueDate?: string;
    notes?: string | null;
  } | null;
}

export function EditInstallmentModal({
  isOpen,
  onClose,
  onSuccess,
  installment,
}: EditInstallmentModalProps) {
  const [state, formAction, isPending] = useActionState(updateInstallmentAction, null);
  const [invoices, setInvoices] = useState<any[]>([]);

  const clientId = installment?.clientId || installment?.client_id || "";
  const dueDate = installment?.dueDate || installment?.due_date || "";
  const defaultInvoiceId = installment?.invoiceId || installment?.invoice_id || "";

  useEffect(() => {
    if (clientId && isOpen) {
      fetchClientInvoicesForAllocationAction(clientId).then((invs) => setInvoices(invs || []));
    }
  }, [clientId, isOpen]);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onClose();
    }
  }, [state, onSuccess, onClose]);

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Edit2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Installment Milestone</h3>
              <p className="text-[11px] text-slate-500">Update installment terms and due dates</p>
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
          <input type="hidden" name="installment_id" value={installment.id} />
          <input type="hidden" name="client_id" value={clientId} />

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Installment Title *</label>
            <input
              name="title"
              required
              type="text"
              defaultValue={installment.title}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Link to Tax Invoice <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              name="invoice_id"
              defaultValue={defaultInvoiceId}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Installment Amount (₹) *</label>
              <input
                name="amount"
                required
                type="number"
                step="any"
                defaultValue={installment.amount}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                name="due_date"
                required
                type="date"
                defaultValue={dueDate}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Milestone Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={installment.notes || ""}
              placeholder="Milestone notes..."
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
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Installment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

