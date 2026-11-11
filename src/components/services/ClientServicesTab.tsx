"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Layers, Trash2, UserCheck, RefreshCw, Store } from "lucide-react";
import { fetchClientServicesAction, removeClientServiceAction } from "@/app/actions/services";
import { formatINR } from "@/lib/utils";
import { AssignServiceModal } from "@/components/services/AssignServiceModal";
import { AssignVendorModal } from "@/components/vendors/AssignVendorModal";
import { ManageServiceVendorsModal } from "@/components/vendors/ManageServiceVendorsModal";
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

  // Modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(Boolean(initialAddService));
  const [vendorModalService, setVendorModalService] = useState<any | null>(null);
  const [manageVendorsService, setManageVendorsService] = useState<any | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchClientServicesAction(clientId);
      if (currentReqId === requestIdRef.current) {
        setServices(data || []);

        // Also update manageVendorsService if it was open
        if (manageVendorsService) {
          const updated = (data || []).find((s: any) => s.id === manageVendorsService.id);
          if (updated) setManageVendorsService(updated);
        }
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load client services.");
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [clientId, manageVendorsService]);

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Service Fee</th>
                  <th className="py-2.5 px-3 text-right">Govt Fee</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Vendor / Outsourcing</th>
                  <th className="py-2.5 px-3">Expected Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={13} className="animate-spin text-[#0481A2]" />
                        <span>Loading client services...</span>
                      </div>
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
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

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        {/* Service Name */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {s.service_name}
                          {s.notes && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-xs font-normal">
                              {s.notes}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3 text-slate-500">{s.service_category || "General"}</td>

                        {/* Service Fee */}
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                          {formatINR(Number(s.service_fee) || 0)}
                        </td>

                        {/* Govt Fee */}
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatINR(Number(s.govt_fee) || 0)}
                        </td>

                        {/* Service Status */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700">
                            {s.service_status}
                          </span>
                        </td>

                        {/* Vendor / Outsourcing Column */}
                        <td className="py-2.5 px-3">
                          {hasVendors ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {firstVendor?.vendor?.name || "Vendor"}
                                </span>
                                {vendorAssignments.length > 1 && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                                    +{vendorAssignments.length - 1} more
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-[#0481A2] font-bold">
                                  Cost: {formatINR(totalVendorCost)}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getVendorStatusBadge(
                                    firstVendor?.payment_status
                                  )}`}
                                >
                                  {firstVendor?.payment_status}
                                </span>
                              </div>

                              <div>
                                <button
                                  onClick={() => setManageVendorsService(s)}
                                  className="text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer"
                                >
                                  Manage Vendors ({vendorAssignments.length})
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] text-slate-400 italic">No vendor assigned</span>
                              <button
                                onClick={() => setVendorModalService(s)}
                                className="text-[11px] text-[#0481A2] hover:underline font-semibold cursor-pointer self-start"
                              >
                                + Assign Vendor
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Expected Date */}
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {s.expected_completion_date || "-"}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (hasVendors) {
                                  setManageVendorsService(s);
                                } else {
                                  setVendorModalService(s);
                                }
                              }}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                              title={hasVendors ? "Manage Outsourcing" : "Assign External Vendor"}
                            >
                              <Store size={12} />
                              <span>{hasVendors ? "Vendors" : "+ Vendor"}</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleRemove(s.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Remove service"
                              >
                                <Trash2 size={13} />
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
          onRefresh={() => loadData()}
          onOpenAssignVendor={() => {
            setVendorModalService(manageVendorsService);
            setManageVendorsService(null);
          }}
          service={manageVendorsService}
          clientName={clientName}
        />
      )}
    </div>
  );
}
