"use client";

import { useActionState, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, X, Loader2, IndianRupee, FileText, AlertCircle } from "lucide-react";
import { createInstallmentAction } from "@/app/actions/payments";
import { fetchClientsAction } from "@/app/actions/clients";
import { fetchClientDetailedServicesAction, DetailedServiceData } from "@/app/actions/client-detailed-services";
import { formatINR } from "@/lib/utils";
import { useToast } from "@/components/common/ToastProvider";

interface CreateInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
  clientName?: string;
  defaultClientId?: string;
  defaultServiceId?: string | null;
  existingInstallments?: any[];
}

function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]} Installment`;
}

export function CreateInstallmentModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  defaultClientId,
  defaultServiceId,
  existingInstallments = [],
}: CreateInstallmentModalProps) {
  const effectiveDefaultClientId = defaultClientId || clientId || "";
  const [state, formAction, isPending] = useActionState(createInstallmentAction, null);
  const handledStateRef = useRef<any>(null);
  const { success } = useToast();

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || "");
  const [services, setServices] = useState<DetailedServiceData[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(defaultServiceId || "");

  const [title, setTitle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchClientsAction().then((data) => {
      setClients((data || []).filter((c: any) => (c.clientStatus || c.client_status) !== "Archived"));
    });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(effectiveDefaultClientId);
      setSelectedServiceId(defaultServiceId || "");
      setTitle("");
      setAmountInput("");
      setDueDate("");
      setNotes("");
    }
  }, [isOpen, effectiveDefaultClientId, defaultServiceId]);

  useEffect(() => {
    if (!selectedClientId) {
      setServices([]);
      setSelectedServiceId("");
      return;
    }
    setIsLoadingServices(true);
    fetchClientDetailedServicesAction(selectedClientId)
      .then((data) => {
        const active = (data || []).filter((s) => s.serviceStatus !== "Cancelled");
        setServices(active);
        if (defaultServiceId && active.some((s) => s.id === defaultServiceId)) {
          setSelectedServiceId(defaultServiceId);
        } else if (!active.some((s) => s.id === selectedServiceId)) {
          setSelectedServiceId("");
        }
      })
      .finally(() => setIsLoadingServices(false));
  }, [selectedClientId, defaultServiceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const linkedInvoice = useMemo(() => {
    if (!selectedService || !selectedService.invoices || selectedService.invoices.length === 0) {
      return null;
    }
    return selectedService.invoices[0];
  }, [selectedService]);

  const serviceInstallments = useMemo(() => {
    if (!selectedServiceId) return [];
    return (existingInstallments || []).filter(
      (i: any) =>
        (i.clientServiceId === selectedServiceId || i.client_service_id === selectedServiceId) &&
        i.status !== "Cancelled"
    );
  }, [existingInstallments, selectedServiceId]);

  const serviceInvoicedValue = selectedService?.invoicedAmount || 0;
  const alreadyScheduled = serviceInstallments.reduce(
    (sum: number, i: any) => sum + (Number(i.amount) || 0),
    0
  );
  const serviceVerifiedReceived = selectedService?.collectedAmount || 0;
  const availableToSchedule = Math.max(
    0,
    Math.round((serviceInvoicedValue - alreadyScheduled) * 100) / 100
  );
  const nextInstallmentNumber = serviceInstallments.length + 1;

  const enteredAmount = parseFloat(amountInput) || 0;
  const isAmountExceeding = enteredAmount > availableToSchedule + 0.009;
  const remainingAfterThis = Math.max(
    0,
    Math.round((availableToSchedule - enteredAmount) * 100) / 100
  );

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    if (state.success) {
      handledStateRef.current = state;
      success("Installment Created", "Payment schedule milestone added.");
      onSuccess();
      onClose();
    } else if (state.error) {
      handledStateRef.current = state;
    }
  }, [state, success, onSuccess, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const canSubmit =
    !isPending &&
    !!selectedClientId &&
    !!selectedServiceId &&
    !!linkedInvoice &&
    availableToSchedule > 0.009 &&
    enteredAmount > 0 &&
    !isAmountExceeding &&
    !!title.trim() &&
    !!dueDate;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#243E76] flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create Installment Schedule</h3>
              <p className="text-[11px] text-slate-500">
                Link milestone to Client → Service → Invoice
              </p>
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
        <form action={formAction} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {/* FIELD 1: Select Client */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              1. Select Client <span className="text-red-500">*</span>
            </label>
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
                  {c.companyName || c.company_name || "Unnamed Client"} ({c.clientCode || c.client_code || "N/A"})
                </option>
              ))}
            </select>
          </div>

          {/* FIELD 2: Select Service */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              2. Select Service <span className="text-red-500">*</span>
            </label>
            <select
              name="client_service_id"
              required
              disabled={!selectedClientId || isLoadingServices}
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] disabled:bg-slate-50"
            >
              <option value="">
                {isLoadingServices
                  ? "Loading client services..."
                  : !selectedClientId
                    ? "Select a client first..."
                    : services.length === 0
                      ? "No active services found"
                      : "Select Service..."}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName} ({s.serviceCategory}) — {s.serviceStatus}
                </option>
              ))}
            </select>
          </div>

          {/* FIELD 3: Invoice Details (Auto-filled & Read-only) */}
          {selectedService && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#243E76] uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>3. Linked Invoice &amp; Service Financial Summary</span>
                </span>
                {linkedInvoice ? (
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-[#243E76] border border-sky-200 font-mono text-[11px] font-semibold">
                    {linkedInvoice.invoiceNumber} ({linkedInvoice.status})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                    No Issued Invoice
                  </span>
                )}
              </div>

              {linkedInvoice ? (
                <>
                  <input type="hidden" name="invoice_id" value={linkedInvoice.id} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Invoiced (Incl. GST)</span>
                      <strong className="font-mono text-slate-900">{formatINR(serviceInvoicedValue)}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Already Scheduled</span>
                      <strong className="font-mono text-slate-800">{formatINR(alreadyScheduled)}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Verified Received</span>
                      <strong className="font-mono text-emerald-700">{formatINR(serviceVerifiedReceived)}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block">Available to Schedule</span>
                      <strong className="font-mono text-[#0481A2]">{formatINR(availableToSchedule)}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    No valid issued invoice exists for <strong>{selectedService.serviceName}</strong>. Please generate an invoice for this service first.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FIELD 4 & 5: Installment Number & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                4. Installment <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={selectedServiceId ? formatOrdinal(nextInstallmentNumber) : "Select service..."}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                5. Installment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Initial Payment"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* FIELD 6 & 7: Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  6. Installment Amount (₹) <span className="text-red-500">*</span>
                </label>
                {selectedService && linkedInvoice && (
                  <span className="text-[10px] font-mono text-[#0481A2] font-semibold">
                    Max: {formatINR(availableToSchedule)}
                  </span>
                )}
              </div>
              <div className="relative">
                <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  name="amount"
                  step="any"
                  min="1"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-[#0481A2]"
                />
              </div>
              {isAmountExceeding && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  Exceeds available balance ({formatINR(availableToSchedule)}).
                </p>
              )}
              {enteredAmount > 0 && !isAmountExceeding && linkedInvoice && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Remaining unscheduled after this: <strong className="font-mono">{formatINR(remainingAfterThis)}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                7. Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* FIELD 8: Notes / Deliverables */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              8. Notes / Deliverables
            </label>
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment after wireframe approval"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-[#243E76] hover:bg-[#1b2f5b] text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              <span>Save Installment</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
