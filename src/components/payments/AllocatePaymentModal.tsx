"use client";

import { useEffect, useState, useRef } from "react";
import { X, CheckCircle2, AlertCircle, FileText, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { formatINR } from "@/lib/utils";
import {
  fetchClientInvoicesForAllocationAction,
  allocatePaymentToInvoicesAction,
} from "@/app/actions/payments";
import { useToast } from "@/components/common/ToastProvider";

interface AllocatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payment: {
    id: string;
    clientId: string;
    companyName: string;
    amount: number;
    totalAllocated?: number;
    availableAmount?: number;
    paymentMethod?: string;
    paymentDate?: string;
    transactionRef?: string;
  } | null;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
}

export function AllocatePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  payment,
}: AllocatePaymentModalProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const reqIdRef = useRef(0);

  // Available amount calculation
  const paymentTotal = payment?.amount || 0;
  const alreadyAllocated = payment?.totalAllocated || 0;
  const initialAvailable = Math.max(0, paymentTotal - alreadyAllocated);

  // Load client's unpaid or partially paid invoices
  useEffect(() => {
    if (!isOpen || !payment?.clientId) {
      setInvoices([]);
      setAllocationInputs({});
      setErrorMsg(null);
      return;
    }

    const currentReq = ++reqIdRef.current;
    setIsLoading(true);
    setErrorMsg(null);

    fetchClientInvoicesForAllocationAction(payment.clientId)
      .then((invs) => {
        if (currentReq !== reqIdRef.current) return;
        setInvoices(invs || []);
      })
      .catch((err) => {
        if (currentReq !== reqIdRef.current) return;
        setErrorMsg(err.message || "Failed to retrieve client invoices.");
      })
      .finally(() => {
        if (currentReq === reqIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  // Compute live total being allocated in the form
  const currentTotalAllocating = Object.values(allocationInputs).reduce((sum, val) => {
    const num = parseFloat(val);
    return sum + (isNaN(num) || num < 0 ? 0 : num);
  }, 0);

  const remainingAvailable = Math.max(0, initialAvailable - currentTotalAllocating);

  const handleInputChange = (invoiceId: string, val: string, maxBalance: number) => {
    setErrorMsg(null);
    setAllocationInputs((prev) => ({
      ...prev,
      [invoiceId]: val,
    }));
  };

  const handleAutoFill = (invoiceId: string, maxBalance: number) => {
    setErrorMsg(null);
    // Fill up to minimum of invoice balance and available payment pool
    const otherAllocations = Object.entries(allocationInputs)
      .filter(([id]) => id !== invoiceId)
      .reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);

    const availableForThis = Math.max(0, initialAvailable - otherAllocations);
    const amountToFill = Math.min(maxBalance, availableForThis);

    setAllocationInputs((prev) => ({
      ...prev,
      [invoiceId]: amountToFill > 0 ? String(amountToFill) : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Build payload of allocations > 0
    const allocationsToSubmit: { invoiceId: string; amount: number }[] = [];

    for (const [invId, strVal] of Object.entries(allocationInputs)) {
      const amt = parseFloat(strVal);
      if (!isNaN(amt) && amt > 0) {
        const targetInv = invoices.find((i) => i.id === invId);
        if (targetInv && amt > targetInv.balanceDue + 0.001) {
          setErrorMsg(`Allocation of ₹${amt} exceeds balance for invoice ${targetInv.invoiceNumber}.`);
          return;
        }
        allocationsToSubmit.push({
          invoiceId: invId,
          amount: amt,
        });
      }
    }

    if (allocationsToSubmit.length === 0) {
      setErrorMsg("Please enter an allocation amount for at least one invoice.");
      return;
    }

    if (currentTotalAllocating > initialAvailable + 0.001) {
      setErrorMsg(`Total allocations exceed available payment balance of ₹${initialAvailable.toLocaleString("en-IN")}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await allocatePaymentToInvoicesAction(payment.id, allocationsToSubmit);
      if (res.success) {
        success(
          "Payment Allocated",
          `Allocated ₹${currentTotalAllocating.toLocaleString("en-IN")} across ${allocationsToSubmit.length} invoice(s).`
        );
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to allocate payment.");
        toastError("Allocation Error", res.error || "Failed to allocate payment.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected network or server error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Allocate Payment to Invoices</h3>
            <p className="text-xs text-slate-500">Apply recorded receipts to outstanding client tax invoices</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Payment Summary Metrics Bar */}
        <div className="px-6 py-3 bg-[#243E76]/5 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
            <span className="font-semibold text-slate-900 truncate block">{payment.companyName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payment</span>
            <span className="font-bold text-slate-900">{formatINR(paymentTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Already Allocated</span>
            <span className="font-semibold text-slate-600">{formatINR(alreadyAllocated)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Available to Allocate</span>
            <span className={`font-bold ${remainingAvailable > 0 ? "text-emerald-700" : "text-slate-700"}`}>
              {formatINR(remainingAvailable)}
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoice List & Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Outstanding Invoices ({invoices.filter((i) => i.balanceDue > 0).length})
            </h4>
            <span className="text-[11px] text-slate-500 font-sans">
              Allocating: <strong className="text-[#0481A2] font-sans font-number font-semibold">{formatINR(currentTotalAllocating)}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#077EA1]" />
              <span>Fetching client invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <FileText size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No open invoices found for this client.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generate a tax invoice in the Invoices tab first to allocate this payment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const isPaid = inv.balanceDue <= 0;
                const allocatedForThis = parseFloat(allocationInputs[inv.id] || "0") || 0;

                return (
                  <div
                    key={inv.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      allocatedForThis > 0
                        ? "border-[#077EA1] bg-sky-50/40 shadow-xs"
                        : isPaid
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inv.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : inv.status === "Overdue"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans">
                          <span>Date: {inv.issueDate}</span>
                          <span>Due: {inv.dueDate}</span>
                          <span>Total: <strong className="font-sans font-number">{formatINR(inv.totalAmount)}</strong></span>
                          <span>Paid: <strong className="text-emerald-600 font-sans font-number">{formatINR(inv.amountPaid)}</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Balance Due</span>
                        <span className="text-sm font-bold text-rose-600 font-sans font-number">
                          {formatINR(inv.balanceDue)}
                        </span>
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleAutoFill(inv.id, inv.balanceDue)}
                          className="text-[11px] font-semibold text-[#0481A2] hover:underline cursor-pointer font-sans"
                        >
                          Fill Full Balance
                        </button>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium font-sans">Allocate ₹</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={inv.balanceDue}
                            value={allocationInputs[inv.id] || ""}
                            onChange={(e) => handleInputChange(inv.id, e.target.value, inv.balanceDue)}
                            placeholder="0.00"
                            className="w-28 px-2.5 py-1 text-xs border border-slate-300 rounded-lg text-right font-sans font-number focus:outline-none focus:border-[#0481A2] bg-white font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Allocation Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || currentTotalAllocating <= 0 || currentTotalAllocating > initialAvailable}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving Allocations...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Confirm Allocation ({formatINR(currentTotalAllocating)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

