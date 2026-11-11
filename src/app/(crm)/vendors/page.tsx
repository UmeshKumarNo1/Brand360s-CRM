"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Store, Search, Plus, CheckCircle2, Phone, Mail, Power, Trash2, Edit2, RefreshCw } from "lucide-react";
import { fetchVendorsAction, toggleVendorStatusAction, deleteVendorAction } from "@/app/actions/vendors";
import { AddVendorModal } from "@/components/vendors/AddVendorModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetchVendorsAction();
      // Only commit if this is the newest request
      if (currentReqId === requestIdRef.current) {
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setVendors(res.data || []);
        }
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load vendors.");
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (id: string, currentStatus: string) => {
    // Optimistic UI update
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: nextStatus } : v))
    );

    try {
      const res = await toggleVendorStatusAction(id, currentStatus);
      if (res.error) {
        toastError("Status update failed", res.error);
        loadData(); // rollback
      } else {
        success("Vendor updated", `Status set to ${nextStatus}.`);
      }
    } catch {
      toastError("Status update failed", "Could not reach server.");
      loadData();
    }
  };

  const handleDelete = async (vendor: any) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) return;

    // Optimistic delete
    setVendors((prev) => prev.filter((v) => v.id !== vendor.id));

    try {
      const res = await deleteVendorAction(vendor.id);
      if (res.error) {
        toastError("Failed to delete vendor", res.error);
        loadData(); // rollback
      } else {
        success("Vendor removed", `Vendor "${vendor.name}" was successfully removed.`);
      }
    } catch {
      toastError("Failed to delete vendor", "Could not reach server.");
      loadData();
    }
  };

  const handleModalSuccess = (savedVendor?: any) => {
    loadData();
  };

  const filteredVendors = vendors.filter((v) => {
    if (statusFilter !== "All" && v.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Vendors & Partners</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage external legal associates, chartered accountants, notaries, and service cost allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh vendors"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => {
              setVendorToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor by name, contact, or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">Status: All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Vendors Table */}
      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-center">Active Jobs</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span>Loading vendors directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No vendors found. Click &quot;Add Vendor&quot; to register a partner.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v) => (
                    <tr key={v.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {v.name}
                        {v.servicesProvided && v.servicesProvided !== "-" && (
                          <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                            {v.servicesProvided}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {v.category}
                      </td>

                      {/* Contact Person */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {v.contactPerson}
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 text-slate-500 text-xs space-y-0.5">
                        <p className="flex items-center gap-1.5">
                          <Phone size={12} className="text-[#077EA1]" /> {v.phone}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" /> {v.email}
                        </p>
                      </td>

                      {/* Active Jobs */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {v.assignmentsCount}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          v.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {v.status === "Active" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setVendorToEdit(v);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Vendor"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleToggle(v.id, v.status)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              v.status === "Active"
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={v.status === "Active" ? "Deactivate Vendor" : "Activate Vendor"}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Vendor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddVendorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setVendorToEdit(null);
        }}
        onSuccess={handleModalSuccess}
        vendorToEdit={vendorToEdit}
      />
    </div>
  );
}
