"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { CreditCard, X, Loader2, IndianRupee, Calendar, FileText, Plus, Trash2, CheckCircle2, Sparkles, AlertCircle, ShieldAlert } from "lucide-react";
import { recordPaymentAction, fetchClientInvoicesForAllocationAction } from "@/app/actions/payments";
import { fetchClientsAction, fetchClientContractSummaryAction } from "@/app/actions/clients";
import { autoGenerateInvoiceForClientAction } from "@/app/actions/invoices";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";

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
  const handledStateRef = useRef<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(defaultInstallmentId || "");
  const [amountValue, setAmountValue] = useState<string>(defaultAmount ? String(defaultAmount) : "");
  const isUserEditedAmountRef = useRef<boolean>(false);
  const prevClientIdRef = useRef<string>(defaultClientId || "");

  // Contract limit commercial summary state
  const [contractSummary, setContractSummary] = useState<{
    contractValue: number;
    totalInvoiced: number;
    previouslyReceived: number;
    remainingContractBalance: number;
    remainingInvoiceBalance: number;
    maximumPermittedPayment: number;
  } | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  // Invoices for the selected client
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [allocationLines, setAllocationLines] = useState<AllocationLine[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const reqIdRef = useRef(0);
  const { success } = useToast();

  // Load client contract summary for live validation
  useEffect(() => {
    if (!selectedClientId) {
      setContractSummary(null);
      return;
    }

    setIsLoadingContract(true);
    fetchClientContractSummaryAction(selectedClientId)
      .then((summary) => {
        setContractSummary(summary);
        if (summary) {
          const eligibleBal = summary.maximumPermittedPayment ?? summary.remainingInvoiceBalance ?? 0;
          // Auto-fill amount if not manually edited by user, or if client changed
          if (!isUserEditedAmountRef.current && allocationLines.length === 0) {
            setAmountValue(eligibleBal > 0 ? String(eligibleBal) : "0");
          }
        }
      })
      .catch((err) => {
        console.error("Error loading client contract summary:", err);
      })
      .finally(() => {
        setIsLoadingContract(false);
      });
  }, [selectedClientId, isOpen]);

  const loadClientInvoices = (cId: string) => {
    if (!cId) {
      setClientInvoices([]);
      return;
    }

    const currentReq = ++reqIdRef.current;
    setIsLoadingInvoices(true);
    fetchClientInvoicesForAllocationAction(cId)
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
  };

  useEffect(() => {
    if (!defaultClientId && isOpen) {
      fetchClientsAction().then((data) => setClients(data || []));
    }
  }, [defaultClientId, isOpen]);

  // Load client invoices when client changes, clear allocations, and reset manual flag on genuine client switch
  useEffect(() => {
    if (prevClientIdRef.current !== selectedClientId) {
      prevClientIdRef.current = selectedClientId;
      isUserEditedAmountRef.current = false;
      setAllocationLines([]);
    }
    loadClientInvoices(selectedClientId);
  }, [selectedClientId]);

  const handleQuickGenerateInvoice = async () => {
    if (!selectedClientId) return;
    setIsGeneratingInvoice(true);

    try {
      const amt = parseFloat(amountValue);
      const res = await autoGenerateInvoiceForClientAction(selectedClientId, {
        amount: amt > 0 ? amt : undefined,
        description: `Professional Services - ${defaultClientName || "Client"}`,
      });

      if (res.success) {
        success("Invoice Created", "Official tax invoice generated. You can now allocate this payment.");
        loadClientInvoices(selectedClientId);
      }
    } catch (err: any) {
      console.error("Quick invoice generation error:", err);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  useEffect(() => {
    if (defaultClientId) setSelectedClientId(defaultClientId);
    if (defaultInstallmentId) setSelectedInstallmentId(defaultInstallmentId);
    if (defaultAmount) setAmountValue(String(defaultAmount));
  }, [defaultClientId, defaultInstallmentId, defaultAmount, isOpen]);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
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
          amount: suggestedAmount > 0 ? suggestedAmount : (nextAvailable.balanceDue > 0 ? nextAvailable.balanceDue : 0),
        },
      ]);

      // If user hasn't manually edited the overall amount, auto-populate Amount with invoice's balance
      if (!isUserEditedAmountRef.current && contractSummary) {
        const clientMax = contractSummary.maximumPermittedPayment ?? contractSummary.remainingInvoiceBalance ?? 0;
        const targetAmt = Math.min(nextAvailable.balanceDue, clientMax);
        if (targetAmt > 0) {
          setAmountValue(String(targetAmt));
        }
      }
    }
  };

  const handleUpdateLine = (lineId: string, invoiceId: string, amount: number) => {
    setAllocationLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, invoiceId, amount } : l))
    );
  };

  const handleInvoiceSelectionChange = (lineId: string, newInvId: string) => {
    const inv = clientInvoices.find((i) => i.id === newInvId);
    let newAmt = 0;
    if (inv) {
      if (!isUserEditedAmountRef.current && contractSummary) {
        // Auto-populate Amount with the selected invoice's remaining balance, capped by client's overall max
        const clientMax = contractSummary.maximumPermittedPayment ?? contractSummary.remainingInvoiceBalance ?? 0;
        const targetAmt = Math.min(inv.balanceDue, clientMax);
        setAmountValue(targetAmt > 0 ? String(targetAmt) : "0");
        newAmt = targetAmt;
      } else {
        newAmt = Math.min(inv.balanceDue, paymentAmountNum);
      }
    }
    handleUpdateLine(lineId, newInvId, newAmt);
  };

  const handleRemoveLine = (lineId: string) => {
    setAllocationLines((prev) => {
      const remaining = prev.filter((l) => l.id !== lineId);
      // If user removed the invoice line and hadn't manually edited the payment amount,
      // revert amount back to the overall remaining client invoice balance
      if (remaining.length === 0 && !isUserEditedAmountRef.current && contractSummary) {
        const eligibleBal = contractSummary.maximumPermittedPayment ?? contractSummary.remainingInvoiceBalance ?? 0;
        setAmountValue(eligibleBal > 0 ? String(eligibleBal) : "0");
      }
      return remaining;
    });
  };

  const totalAllocating = allocationLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const paymentAmountNum = parseFloat(amountValue) || 0;
  const remainingUnallocated = Math.max(0, paymentAmountNum - totalAllocating);

  // Contract limit live calculation
  const maxPermitted = contractSummary ? contractSummary.maximumPermittedPayment : Infinity;
  const isExceedingContract =
    contractSummary !== null &&
    paymentAmountNum > 0 &&
    paymentAmountNum > maxPermitted + 0.009;

  // Validation: Check if any allocation line exceeds its invoice balance
  const exceedingLine = allocationLines.find((l) => {
    if (!l.invoiceId || !l.amount) return false;
    const inv = clientInvoices.find((i) => i.id === l.invoiceId);
    return inv && l.amount > inv.balanceDue + 0.009;
  });

  const isFormBlocked =
    isPending ||
    paymentAmountNum <= 0 ||
    isExceedingContract ||
    !!exceedingLine ||
    (contractSummary !== null && maxPermitted <= 0) ||
    (totalAllocating > paymentAmountNum && paymentAmountNum > 0);

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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
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

          {/* Client Contract Financial Summary Bar */}
          {selectedClientId && (
            <div className="p-3 bg-gradient-to-r from-slate-50 to-sky-50/60 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Client Contract Status</span>
                {isLoadingContract && <Loader2 size={11} className="animate-spin text-[#077EA1]" />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Contract Value</span>
                  <span className="font-bold text-slate-800 text-xs font-sans font-number">
                    {contractSummary ? formatINR(contractSummary.contractValue) : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Total Invoiced</span>
                  <span className="font-bold text-indigo-700 text-xs font-sans font-number">
                    {contractSummary ? formatINR(contractSummary.totalInvoiced) : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Previously Received</span>
                  <span className="font-bold text-emerald-700 text-xs font-sans font-number">
                    {contractSummary ? formatINR(contractSummary.previouslyReceived) : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Remaining Invoice</span>
                  <span className="font-bold text-blue-700 text-xs font-sans font-number">
                    {contractSummary ? formatINR(contractSummary.remainingInvoiceBalance) : "—"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Max Permitted</span>
                  <span className={`font-bold text-xs font-sans font-number ${
                    contractSummary && contractSummary.maximumPermittedPayment > 0 ? "text-slate-900" : "text-rose-600"
                  }`}>
                    {contractSummary ? formatINR(contractSummary.maximumPermittedPayment) : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Amount and Payment Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Amount (₹) *</label>
                {contractSummary && (
                  <span className="text-[10px] text-slate-500">
                    Max: <strong className="text-slate-800 font-sans font-number">{formatINR(contractSummary.maximumPermittedPayment)}</strong>
                  </span>
                )}
              </div>
              <input
                name="amount"
                required
                type="number"
                step="any"
                min="0.01"
                max={contractSummary ? contractSummary.maximumPermittedPayment : undefined}
                value={amountValue}
                onChange={(e) => {
                  isUserEditedAmountRef.current = true;
                  setAmountValue(e.target.value);
                }}
                placeholder="25000"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition-colors ${
                  isExceedingContract
                    ? "border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-600 ring-1 ring-rose-300"
                    : "border-slate-200 focus:border-[#0481A2]"
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                name="payment_date"
                required
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Invoice Overpayment Inline Warning Banner */}
          {isExceedingContract && contractSummary && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <ShieldAlert size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Payment Over-Limit Prevented</p>
                <p className="mt-0.5 leading-relaxed">
                  Payment amount (₹{paymentAmountNum.toLocaleString("en-IN")}) exceeds the remaining outstanding invoice balance (₹{contractSummary.remainingInvoiceBalance.toLocaleString("en-IN")}).
                  Maximum permitted payment is <strong>₹{contractSummary.maximumPermittedPayment.toLocaleString("en-IN")}</strong>.
                  Please generate an invoice for any additional contract scope before recording this payment.
                </p>
              </div>
            </div>
          )}

          {/* Allocation Exceeding Invoice Balance Warning Banner */}
          {exceedingLine && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <ShieldAlert size={18} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Invoice Allocation Exceeds Remaining Balance</p>
                <p className="mt-0.5 leading-relaxed">
                  The allocated amount (₹{(Number(exceedingLine.amount) || 0).toLocaleString("en-IN")}) exceeds the remaining invoice balance (₹{
                    (clientInvoices.find((i) => i.id === exceedingLine.invoiceId)?.balanceDue || 0).toLocaleString("en-IN")
                  }). Please adjust the allocated amount to be within the invoice balance.
                </p>
              </div>
            </div>
          )}

          {/* Zero Invoice Balance Block Banner */}
          {contractSummary && contractSummary.maximumPermittedPayment <= 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">All Issued Invoices Fully Paid</p>
                <p className="mt-0.5 leading-relaxed">
                  This client has no open or outstanding invoice balance. Total invoiced amount of ₹{contractSummary.totalInvoiced.toLocaleString("en-IN")} has been fully received.
                  To record additional payments, please generate an invoice for the service deliverable first.
                </p>
              </div>
            </div>
          )}

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
                <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-lg text-center space-y-2">
                  <p className="text-[11px] text-slate-600">
                    No open invoices found for this client. You can generate an invoice now to allocate immediately.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickGenerateInvoice}
                    disabled={isGeneratingInvoice}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0481A2] hover:bg-[#036c88] text-white text-[11px] font-semibold rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingInvoice ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        <span>Generate Invoice Now</span>
                      </>
                    )}
                  </button>
                </div>
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
                            onChange={(e) => handleInvoiceSelectionChange(line.id, e.target.value)}
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
                              <strong className="text-rose-600 font-sans font-number font-semibold">{formatINR(selectedInv.balanceDue)}</strong>
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
                              className="w-28 px-2 py-1 text-xs border border-slate-200 rounded text-right font-sans font-number font-semibold focus:outline-none focus:border-[#0481A2]"
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
                    <span className="text-slate-500 font-sans">
                      Total Allocated: <strong className="text-slate-900 font-sans font-number font-semibold">{formatINR(totalAllocating)}</strong>
                    </span>
                    <span className={`font-semibold font-sans font-number ${remainingUnallocated >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] font-mono text-xs uppercase"
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
              disabled={isFormBlocked}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
