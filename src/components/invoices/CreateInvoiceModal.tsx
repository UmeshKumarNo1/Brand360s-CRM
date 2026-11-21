"use client";

import { useActionState, useEffect, useState, useRef, useMemo } from "react";
import { FileText, X, Loader2, IndianRupee, Calendar, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { createInvoiceAction } from "@/app/actions/invoices";
import { fetchClientsAction } from "@/app/actions/clients";
import { checkInvoiceOverbillingAction, OverbillingValidationResult } from "@/app/actions/invoice-validation";
import {
  fetchClientEligibleServicesForInvoiceAction,
  EligibleServiceForInvoice,
} from "@/app/actions/client-eligible-services";
import { formatINR } from "@/lib/utils";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultServiceId?: string;
  defaultDescription?: string;
  defaultAmount?: number;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClientId,
  defaultClientName,
  defaultServiceId,
  defaultDescription,
  defaultAmount,
}: CreateInvoiceModalProps) {
  const [state, formAction, isPending] = useActionState(createInvoiceAction, null);
  const handledStateRef = useRef<any>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Selected client
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");

  // Eligible services for the selected client
  const [services, setServices] = useState<EligibleServiceForInvoice[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(defaultServiceId || "");

  // Form input states
  const [serviceDescription, setServiceDescription] = useState<string>(
    defaultDescription || "Company Registration, Compliance & Filing Fees"
  );
  const [subtotalVal, setSubtotalVal] = useState<string>(
    defaultAmount ? String(defaultAmount) : ""
  );
  const [taxRateVal, setTaxRateVal] = useState<string>("18");

  // Overbilling validation state
  const [validationResult, setValidationResult] = useState<OverbillingValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isOverrideApproved, setIsOverrideApproved] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Track if defaultServiceId was processed on open
  const initialPrefillDoneRef = useRef<boolean>(false);

  // Load clients if none preselected
  useEffect(() => {
    if (!defaultClientId && isOpen) {
      fetchClientsAction().then((data) => setClients(data || []));
    }
  }, [defaultClientId, isOpen]);

  // Sync defaultClientId when prop changes or modal opens
  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
    }
  }, [defaultClientId, isOpen]);

  // Sync defaultServiceId when prop changes or modal opens
  useEffect(() => {
    if (defaultServiceId) {
      setSelectedServiceId(defaultServiceId);
      initialPrefillDoneRef.current = false;
    }
  }, [defaultServiceId, isOpen]);

  // Fetch eligible services whenever selectedClientId changes
  useEffect(() => {
    if (!selectedClientId || !isOpen) {
      setServices([]);
      setSelectedServiceId("");
      return;
    }

    let isCurrent = true;
    setIsLoadingServices(true);

    fetchClientEligibleServicesForInvoiceAction(selectedClientId)
      .then((data) => {
        if (!isCurrent) return;
        setServices(data || []);
        setIsLoadingServices(false);

        // If defaultServiceId was passed and matches an eligible service, prefill it
        const targetId = defaultServiceId || selectedServiceId;
        const matchingSvc = data.find((s) => s.id === targetId);

        if (matchingSvc && !initialPrefillDoneRef.current) {
          initialPrefillDoneRef.current = true;
          setSelectedServiceId(matchingSvc.id);
          setServiceDescription(matchingSvc.serviceName);
          // Prefill with remaining billable amount (or contract value if 0 invoiced)
          const billable = matchingSvc.remainingBillableAmount > 0
            ? matchingSvc.remainingBillableAmount
            : matchingSvc.contractValue;
          setSubtotalVal(String(billable));
          setTaxRateVal(String(matchingSvc.taxRate ?? 18));
        } else if (!matchingSvc && data.length > 0 && !defaultServiceId && !selectedServiceId) {
          // If opened from client level without service preselected, leave empty to prompt selection
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error("Failed to load client services:", err);
        setIsLoadingServices(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedClientId, isOpen, defaultServiceId]);

  // Handle service selection change
  const handleServiceChange = (svcId: string) => {
    setSelectedServiceId(svcId);
    if (!svcId) return;

    const chosen = services.find((s) => s.id === svcId);
    if (chosen) {
      setServiceDescription(chosen.serviceName);
      // Auto-prefill with applicable billable amount excluding GST
      const billable = chosen.remainingBillableAmount > 0
        ? chosen.remainingBillableAmount
        : chosen.contractValue;
      setSubtotalVal(String(billable));
      setTaxRateVal(String(chosen.taxRate ?? 18));
    }
  };

  // Live calculated GST Breakdown
  const { numericSubtotal, numericTaxRate, calculatedGstAmount, calculatedInvoiceTotal } = useMemo(() => {
    const sub = Math.max(0, parseFloat(subtotalVal) || 0);
    const rate = Math.max(0, parseFloat(taxRateVal) || 0);
    const gst = Math.round(((sub * rate) / 100) * 100) / 100;
    const total = Math.round((sub + gst) * 100) / 100;
    return {
      numericSubtotal: sub,
      numericTaxRate: rate,
      calculatedGstAmount: gst,
      calculatedInvoiceTotal: total,
    };
  }, [subtotalVal, taxRateVal]);

  // Live overbilling check whenever client or amount changes
  useEffect(() => {
    if (!selectedClientId) {
      setValidationResult(null);
      return;
    }

    if (numericSubtotal <= 0) {
      setValidationResult(null);
      return;
    }

    let isMounted = true;
    setIsValidating(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkInvoiceOverbillingAction({
          clientId: selectedClientId,
          proposedInvoiceAmount: numericSubtotal,
        });
        if (isMounted) {
          setValidationResult(res);
          setIsValidating(false);
        }
      } catch (err) {
        if (isMounted) setIsValidating(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedClientId, numericSubtotal]);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      onSuccess();
      onClose();
    }
  }, [state, onSuccess, onClose]);

  if (!isOpen) return null;

  const isBlockedByOverbilling =
    validationResult?.isOverbilling && (!isOverrideApproved || overrideReason.trim().length < 5);

  const selectedServiceObj = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Sticky at top */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold shadow-2xs">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Generate GST Invoice</h3>
              <p className="text-[11px] text-slate-500 leading-tight">Create official tax bill with contract overbilling checks</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <form action={formAction} className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {/* 1. Billed To Client */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billed To Client *</label>
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
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedServiceId("");
                }}
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

          {/* 2. Select Service (Required Dropdown) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Select Service <span className="text-rose-500">*</span>
              </label>
              {isLoadingServices && (
                <span className="text-[10.5px] text-[#0481A2] flex items-center gap-1 font-medium">
                  <Loader2 size={11} className="animate-spin" /> Loading services...
                </span>
              )}
            </div>

            <select
              value={selectedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              disabled={isLoadingServices || !selectedClientId}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {services.length === 0 && !isLoadingServices
                  ? "No dedicated services found (or select to enter manually)"
                  : "Choose eligible service deliverable..."}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id} disabled={s.isFullyInvoiced}>
                  {s.serviceName} ({s.serviceCategory}) — {formatINR(s.contractValue)} —{" "}
                  {s.isFullyInvoiced
                    ? "Fully Invoiced"
                    : s.remainingBillableAmount < s.contractValue && s.remainingBillableAmount > 0
                    ? `Partially Invoiced (Rem: ${formatINR(s.remainingBillableAmount)})`
                    : s.paymentStatus || "Not Invoiced"}
                </option>
              ))}
            </select>

            {/* Hidden form input to link invoice_items.client_service_id */}
            <input type="hidden" name="client_service_id" value={selectedServiceId} />

            {selectedServiceObj && (
              <div className="mt-1.5 px-3 py-2 bg-sky-50/70 border border-sky-100 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
                <span>
                  Contract Value: <strong className="text-slate-800 font-sans font-number">{formatINR(selectedServiceObj.contractValue)}</strong>
                </span>
                <span>
                  Invoiced: <strong className="text-slate-800 font-sans font-number">{formatINR(selectedServiceObj.invoicedAmount)}</strong>
                </span>
                <span>
                  Billable Scope: <strong className="text-emerald-700 font-sans font-number">{formatINR(selectedServiceObj.remainingBillableAmount > 0 ? selectedServiceObj.remainingBillableAmount : selectedServiceObj.contractValue)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* 3. Service Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Description *</label>
            <input
              name="description"
              required
              type="text"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* 4. Subtotal & GST Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subtotal (Excl. GST) (₹) *</label>
              <input
                name="subtotal"
                required
                type="number"
                step="any"
                value={subtotalVal}
                onChange={(e) => setSubtotalVal(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] font-sans font-number font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <select
                name="tax_rate"
                value={taxRateVal}
                onChange={(e) => setTaxRateVal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="18">18% (Standard GST)</option>
                <option value="12">12%</option>
                <option value="5">5%</option>
                <option value="0">0% (Exempt)</option>
              </select>
            </div>
          </div>

          {/* 5. Live GST Calculation Preview Card */}
          {numericSubtotal > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Taxable Service Value:</span>
                <span className="font-semibold text-slate-800 font-sans font-number">{formatINR(numericSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Calculated GST ({numericTaxRate}%):</span>
                <span className="font-semibold text-slate-800 font-sans font-number">+{formatINR(calculatedGstAmount)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">Total Invoice Amount (Incl. GST):</span>
                <span className="text-[#0481A2] text-sm font-sans font-number">{formatINR(calculatedInvoiceTotal)}</span>
              </div>
            </div>
          )}

          {/* Overbilling Warning Banner */}
          {validationResult?.isOverbilling && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-amber-900">Contract Overbilling Warning</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                    This invoice exceeds the approved agreed contract value.
                  </p>
                </div>
              </div>

              {/* Financial comparison grid (Excl. GST) */}
              <div className="grid grid-cols-2 gap-2 bg-white/70 p-2.5 rounded-lg border border-amber-200 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Agreed Contract (Excl. GST):</span>
                  <span className="font-bold text-slate-800 font-sans font-number">{formatINR(validationResult.contractValue)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Previously Invoiced (Excl. GST):</span>
                  <span className="font-bold text-slate-800 font-sans font-number">{formatINR(validationResult.existingInvoicedAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Proposed Taxable Subtotal:</span>
                  <span className="font-bold text-[#0481A2] font-sans font-number">{formatINR(validationResult.proposedInvoiceAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remaining Contract (Excl. GST):</span>
                  <span className="font-bold text-slate-700 font-sans font-number">{formatINR(validationResult.remainingContractValue)}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-amber-200 flex items-center justify-between">
                  <span className="text-rose-600 font-bold block">Actual Taxable Excess:</span>
                  <span className="font-bold text-rose-600 font-sans font-number text-xs">+{formatINR(validationResult.excessAmount)}</span>
                </div>
              </div>

              {/* Administrator Approval Checkbox */}
              <div className="pt-1 border-t border-amber-200/80">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="allow_overbilling_override"
                    value="true"
                    checked={isOverrideApproved}
                    onChange={(e) => setIsOverrideApproved(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-[#0481A2] focus:ring-[#0481A2]"
                  />
                  <span className="text-[11px] font-semibold text-amber-950">
                    I am an authorized Administrator approving this excess billing.
                  </span>
                </label>

                {isOverrideApproved && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[10.5px] font-bold text-amber-900">
                      Approval Reason / Scope Description *
                    </label>
                    <input
                      type="text"
                      name="overbilling_approval_reason"
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Additional features agreed with client via email confirmation"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0481A2]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
              <input
                name="issue_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Due Date *</label>
              <input
                name="due_date"
                required
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Instructions / Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Please transfer to BRAND 360s HDFC Bank Current Account..."
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
              disabled={isPending || isBlockedByOverbilling}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Invoice</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
