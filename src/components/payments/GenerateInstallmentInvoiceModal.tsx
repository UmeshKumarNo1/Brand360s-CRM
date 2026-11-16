"use client";

import React, { useState } from "react";
import { FileText, X, Loader2, IndianRupee, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { generateInvoiceFromInstallmentAction } from "@/app/actions/installment-invoices";
import { useToast } from "@/components/common/ToastProvider";

interface GenerateInstallmentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoiceId?: string) => void;
  installment: {
    id: string;
    clientId?: string;
    client_id?: string;
    companyName?: string;
    title: string;
    amount: number;
    amountPaid?: number;
    dueDate?: string;
    due_date?: string;
    invoiceId?: string | null;
    invoiceNumber?: string | null;
  } | null;
}

export function GenerateInstallmentInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  installment,
}: GenerateInstallmentInvoiceModalProps) {
  const { success, error: toastError } = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when installment changes
  React.useEffect(() => {
    if (installment) {
      setDescription(`${installment.title || "Scheduled Milestone"} — Contract Payment`);
      setAmount(Number(installment.amount) || 0);
      setTaxRate(18);
      setErrorMsg(null);
    }
  }, [installment, isOpen]);

  if (!isOpen || !installment) return null;

  const baseSubtotal = Math.round((amount / (1 + taxRate / 100)) * 100) / 100;
  const taxAmount = Math.round((amount - baseSubtotal) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installment.id || amount <= 0) {
      setErrorMsg("Please provide a valid billable invoice amount.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await generateInvoiceFromInstallmentAction({
        installmentId: installment.id,
        description,
        amount,
        taxRate,
      });

      if (res.success && res.invoiceId) {
        success("Invoice Generated", `Tax invoice ${res.invoiceNumber} created and linked to this milestone.`);
        onSuccess(res.invoiceId);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to generate invoice.");
        toastError("Invoice Generation Failed", res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Generate Invoice for Milestone</h3>
              <p className="text-[11px] text-slate-500">{installment.companyName || "Client Installment Billing"}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Milestone Details Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Milestone</span>
                <p className="font-extrabold text-slate-800 text-sm">{installment.title}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Expected Value</span>
                <p className="font-extrabold text-[#243E76] font-mono text-sm">{formatINR(Number(installment.amount))}</p>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              <span>Due Date: <strong>{installment.dueDate || installment.due_date || "Immediate"}</strong></span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Invoice Item Description *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Amount (₹) *</label>
              <input
                type="number"
                step="any"
                required
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] font-mono font-bold"
              />
              {amount !== Number(installment.amount) && (
                <p className="text-[10px] text-amber-600 mt-1 font-medium">
                  Note: Differs from milestone expected amount ({formatINR(Number(installment.amount))})
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="18">18% (Standard GST)</option>
                <option value="12">12% GST</option>
                <option value="5">5% GST</option>
                <option value="0">0% (Exempt)</option>
              </select>
            </div>
          </div>

          {/* Tax Calculation Preview */}
          <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl space-y-1 text-slate-600 font-sans">
            <div className="flex justify-between items-center text-[11px]">
              <span>Taxable Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800">{formatINR(baseSubtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>GST ({taxRate}%):</span>
              <span className="font-mono font-semibold text-slate-800">+{formatINR(taxAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-sky-200/60 text-[#243E76]">
              <span>Total Invoice Payable:</span>
              <span className="font-mono">{formatINR(amount)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 font-bold text-white bg-[#077EA1] hover:bg-[#05607C] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <>
                  <FileText size={13} />
                  <span>Generate & Link Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

