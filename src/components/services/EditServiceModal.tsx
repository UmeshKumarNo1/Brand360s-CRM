"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Edit3,
  X,
  Loader2,
  AlertTriangle,
  Lock,
  Workflow,
  Calendar,
  User,
  Percent,
  CheckCircle2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { editClientServiceAction } from "@/app/actions/services";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { WORKFLOW_OPTIONS, getServiceFulfillmentPreset } from "@/lib/services/fulfillment-workflows";
import type { DetailedServiceData } from "@/app/actions/client-detailed-services";

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: DetailedServiceData;
  onSuccess: () => void;
}

export function EditServiceModal({
  isOpen,
  onClose,
  service,
  onSuccess,
}: EditServiceModalProps) {
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);
  const [serviceName, setServiceName] = useState(service.serviceName);
  const [serviceCategory, setServiceCategory] = useState(service.serviceCategory || "General");
  const [serviceFee, setServiceFee] = useState<number>(service.serviceFee || 0);
  const [govtFee, setGovtFee] = useState<number>(service.govtFee || 0);
  const [taxRate, setTaxRate] = useState<number>(service.taxRate ?? 18);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>(service.assignedEmployeeId || "");
  const [expectedDate, setExpectedDate] = useState<string>(
    service.expectedCompletionDate ? service.expectedCompletionDate.split("T")[0] : ""
  );
  const [serviceStatus, setServiceStatus] = useState<string>(service.serviceStatus || "Pending");
  const [notes, setNotes] = useState<string>(service.notes || "");
  
  // Workflow Preset
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>(() => {
    if (service.workflowPreset) return service.workflowPreset;
    const norm = (service.serviceName + " " + (service.serviceCategory || "")).toLowerCase();
    if (norm.includes("web") || norm.includes("app") || norm.includes("software")) return "website";
    if (norm.includes("gst")) return "gst";
    if (norm.includes("incorporat") || norm.includes("pvt ltd") || norm.includes("llp")) return "incorporation";
    if (norm.includes("trademark")) return "trademark";
    if (norm.includes("compliance")) return "compliance";
    return "general";
  });

  const [confirmWorkflowChange, setConfirmWorkflowChange] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] = useState<string | null>(null);

  const [weekendWarning, setWeekendWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Check if financial details are locked due to issued invoices
  const hasIssuedInvoice = (service.invoices || []).some(
    (inv) => inv.status && inv.status !== "Draft" && inv.status !== "Cancelled"
  );

  useEffect(() => {
    if (isOpen) {
      fetchSalespeopleAction().then((data) => setSalespeople(data || []));
      setServiceName(service.serviceName);
      setServiceCategory(service.serviceCategory || "General");
      setServiceFee(service.serviceFee || 0);
      setGovtFee(service.govtFee || 0);
      setTaxRate(service.taxRate ?? 18);
      setAssignedEmployeeId(service.assignedEmployeeId || "");
      setExpectedDate(
        service.expectedCompletionDate ? service.expectedCompletionDate.split("T")[0] : ""
      );
      setServiceStatus(service.serviceStatus || "Pending");
      setNotes(service.notes || "");
      setErrorMessage(null);
      setConfirmWorkflowChange(false);
      setPendingWorkflow(null);
    }
  }, [isOpen, service]);

  if (!isOpen) return null;

  // Working day date snapping
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setExpectedDate("");
      setWeekendWarning(null);
      return;
    }
    const [y, m, d] = val.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();

    if (day === 6) {
      // Saturday -> snap to Monday
      dateObj.setDate(dateObj.getDate() + 2);
      const nextY = dateObj.getFullYear();
      const nextM = String(dateObj.getMonth() + 1).padStart(2, "0");
      const nextD = String(dateObj.getDate()).padStart(2, "0");
      const snapped = `${nextY}-${nextM}-${nextD}`;
      setExpectedDate(snapped);
      setWeekendWarning(`Saturday is a non-working day. Automatically snapped to Monday, ${snapped}.`);
    } else if (day === 0) {
      // Sunday -> snap to Monday
      dateObj.setDate(dateObj.getDate() + 1);
      const nextY = dateObj.getFullYear();
      const nextM = String(dateObj.getMonth() + 1).padStart(2, "0");
      const nextD = String(dateObj.getDate()).padStart(2, "0");
      const snapped = `${nextY}-${nextM}-${nextD}`;
      setExpectedDate(snapped);
      setWeekendWarning(`Sunday is a non-working day. Automatically snapped to Monday, ${snapped}.`);
    } else {
      setExpectedDate(val);
      setWeekendWarning(null);
    }
  };

  const handleWorkflowChange = (newWf: string) => {
    // If service already has active progress or stages, prompt confirmation
    const hasProgress = (service.progressPercentage || 0) > 0;
    if (hasProgress && newWf !== selectedWorkflow) {
      setPendingWorkflow(newWf);
      setConfirmWorkflowChange(true);
    } else {
      setSelectedWorkflow(newWf);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await editClientServiceAction(service.id, service.clientId, {
          serviceName,
          serviceCategory,
          serviceFee: hasIssuedInvoice ? undefined : Number(serviceFee),
          govtFee: hasIssuedInvoice ? undefined : Number(govtFee),
          taxRate: Number(taxRate),
          startDate: service.startDate,
          expectedCompletionDate: expectedDate || null,
          serviceStatus,
          assignedEmployeeId: assignedEmployeeId || null,
          notes,
          workflowPreset: selectedWorkflow,
        });

        if (res.error) {
          setErrorMessage(res.error);
        } else {
          onSuccess();
          onClose();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to update service.");
      }
    });
  };

  const totalContract = (Number(serviceFee) || 0) + (Number(govtFee) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold border border-sky-100">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit Service Deliverable</h3>
              <p className="text-[11px] text-slate-500">
                Update commercial terms, target dates, and fulfillment workflow for this service.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Locked Financial Banner if Issued Invoice Exists */}
          {hasIssuedInvoice && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
              <Lock size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Commercial Fees Locked</span>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This service is linked to an issued invoice ({service.invoices.map((i) => i.invoiceNumber).join(", ")}).
                  Service &amp; government fees cannot be edited here to preserve tax compliance and invoice integrity.
                </p>
              </div>
            </div>
          )}

          {/* 1. Service Name & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Name</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Category</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Company Incorporation">Company Incorporation</option>
                <option value="GST Services">GST Services</option>
                <option value="Trademark & IP">Trademark &amp; IP</option>
                <option value="Website Development">Website Development</option>
                <option value="ROC & Compliance">ROC &amp; Compliance</option>
                <option value="Taxation">Taxation</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* 2. Commercials: Service Fee, Govt Fee & GST Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Fee (₹)</label>
              <input
                type="number"
                step="any"
                disabled={hasIssuedInvoice}
                value={serviceFee}
                onChange={(e) => setServiceFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Government Fee (₹)</label>
              <input
                type="number"
                step="any"
                disabled={hasIssuedInvoice}
                value={govtFee}
                onChange={(e) => setGovtFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 pr-7 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
                />
                <Percent size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total Contract Value (Excl. GST):</span>
            <strong className="text-slate-900 font-bold">{formatINR(totalContract)}</strong>
          </div>

          {/* 3. Assigned Employee & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Employee</label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="">Unassigned</option>
                {salespeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fulfillment Status</label>
              <select
                value={serviceStatus}
                onChange={(e) => setServiceStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing / In Progress</option>
                <option value="Documents Pending">Documents Pending</option>
                <option value="Waiting for Approval">Waiting for Approval</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* 4. Target Completion Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Target Delivery Date</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Working Days Only</span>
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
            />
            {weekendWarning ? (
              <p className="text-[10.5px] text-amber-600 font-medium mt-1 leading-tight">
                ⚠️ {weekendWarning}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                Committed completion milestone timeline (Mon–Fri only).
              </p>
            )}
          </div>

          {/* 5. Fulfillment Workflow / Milestone Template */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Workflow size={15} className="text-[#0481A2]" />
              <label className="font-bold text-slate-900">Fulfillment Workflow / Milestone Template</label>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Defines the stage progression for this service. Changing templates maps any matching completed stages.
            </p>
            <select
              value={selectedWorkflow}
              onChange={(e) => handleWorkflowChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2] text-xs font-medium text-slate-800"
            >
              {WORKFLOW_OPTIONS.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.label}
                </option>
              ))}
            </select>

            {/* Stage Previews */}
            <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Stages:</span>
              {getServiceFulfillmentPreset(serviceName, serviceCategory, selectedWorkflow).map((stg, i) => (
                <span
                  key={stg}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium shadow-2xs"
                >
                  {i + 1}. {stg}
                </span>
              ))}
            </div>
          </div>

          {/* Workflow Change Confirmation Dialog if pending */}
          {confirmWorkflowChange && pendingWorkflow && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 animate-in fade-in-50">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Confirm Workflow Template Change</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    This service already has fulfillment progress recorded ({service.progressPercentage || 0}%).
                    Switching to the new workflow will map compatible completed stages and update the milestone timeline.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmWorkflowChange(false);
                    setPendingWorkflow(null);
                  }}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Keep Current
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorkflow(pendingWorkflow);
                    setConfirmWorkflowChange(false);
                    setPendingWorkflow(null);
                  }}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold cursor-pointer shadow-2xs"
                >
                  Proceed with Change
                </button>
              </div>
            </div>
          )}

          {/* 6. Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Notes &amp; Scope</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal deliverables, requirements, or operational scope..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2] text-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isPending && <Loader2 size={15} className="animate-spin" />}
              <span>{isPending ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

