"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { CreditCard, X, Loader2, IndianRupee, Calendar, FileText, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { recordPaymentAction, fetchClientInvoicesForAllocationAction } from "@/app/actions/payments";
import { fetchClientsAction } from "@/app/actions/clients";
import { formatINR } from "@/lib/utils";

interface AllocationLine {
  id: string; // temp key
  invoiceId: string;
  amount: number;
}

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

  // Invoices for the selected client
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [allocationLines, setAllocationLines] = useState<AllocationLine[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!defaultClientId && isOpen) {
      fetchClientsAction().then((data) => setClients(data || []));
    }
  }, [defaultClientId, isOpen]);

  // Load client invoices when client changes, clear allocations
  useEffect(() => {
    setAllocationLines([]);
    if (!selectedClientId) {
      setClientInvoices([]);
      return;
    }

    const currentReq = ++reqIdRef.current;
    setIsLoadingInvoices(true);
    fetchClientInvoicesForAllocationAction(selectedClientId)
      .then((invs) => {
        if (currentReq !== reqIdRef.current) return;
        // Exclude paid and cancelled invoices
        const openInvoices = (invs || []).filter(
          (inv) => inv.status !== "Paid" && inv.status !== "Cancelled" && inv.balanceDue > 0
        );
        setClientInvoices(openInvoices);
      })
      .catch((err) => {
        console.error("Error loading client invoices:", err);
      })
      .finally(() => {
        if (currentReq === reqIdRef.current) {
          setIsLoadingInvoices(false);
        }
      });
  }, [selectedClientId]);

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

  // Helper to add invoice line
  const handleAddInvoiceLine = () => {
    // Pick the first available invoice that isn't already selected
    const selectedIds = new Set(allocationLines.map((l) => l.invoiceId));
    const nextAvailable = clientInvoices.find((i) => !selectedIds.has(i.id));
    if (nextAvailable) {
      const remainingPayment = Math.max(
        0,
        (parseFloat(amountValue) || 0) -
          allocationLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
      );
      const suggestedAmount = Math.min(nextAvailable.balanceDue, remainingPayment);

      setAllocationLines((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          invoiceId: nextAvailable.id,
          amount: suggestedAmount > 0 ? suggestedAmount : 0,
        },
      ]);
    }
  };

  const handleUpdateLine = (lineId: string, invoiceId: string, amount: number) => {
    setAllocationLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, invoiceId, amount } : l))
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setAllocationLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const totalAllocating = allocationLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const paymentAmountNum = parseFloat(amountValue) || 0;
  const remainingUnallocated = Math.max(0, paymentAmountNum - totalAllocating);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
              <p className="text-[11px] text-slate-500">Log client collection and allocate to tax invoices</p>
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
        <form action={formAction} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {/* Hidden JSON string of invoice allocations */}
          <input
            type="hidden"
            name="invoice_allocations"
            value={JSON.stringify(
              allocationLines
                .filter((l) => l.invoiceId && l.amount > 0)
                .map((l) => ({ invoiceId: l.invoiceId, amount: l.amount }))
            )}
          />

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                name="amount"
                required
                type="number"
                step="any"
                min="0.01"
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

          {/* NEW SECTION: Invoice Allocation */}
          {selectedClientId && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileText size={13} className="text-[#077EA1]" />
                    <span>Invoice Allocation (Optional)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Apply this receipt towards open client invoices</p>
                </div>
                {clientInvoices.length > 0 && allocationLines.length < clientInvoices.length && (
                  <button
                    type="button"
                    onClick={handleAddInvoiceLine}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-[#077EA1] rounded-md transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>{allocationLines.length === 0 ? "Select Invoice" : "Add Another Invoice"}</span>
                  </button>
                )}
              </div>

              {isLoadingInvoices ? (
                <div className="py-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-[#077EA1]" />
                  <span>Loading open invoices...</span>
                </div>
              ) : clientInvoices.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">
                  No unpaid invoices found for this client. Payment will be stored as general client credit.
                </p>
              ) : allocationLines.length === 0 ? (
                <div className="p-2.5 bg-white border border-dashed border-slate-200 rounded-lg text-center">
                  <p className="text-[11px] text-slate-500">
                    This client has {clientInvoices.length} open invoice(s).
                  </p>
                  <button
                    type="button"
                    onClick={handleAddInvoiceLine}
                    className="mt-1 text-[11px] font-bold text-[#077EA1] hover:underline cursor-pointer"
                  >
                    + Allocate to Invoice Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allocationLines.map((line) => {
                    const selectedInv = clientInvoices.find((i) => i.id === line.invoiceId);
                    return (
                      <div
                        key={line.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={line.invoiceId}
                            onChange={(e) => {
                              const newInvId = e.target.value;
                              const inv = clientInvoices.find((i) => i.id === newInvId);
                              const newAmt = inv ? Math.min(inv.balanceDue, paymentAmountNum) : 0;
                              handleUpdateLine(line.id, newInvId, newAmt);
                            }}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:border-[#077EA1]"
                          >
                            <option value="">Choose Invoice...</option>
                            {clientInvoices.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoiceNumber} (Total: {formatINR(inv.totalAmount)}, Due: {formatINR(inv.balanceDue)})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {selectedInv && (
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                            <div>
                              <span>Issue: {selectedInv.issueDate}</span> • <span>Due: {selectedInv.dueDate}</span>
                            </div>
                            <div className="text-right">
                              <span>Outstanding Balance: </span>
                              <strong className="text-rose-600 font-mono">{formatINR(selectedInv.balanceDue)}</strong>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-slate-600 font-semibold">Allocated Amount (₹):</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={selectedInv?.balanceDue || paymentAmountNum}
                              value={line.amount || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateLine(line.id, line.invoiceId, val);
                              }}
                              placeholder="0.00"
                              className="w-28 px-2 py-1 text-xs border border-slate-200 rounded text-right font-mono font-semibold focus:outline-none focus:border-[#077EA1]"
                            />
                            {selectedInv && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fillAmt = Math.min(selectedInv.balanceDue, paymentAmountNum);
                                  handleUpdateLine(line.id, line.invoiceId, fillAmt);
                                }}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-700 cursor-pointer"
                              >
                                Max
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary Bar */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Total Allocated: <strong className="text-slate-900 font-mono">{formatINR(totalAllocating)}</strong>
                    </span>
                    <span className={`font-semibold ${remainingUnallocated >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      Unallocated: {formatINR(remainingUnallocated)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                <option value="">General Payment (Not allocated to milestone)</option>
                {availableInstallments.map((inst) => {
                  const rem = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.amount_paid) || 0));
                  return (
                    <option key={inst.id} value={inst.id}>
                      {inst.title} — Due: ₹{rem.toLocaleString('en-IN')} (Target: ₹{Number(inst.amount).toLocaleString('en-IN')})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

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
              disabled={isPending || (totalAllocating > paymentAmountNum && paymentAmountNum > 0)}
              className="px-4 py-1.5 font-semibold text-white bg-[#077EA1] hover:bg-[#066B89] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Recording & Allocating...</span>
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
