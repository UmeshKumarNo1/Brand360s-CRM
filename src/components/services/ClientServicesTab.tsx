"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Layers,
  Trash2,
  UserCheck,
  RefreshCw,
  Store,
  Calendar,
  History,
  ChevronDown,
  FileText,
  Paperclip,
  FileUp,
  Monitor,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { fetchClientServicesAction, removeClientServiceAction, updateClientServiceStatusAction } from "@/app/actions/services";
import { formatINR, cn } from "@/lib/utils";
import { AssignServiceModal } from "@/components/services/AssignServiceModal";
import { AssignVendorModal } from "@/components/vendors/AssignVendorModal";
import { ManageServiceVendorsModal } from "@/components/vendors/ManageServiceVendorsModal";
import { RenewServiceModal } from "@/components/renewals/RenewServiceModal";
import { RenewalHistoryModal } from "@/components/renewals/RenewalHistoryModal";
import { UploadServiceDeliverableModal } from "@/components/services/UploadServiceDeliverableModal";
import { ServiceDocumentsModal } from "@/components/services/ServiceDocumentsModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

interface ClientServicesTabProps {
  clientId: string;
  clientName: string;
  isAdmin: boolean;
  initialAddService?: boolean;
}

export function ClientServicesTab({ clientId, clientName, isAdmin, initialAddService }: ClientServicesTabProps) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);

  // Modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(Boolean(initialAddService));
  const [vendorModalService, setVendorModalService] = useState<any | null>(null);
  const [manageVendorsService, setManageVendorsService] = useState<any | null>(null);
  const [renewModalService, setRenewModalService] = useState<any | null>(null);
  const [historyModalService, setHistoryModalService] = useState<any | null>(null);
  const [deliverableModalService, setDeliverableModalService] = useState<any | null>(null);
  const [documentsModalService, setDocumentsModalService] = useState<any | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

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

        // Also update manageVendorsService if it was open without triggering re-render cascade
        setManageVendorsService((prev: any) => {
          if (!prev) return null;
          const updated = (data || []).find((s: any) => s.id === prev.id);
          return updated || prev;
        });
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

  const getVendorStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getRenewalStatusBadge = (service: any) => {
    const renewalStatus = service.renewal_status;
    const expiryDateStr = service.expected_completion_date || service.renewal_date;

    if (renewalStatus === "Renewed") {
      return {
        label: "Renewed",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    }

    if (!expiryDateStr) {
      return {
        label: "Not Scheduled",
        className: "bg-slate-50 text-slate-500 border-slate-200",
        icon: Clock,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Expired (${Math.abs(diffDays)}d ago)`,
        className: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
        icon: AlertCircle,
      };
    }
    if (diffDays <= 30) {
      return {
        label: `Due in ${diffDays} days`,
        className: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
        icon: Calendar,
      };
    }
    return {
      label: `Active (${diffDays}d left)`,
      className: "bg-sky-50 text-sky-700 border-sky-200 font-medium",
      icon: Clock,
    };
  };

  const handleStatusChange = async (serviceId: string, newStatus: string, serviceName: string) => {
    const currentService = services.find((s) => s.id === serviceId);
    const oldStatus = currentService?.service_status;
    if (oldStatus === newStatus) return;

    // Optimistically update UI
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, service_status: newStatus } : s))
    );
    setUpdatingServiceId(serviceId);

    try {
      const res = await updateClientServiceStatusAction(serviceId, newStatus, clientId);
      if (res?.error) {
        // Rollback
        setServices((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, service_status: oldStatus } : s))
        );
        toastError("Failed to update status", res.error);
      } else {
        success("Status Updated", `${serviceName} marked as ${newStatus}.`);
        if (newStatus === "Completed" && currentService) {
          // Open completion deliverable upload modal (e.g. GST Certificate)
          setDeliverableModalService({
            ...currentService,
            service_status: "Completed",
          });
        }
      }
    } catch (err: any) {
      // Rollback
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, service_status: oldStatus } : s))
      );
      toastError("Update Error", err?.message || "Failed to update service status.");
    } finally {
      setUpdatingServiceId(null);
    }
  };

  const getServiceStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "Processing":
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "Waiting for Approval":
      case "Under Review":
        return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";
      case "On Hold":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
      case "Pending":
      default:
        return "bg-sky-50 text-[#077EA1] border-sky-200 hover:bg-sky-100";
    }
  };

  const getServiceStatusDotColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500";
      case "Processing":
      case "In Progress":
        return "bg-blue-500";
      case "Waiting for Approval":
      case "Under Review":
        return "bg-purple-500";
      case "On Hold":
        return "bg-amber-500";
      case "Cancelled":
        return "bg-rose-500";
      case "Pending":
      default:
        return "bg-[#077EA1]";
    }
  };

  const getServiceIcon = (serviceName: string, category: string) => {
    const text = `${serviceName} ${category}`.toLowerCase();
    if (text.includes("web") || text.includes("software") || text.includes("app") || text.includes("dev")) {
      return { icon: Monitor, color: "text-[#077EA1] bg-sky-50 border-sky-100" };
    }
    if (text.includes("gst") || text.includes("tax") || text.includes("audit") || text.includes("compliance") || text.includes("filing")) {
      return { icon: FileSpreadsheet, color: "text-purple-600 bg-purple-50 border-purple-100" };
    }
    return { icon: Layers, color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Services & Compliance Portfolio</h4>
          <p className="text-xs text-slate-500">Contracted deliverables, progress status, and target dates</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh services"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>

          <button
            onClick={() => setIsAddServiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View - No Horizontal Scroll, Fixed Proportional Layout */}
          <div className="hidden md:block w-full">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[6%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-700 border-b border-slate-200 font-semibold text-[11px] tracking-tight">
                  <th className="py-2.5 px-2">Service</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2 text-right">Service Fee</th>
                  <th className="py-2.5 px-2 text-right">Govt Fee</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-center">Documents</th>
                  <th className="py-2.5 px-2 text-center">Renewal Status</th>
                  <th className="py-2.5 px-2">Vendor / Outsourcing</th>
                  <th className="py-2.5 px-2">Expected Date</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span className="text-xs">Loading client services...</span>
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
                    const vendorAssignments: any[] = s.vendor_assignments || [];
                    const hasVendors = vendorAssignments.length > 0;
                    const firstVendor = hasVendors ? vendorAssignments[0] : null;
                    const totalVendorCost = vendorAssignments.reduce(
                      (sum, a) => sum + (Number(a.agreed_cost) || 0),
                      0
                    );
                    const { icon: ServiceIcon, color: iconColor } = getServiceIcon(s.service_name || "", s.service_category || "");
                    const renewalBadge = getRenewalStatusBadge(s);
                    const RenewalIcon = renewalBadge.icon;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group h-[76px]">
                        {/* Service Name with icon (13%) - Wraps cleanly onto two lines */}
                        <td className="py-2 px-2 align-middle">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg border flex items-center justify-center shrink-0", iconColor)}>
                              <ServiceIcon size={14} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block leading-snug text-xs line-clamp-2" title={s.service_name}>
                                {s.service_name}
                              </span>
                              {s.notes && (
                                <span className="block text-[10px] text-slate-400 truncate max-w-full font-normal" title={s.notes}>
                                  {s.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category (10%) - Wraps cleanly into 2 lines (e.g. Company Incorporation) */}
                        <td className="py-2 px-2 align-middle text-slate-500 font-normal leading-tight text-[11px]">
                          <span className="block max-w-[90px] whitespace-normal break-words" title={s.service_category || "General"}>
                            {s.service_category || "General"}
                          </span>
                        </td>

                        {/* Service Fee (8%) */}
                        <td className="py-2 px-2 align-middle text-right font-semibold text-slate-900 text-xs">
                          {formatINR(Number(s.service_fee) || 0)}
                        </td>

                        {/* Govt Fee (6%) */}
                        <td className="py-2 px-2 align-middle text-right text-slate-500 text-xs">
                          {formatINR(Number(s.govt_fee) || 0)}
                        </td>

                        {/* Service Status (12%) - Compact Dropdown with Colored Dot - No Overlap */}
                        <td className="py-2 px-1.5 align-middle text-center">
                          <div className="relative inline-flex items-center justify-center">
                            {updatingServiceId === s.id ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <RefreshCw size={10} className="animate-spin text-[#077EA1]" />
                                <span>...</span>
                              </div>
                            ) : (
                              <div className="relative inline-flex items-center">
                                <span className={cn("absolute left-2.5 w-1.5 h-1.5 rounded-full pointer-events-none z-10", getServiceStatusDotColor(s.service_status))} />
                                <select
                                  value={s.service_status || "Pending"}
                                  onChange={(e) => handleStatusChange(s.id, e.target.value, s.service_name)}
                                  className={cn(
                                    "appearance-none cursor-pointer pl-5.5 pr-5 py-1 rounded-full text-[10.5px] font-medium border transition-all shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#077EA1]/40 whitespace-nowrap",
                                    getServiceStatusBadgeStyle(s.service_status)
                                  )}
                                  title="Change service status"
                                >
                                  <option value="Pending" className="bg-white text-slate-800">Pending</option>
                                  <option value="Processing" className="bg-white text-slate-800">Processing</option>
                                  <option value="In Progress" className="bg-white text-slate-800">In Progress</option>
                                  <option value="Waiting for Approval" className="bg-white text-slate-800">Waiting</option>
                                  <option value="Completed" className="bg-white text-slate-800 font-bold text-emerald-700">Completed</option>
                                  <option value="On Hold" className="bg-white text-slate-800">On Hold</option>
                                  <option value="Cancelled" className="bg-white text-slate-800">Cancelled</option>
                                </select>
                                <ChevronDown
                                  size={10}
                                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600"
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Documents Column (7%) */}
                        <td className="py-2 px-2 align-middle text-center">
                          {(() => {
                            const docs = s.documents || [];
                            const isCompleted = s.service_status === "Completed";
                            const hasDocs = docs.length > 0;

                            if (hasDocs) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setDocumentsModalService(s)}
                                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium bg-sky-50 text-[#077EA1] border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                                  title="View or upload attached documents"
                                >
                                  <Paperclip size={10} />
                                  <span>{docs.length}</span>
                                </button>
                              );
                            }

                            if (isCompleted) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setDeliverableModalService(s)}
                                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Service completed: Upload certificate"
                                >
                                  <FileUp size={10} />
                                  <span>Upload</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => setDocumentsModalService(s)}
                                className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#077EA1] font-medium transition-colors cursor-pointer"
                                title="Attach documents"
                              >
                                <Paperclip size={10} />
                                <span>Attach</span>
                              </button>
                            );
                          })()}
                        </td>

                        {/* Renewal Status (10%) - Small, readable badge */}
                        <td className="py-2 px-2 align-middle text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border leading-tight text-center",
                              renewalBadge.className
                            )}
                          >
                            <RenewalIcon size={11} className="shrink-0" />
                            <span className="truncate">{renewalBadge.label}</span>
                          </span>
                        </td>

                        {/* Vendor / Outsourcing Column (12%) - 2 lines */}
                        <td className="py-2 px-2 align-middle">
                          {hasVendors ? (
                            <div className="space-y-0.5 leading-tight">
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-semibold text-slate-800 text-xs truncate" title={firstVendor?.vendor?.name}>
                                  {firstVendor?.vendor?.name || "Vendor"}
                                </span>
                                {vendorAssignments.length > 1 && (
                                  <span className="px-1 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] border border-slate-200 shrink-0">
                                    +{vendorAssignments.length - 1}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                <span className="text-[#077EA1] font-semibold">
                                  {formatINR(totalVendorCost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setManageVendorsService(s)}
                                  className="text-[9px] text-[#077EA1] hover:underline cursor-pointer font-medium ml-auto"
                                >
                                  Manage
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <span className="text-[10px] text-slate-400">Not assigned</span>
                              <button
                                type="button"
                                onClick={() => setVendorModalService(s)}
                                className="inline-flex items-center gap-0.5 text-[10px] text-[#077EA1] hover:text-[#036c88] font-medium hover:underline cursor-pointer self-start"
                              >
                                <Plus size={10} />
                                <span>Assign Vendor</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Expected Date (9%) */}
                        <td className="py-2 px-2 align-middle text-slate-600 font-normal text-[11px] leading-tight">
                          {s.expected_completion_date ? (
                            <span>{s.expected_completion_date}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions Column (12%) - Compact flex row */}
                        <td className="py-2 px-2 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Renew Button - Compact Outlined Green Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setRenewModalService({
                                  id: s.id,
                                  clientId: clientId,
                                  clientName: clientName,
                                  serviceName: s.service_name,
                                  serviceCategory: s.service_category || "General",
                                  renewalDate: s.expected_completion_date || s.renewal_date || new Date().toISOString().split("T")[0],
                                  renewalAmount: Number(s.service_fee) || Number(s.renewal_amount) || 0,
                                  renewalStatus: s.renewal_status || "Upcoming",
                                  salespersonName: "",
                                  paymentStatus: "Unpaid",
                                });
                              }}
                              className="inline-flex items-center gap-0.5 px-2 py-1 bg-white hover:bg-emerald-50/60 text-emerald-700 rounded text-[10px] font-medium transition-colors cursor-pointer border border-emerald-300 shadow-2xs shrink-0"
                              title="Renew Service"
                            >
                              <RefreshCw size={10} className="text-emerald-600 shrink-0" />
                              <span>Renew</span>
                            </button>

                            {/* Renewal History - Small square icon button with tooltip */}
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryModalService({
                                  id: s.id,
                                  service_name: s.service_name,
                                  client_name: clientName,
                                  client_id: clientId,
                                });
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer border border-slate-200 shadow-2xs shrink-0"
                              title="Renewal History"
                            >
                              <History size={11} />
                            </button>

                            {/* Documents - Consistent Document Icon Button with Tooltip */}
                            <button
                              type="button"
                              onClick={() => setDocumentsModalService(s)}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer border border-slate-200 shadow-2xs shrink-0"
                              title="View & Upload Documents / Deliverables"
                            >
                              <FileText size={11} />
                            </button>

                            {/* Delete - Consistent subtle red icon button with tooltip */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemove(s.id)}
                                className="w-6 h-6 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer border border-slate-200 hover:border-rose-200 shadow-2xs shrink-0"
                                title="Remove service"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Responsive Stacked Service-Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                  <span className="text-xs">Loading client services...</span>
                </div>
              </div>
            ) : services.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No individual service deliverables assigned yet. Click &quot;Add Service&quot; to assign one.
              </div>
            ) : (
              services.map((s) => {
                const vendorAssignments: any[] = s.vendor_assignments || [];
                const hasVendors = vendorAssignments.length > 0;
                const firstVendor = hasVendors ? vendorAssignments[0] : null;
                const totalVendorCost = vendorAssignments.reduce(
                  (sum, a) => sum + (Number(a.agreed_cost) || 0),
                  0
                );
                const { icon: ServiceIcon, color: iconColor } = getServiceIcon(s.service_name || "", s.service_category || "");
                const renewalBadge = getRenewalStatusBadge(s);
                const RenewalIcon = renewalBadge.icon;
                const docs = s.documents || [];

                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn("p-1.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5", iconColor)}>
                          <ServiceIcon size={14} />
                        </div>
                        <div>
                          <h5 className="font-semibold text-slate-900 text-xs leading-snug">{s.service_name}</h5>
                          <span className="text-[10px] text-slate-400 block">{s.service_category || "General"}</span>
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shrink-0", renewalBadge.className)}>
                        <RenewalIcon size={10} />
                        <span>{renewalBadge.label}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-50">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Service Fee</span>
                        <span className="font-semibold text-slate-900">{formatINR(Number(s.service_fee) || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Govt Fee</span>
                        <span className="text-slate-600">{formatINR(Number(s.govt_fee) || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Expected Date</span>
                        <span className="text-slate-600">{s.expected_completion_date || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Vendor</span>
                        {hasVendors ? (
                          <span className="text-slate-800 font-medium truncate block">{firstVendor?.vendor?.name}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVendorModalService(s)}
                            className="text-[#077EA1] font-medium text-[10px] hover:underline"
                          >
                            + Assign Vendor
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="relative inline-flex items-center">
                        <span className={cn("absolute left-2 w-1.5 h-1.5 rounded-full pointer-events-none z-10", getServiceStatusDotColor(s.service_status))} />
                        <select
                          value={s.service_status || "Pending"}
                          onChange={(e) => handleStatusChange(s.id, e.target.value, s.service_name)}
                          className={cn(
                            "appearance-none cursor-pointer pl-4.5 pr-4 py-1 rounded-full text-[10px] font-medium border",
                            getServiceStatusBadgeStyle(s.service_status)
                          )}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Waiting for Approval">Waiting</option>
                          <option value="Completed">Completed</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRenewModalService({
                              id: s.id,
                              clientId: clientId,
                              clientName: clientName,
                              serviceName: s.service_name,
                              serviceCategory: s.service_category || "General",
                              renewalDate: s.expected_completion_date || s.renewal_date || new Date().toISOString().split("T")[0],
                              renewalAmount: Number(s.service_fee) || Number(s.renewal_amount) || 0,
                              renewalStatus: s.renewal_status || "Upcoming",
                              salespersonName: "",
                              paymentStatus: "Unpaid",
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium border border-emerald-300"
                        >
                          <RefreshCw size={10} />
                          <span>Renew</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryModalService({
                              id: s.id,
                              service_name: s.service_name,
                              client_name: clientName,
                              client_id: clientId,
                            });
                          }}
                          className="p-1 bg-white border border-slate-200 rounded text-slate-600"
                          title="History"
                        >
                          <History size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocumentsModalService(s)}
                          className="p-1 bg-white border border-slate-200 rounded text-slate-600"
                          title="Documents"
                        >
                          <FileText size={12} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemove(s.id)}
                            className="p-1 bg-white border border-slate-200 rounded text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Service Deliverable Modal */}
      <AssignServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onSuccess={() => loadData()}
        clientId={clientId}
        clientName={clientName}
      />

      {/* Assign Vendor to Service Modal */}
      {vendorModalService && (
        <AssignVendorModal
          isOpen={!!vendorModalService}
          onClose={() => setVendorModalService(null)}
          onSuccess={() => {
            setVendorModalService(null);
            loadData();
          }}
          clientServiceId={vendorModalService.id}
          serviceName={vendorModalService.service_name}
          serviceFee={Number(vendorModalService.service_fee) || 0}
          clientName={clientName}
          existingVendorIds={(vendorModalService.vendor_assignments || []).map((a: any) => a.vendor_id)}
        />
      )}

      {/* Manage Service Vendors Modal */}
      {manageVendorsService && (
        <ManageServiceVendorsModal
          isOpen={!!manageVendorsService}
          onClose={() => setManageVendorsService(null)}
          onRefresh={() => loadData(true)}
          onOpenAssignVendor={() => {
            setVendorModalService(manageVendorsService);
            setManageVendorsService(null);
          }}
          service={manageVendorsService}
          clientName={clientName}
        />
      )}

      {/* Renew Service Modal */}
      {renewModalService && (
        <RenewServiceModal
          isOpen={!!renewModalService}
          onClose={() => setRenewModalService(null)}
          onSuccess={() => {
            setRenewModalService(null);
            loadData();
          }}
          renewal={renewModalService}
        />
      )}

      {/* Renewal History Modal */}
      {historyModalService && (
        <RenewalHistoryModal
          isOpen={!!historyModalService}
          onClose={() => setHistoryModalService(null)}
          serviceId={historyModalService.id}
          serviceName={historyModalService.service_name}
          clientName={historyModalService.client_name}
        />
      )}

      {/* Upload Service Deliverable Modal (triggered on Completed status or + Certificate) */}
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
          clientName={clientName}
        />
      )}

      {/* Comprehensive Service Documents Modal (view, preview, download, delete, upload) */}
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
    </div>
  );
}
