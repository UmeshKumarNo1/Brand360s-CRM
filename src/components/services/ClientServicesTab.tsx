"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Layers,
  Trash2,
  UserCheck,
  RefreshCw,
  Calendar,
  History,
  ChevronDown,
  FileText,
  Paperclip,
  FileUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Edit2,
  ExternalLink,
  Shield,
  FileCheck,
  Briefcase,
  Globe,
  User,
  TrendingUp,
} from "lucide-react";
import {
  fetchClientServicesAction,
  removeClientServiceAction,
  updateClientServiceStatusAction,
} from "@/app/actions/services";
import { formatINR, cn } from "@/lib/utils";
import { AssignServiceModal } from "@/components/services/AssignServiceModal";
import { AssignVendorModal } from "@/components/vendors/AssignVendorModal";
import { ManageServiceVendorsModal } from "@/components/vendors/ManageServiceVendorsModal";
import { RenewServiceModal } from "@/components/renewals/RenewServiceModal";
import { RenewalHistoryModal } from "@/components/renewals/RenewalHistoryModal";
import { UploadServiceDeliverableModal } from "@/components/services/UploadServiceDeliverableModal";
import { ServiceDocumentsModal } from "@/components/services/ServiceDocumentsModal";
import { ServiceStageModal } from "@/components/services/ServiceStageModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";
import { computeServiceFulfillment, FulfillmentStage } from "@/lib/services/fulfillment-workflows";
import { InlineAssignEmployeeCell } from "@/components/services/InlineAssignEmployeeCell";
import { TargetDateCell } from "@/components/services/TargetDateCell";

interface ClientServicesTabProps {
  clientId: string;
  clientName: string;
  isAdmin: boolean;
  canEdit?: boolean;
  initialAddService?: boolean;
}

export function ClientServicesTab({
  clientId,
  clientName,
  isAdmin,
  canEdit = true,
  initialAddService,
}: ClientServicesTabProps) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(Boolean(initialAddService));
  const [vendorModalService, setVendorModalService] = useState<any | null>(null);
  const [manageVendorsService, setManageVendorsService] = useState<any | null>(null);
  const [renewModalService, setRenewModalService] = useState<any | null>(null);
  const [historyModalService, setHistoryModalService] = useState<any | null>(null);
  const [deliverableModalService, setDeliverableModalService] = useState<any | null>(null);
  const [documentsModalService, setDocumentsModalService] = useState<any | null>(null);
  const [stageModalServiceId, setStageModalServiceId] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  // Close actions menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    const currentReqId = ++requestIdRef.current;
    if (!silent) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await fetchClientServicesAction(clientId);
      if (currentReqId === requestIdRef.current) {
        setServices(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load client services.");
      }
    } finally {
      if (currentReqId === requestIdRef.current && !silent) {
        setIsLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemove = async (serviceId: string) => {
    if (!confirm("Remove this service deliverable from the client?")) return;
    setServices((prev) => prev.filter((s) => s.id !== serviceId));

    try {
      const res = await removeClientServiceAction(serviceId, clientId);
      if (res.error) {
        toastError("Failed to remove service", res.error);
        loadData();
      } else {
        success("Service removed", "Client deliverable deleted.");
      }
    } catch {
      toastError("Failed to remove service", "Server connection error.");
      loadData();
    }
  };

  // Header Financial Calculations
  const totalContract = services.reduce((sum, s) => sum + (Number(s.contractValue) || 0), 0);
  const totalInvoiced = services.reduce((sum, s) => sum + (Number(s.invoicedAmount) || Number(s.contractValue) || 0), 0);
  const totalCollected = services.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
  const totalOutstanding = Math.max(0, totalContract - totalCollected);

  // Service Icon Helper
  const getServiceIcon = (name: string, category?: string) => {
    const norm = (name + " " + (category || "")).toLowerCase();
    if (norm.includes("trademark") || norm.includes("ip") || norm.includes("patent") || norm.includes("copyright")) {
      return Shield;
    }
    if (norm.includes("incorporat") || norm.includes("pvt ltd") || norm.includes("llp") || norm.includes("company")) {
      return Layers;
    }
    if (norm.includes("gst") || norm.includes("tax") || norm.includes("tds") || norm.includes("compliance")) {
      return FileCheck;
    }
    if (norm.includes("web") || norm.includes("app") || norm.includes("software")) {
      return Globe;
    }
    return Briefcase;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header with Compact Financial Summary Matching Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Services for {clientName} ({services.length})
          </h4>
        </div>

        {/* Financial KPI Summary Bar */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Contract:</span>
            <strong className="text-slate-900 font-sans font-number font-semibold">
              {formatINR(totalContract)}
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Invoiced:</span>
            <strong className="text-slate-900 font-sans font-number font-semibold">
              {formatINR(totalInvoiced)}
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Collected:</span>
            <strong className="text-emerald-700 font-sans font-number font-bold">
              {formatINR(totalCollected)}
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Outstanding:</span>
            <strong className="text-rose-600 font-sans font-number font-bold">
              {formatINR(totalOutstanding)}
            </strong>
          </div>

          <div className="pl-2 flex items-center gap-1.5 border-l border-slate-200 ml-1">
            <button
              onClick={() => loadData()}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition-colors cursor-pointer"
              title="Refresh services"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
            </button>
            <button
              onClick={() => setIsAddServiceModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Service</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <ErrorRetryState message={errorMessage} onRetry={loadData} />}

      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#243E76] text-white font-semibold text-xs tracking-wide align-middle">
                  <th className="py-2.5 px-3 font-semibold min-w-[170px]">Service</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold min-w-[95px]">Contract Value</th>
                  <th className="py-2.5 px-2.5 text-center font-semibold min-w-[115px]">Payment</th>
                  <th className="py-2.5 px-3 text-center font-semibold min-w-[300px]">Fulfillment Progress (Stages)</th>
                  <th className="py-2.5 px-2 text-center font-semibold min-w-[70px]">Progress</th>
                  <th className="py-2.5 px-2.5 text-left font-semibold min-w-[130px]">Current Stage</th>
                  <th className="py-2.5 px-2.5 text-left font-semibold min-w-[110px]">Assigned To</th>
                  <th className="py-2.5 px-2.5 text-left font-semibold min-w-[95px]">Due Date</th>
                  <th className="py-2.5 px-2 text-center font-semibold min-w-[95px]">Status</th>
                  <th className="py-2.5 px-2 text-center font-semibold min-w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span className="text-xs">Loading client services portfolio...</span>
                      </div>
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No individual service deliverables assigned yet. Click &quot;Add Service&quot; to assign one.
                    </td>
                  </tr>
                ) : (
                  services.map((s) => {
                    const ServiceIcon = getServiceIcon(s.service_name, s.service_category);
                    const fulfillment = computeServiceFulfillment(s);
                    const contractAmt = Number(s.contractValue) || 0;
                    const paidAmt = Number(s.amountPaid) || 0;
                    const paymentStatus = s.paymentStatus || "Unpaid";

                    // Assigned Employee
                    const employeeName = s.assigned_profile?.full_name || "Unassigned";

                    // Status pill styling
                    const serviceStatus = s.service_status || "Pending";
                    let statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                    if (serviceStatus === "Completed") {
                      statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
                    } else if (serviceStatus === "On Hold") {
                      statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (serviceStatus === "Cancelled") {
                      statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
                    }

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Service Column */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#077EA1] border border-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                              <ServiceIcon size={14} />
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDocumentsModalService(s)}
                                className="font-bold text-slate-900 block leading-tight text-xs truncate hover:text-[#077EA1] hover:underline cursor-pointer group text-left"
                                title={`View details for ${s.service_name}`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <span>{s.service_name}</span>
                                  <ExternalLink size={11} className="text-slate-400 group-hover:text-[#077EA1] shrink-0" />
                                </span>
                              </button>
                              <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5" title={s.service_category || "General"}>
                                ({s.service_category || "General"})
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contract Value Column */}
                        <td className="py-3 px-2.5 align-middle text-right font-bold text-slate-900 text-xs font-sans font-number whitespace-nowrap">
                          {formatINR(contractAmt)}
                        </td>

                        {/* 3. Payment Column (Paid, Partial, Unpaid with ratios matching Reference Image 2) */}
                        <td className="py-3 px-2.5 align-middle text-center whitespace-nowrap">
                          {paymentStatus === "Paid" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Paid
                              </span>
                              <span className="block text-[10px] text-slate-600 font-semibold font-sans font-number">
                                {formatINR(paidAmt)}
                              </span>
                            </div>
                          ) : paymentStatus === "Partial" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Partial
                              </span>
                              <span className="block text-[10px] text-slate-600 font-semibold font-sans font-number">
                                {formatINR(paidAmt)} / {formatINR(contractAmt)}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Unpaid
                              </span>
                              <span className="block text-[10px] text-rose-600 font-semibold font-sans font-number">
                                ₹0 / {formatINR(contractAmt)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 4. Fulfillment Progress (Horizontal Milestone Tracker matching Reference Image 2) */}
                        <td
                          onClick={() => setStageModalServiceId(s.id)}
                          className="py-3 px-3 align-middle cursor-pointer hover:bg-sky-50/50 transition-colors"
                          title="Click to manage service fulfillment stages"
                        >
                          <div className="flex items-center justify-between w-full max-w-[340px] mx-auto relative group">
                            {fulfillment.stages.map((stage, sIdx) => {
                              const isCompleted = stage.status === "completed";
                              const isCurrent = stage.status === "current";
                              const isLast = sIdx === fulfillment.stages.length - 1;

                              return (
                                <div key={stage.name} className="flex-1 flex flex-col items-center relative">
                                  {/* Milestone Node */}
                                  <div className="relative z-10 flex items-center justify-center">
                                    {isCompleted ? (
                                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                                        <CheckCircle2 size={12} className="stroke-[3]" />
                                      </div>
                                    ) : isCurrent ? (
                                      <div className="w-4 h-4 rounded-full bg-white border-2 border-blue-600 text-blue-600 flex items-center justify-center ring-2 ring-blue-100 shadow-2xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                      </div>
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300" />
                                    )}
                                  </div>

                                  {/* Connector Line to next stage */}
                                  {!isLast && (
                                    <div
                                      className={cn(
                                        "absolute top-2 left-1/2 w-full h-[2px] -z-0",
                                        isCompleted ? "bg-emerald-500" : isCurrent ? "bg-blue-300" : "bg-slate-200"
                                      )}
                                    />
                                  )}

                                  {/* Milestone Label */}
                                  <span
                                    className={cn(
                                      "text-[9px] mt-1 text-center font-medium leading-tight whitespace-nowrap",
                                      isCompleted
                                        ? "text-slate-700"
                                        : isCurrent
                                        ? "text-blue-700 font-bold"
                                        : "text-slate-400"
                                    )}
                                  >
                                    {stage.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* 5. Progress % Indicator */}
                        <td
                          onClick={() => setStageModalServiceId(s.id)}
                          className="py-3 px-2 align-middle text-center whitespace-nowrap cursor-pointer hover:bg-sky-50/50 transition-colors"
                          title="Click to manage stage"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans font-number",
                              fulfillment.progressPercentage === 100
                                ? "bg-emerald-100 text-emerald-800"
                                : fulfillment.progressPercentage >= 50
                                ? "bg-sky-100 text-sky-800"
                                : fulfillment.progressPercentage > 0
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {fulfillment.progressPercentage}%
                          </span>
                        </td>

                        {/* 6. Current Stage Column */}
                        <td
                          onClick={() => setStageModalServiceId(s.id)}
                          className="py-3 px-2.5 align-middle cursor-pointer hover:bg-sky-50/50 transition-colors"
                          title="Click to manage stage"
                        >
                          <span className="font-bold text-slate-800 block text-xs leading-tight hover:text-[#0481A2]">
                            {fulfillment.currentStageName}
                          </span>
                          {fulfillment.currentStageDescription && (
                            <span className="text-[10px] text-slate-400 block leading-tight mt-0.5 truncate max-w-[130px]">
                              ({fulfillment.currentStageDescription})
                            </span>
                          )}
                        </td>

                        {/* 7. Assigned To Column */}
                        <td className="py-3 px-2.5 align-middle text-slate-700 whitespace-nowrap">
                          <InlineAssignEmployeeCell
                            serviceId={s.id}
                            clientId={clientId}
                            assignedEmployeeId={s.assigned_employee_id}
                            assignedEmployeeName={employeeName}
                            editable={canEdit}
                            onUpdated={() => loadData(true)}
                          />
                        </td>

                        {/* 8. Due Date Column */}
                        <td className="py-3 px-2.5 align-middle text-slate-600 whitespace-nowrap">
                          <TargetDateCell
                            serviceId={s.id}
                            clientId={clientId}
                            initialDate={s.expected_completion_date}
                            isCompleted={s.service_status === "Completed"}
                            editable={canEdit}
                            onDateUpdated={() => loadData(true)}
                          />
                        </td>

                        {/* 9. Status Column */}
                        <td className="py-3 px-2 align-middle text-center whitespace-nowrap">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] border", statusBadge)}>
                            {serviceStatus}
                          </span>
                        </td>

                        {/* 10. Actions Column (Compact Three-Dot Menu) */}
                        <td className="py-3 px-2 align-middle text-center relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === s.id ? null : s.id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {/* Action Dropdown Menu */}
                          {openActionMenuId === s.id && (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-3 top-8 z-30 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-left text-xs animate-in fade-in-50"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setStageModalServiceId(s.id);
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-[#0481A2]"
                              >
                                <TrendingUp size={13} className="text-[#0481A2]" />
                                <span>Manage Fulfillment Stages</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setDocumentsModalService(s);
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <FileText size={13} className="text-slate-400" />
                                <span>Documents & Deliverables</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setVendorModalService(s);
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <UserCheck size={13} className="text-slate-400" />
                                <span>Vendor Assignment</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setRenewModalService({
                                    id: s.id,
                                    clientId,
                                    clientName,
                                    serviceName: s.service_name,
                                    serviceCategory: s.service_category || "General",
                                    renewalDate: s.expected_completion_date || s.renewal_date || new Date().toISOString().split("T")[0],
                                    renewalAmount: Number(s.contractValue) || 0,
                                    renewalStatus: s.renewal_status || "Upcoming",
                                    salespersonName: "",
                                    paymentStatus: s.paymentStatus || "Unpaid",
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <RefreshCw size={13} className="text-emerald-600" />
                                <span>Renew Service</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setHistoryModalService({
                                    id: s.id,
                                    service_name: s.service_name,
                                    client_name: clientName,
                                    client_id: clientId,
                                  });
                                }}
                                className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <History size={13} className="text-slate-400" />
                                <span>Renewal History</span>
                              </button>

                              {isAdmin && (
                                <div className="border-t border-slate-100 my-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleRemove(s.id);
                                    }}
                                    className="w-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove Service</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing Attached Modals for Document, Vendor & Renewal Operations */}
      <AssignServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={() => loadData(true)}
        clientId={clientId}
        clientName={clientName}
      />

      {vendorModalService && (
        <AssignVendorModal
          isOpen={!!vendorModalService}
          onClose={() => setVendorModalService(null)}
          onSuccess={() => {
            setVendorModalService(null);
            loadData(true);
          }}
          clientServiceId={vendorModalService.id}
          serviceName={vendorModalService.service_name}
          serviceFee={Number(vendorModalService.service_fee) || Number(vendorModalService.contractValue) || 0}
          clientName={clientName}
          existingVendorIds={(vendorModalService.vendor_assignments || []).map((a: any) => a.vendor_id)}
        />
      )}

      {manageVendorsService && (
        <ManageServiceVendorsModal
          isOpen={!!manageVendorsService}
          onClose={() => setManageVendorsService(null)}
          onRefresh={() => loadData(true)}
          clientName={clientName}
          onOpenAssignVendor={() => {
            setVendorModalService(manageVendorsService);
            setManageVendorsService(null);
          }}
          service={manageVendorsService}
        />
      )}

      {renewModalService && (
        <RenewServiceModal
          isOpen={!!renewModalService}
          onClose={() => setRenewModalService(null)}
          onSuccess={() => {
            setRenewModalService(null);
            loadData(true);
          }}
          renewal={renewModalService}
        />
      )}

      {historyModalService && (
        <RenewalHistoryModal
          isOpen={!!historyModalService}
          onClose={() => setHistoryModalService(null)}
          serviceId={historyModalService.id}
          serviceName={historyModalService.service_name}
          clientName={historyModalService.client_name}
        />
      )}

      {deliverableModalService && (
        <UploadServiceDeliverableModal
          isOpen={!!deliverableModalService}
          onClose={() => setDeliverableModalService(null)}
          onSuccess={() => {
            setDeliverableModalService(null);
            loadData(true);
          }}
          clientId={clientId}
          clientServiceId={deliverableModalService.id}
          serviceName={deliverableModalService.service_name}
        />
      )}

      {documentsModalService && (
        <ServiceDocumentsModal
          isOpen={!!documentsModalService}
          onClose={() => setDocumentsModalService(null)}
          onRefreshParent={() => loadData(true)}
          clientId={clientId}
          clientServiceId={documentsModalService.id}
          serviceName={documentsModalService.service_name}
          clientName={clientName}
          serviceStatus={documentsModalService.service_status}
        />
      )}
      {/* Service Fulfillment Stage Management Modal */}
      <ServiceStageModal
        isOpen={Boolean(stageModalServiceId)}
        onClose={() => setStageModalServiceId(null)}
        serviceId={stageModalServiceId}
        onSuccess={() => {
          loadData(true);
        }}
      />
    </div>
  );
}
