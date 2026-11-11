"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search, Layers, CheckCircle2, Clock, Trash2, Power, RefreshCw } from "lucide-react";
import { fetchServicesCatalogAction, toggleCatalogServiceAction } from "@/app/actions/services";
import { formatINR } from "@/lib/utils";
import { AddCatalogServiceModal } from "@/components/services/AddCatalogServiceModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function ServicesPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchServicesCatalogAction();
      if (currentReqId === requestIdRef.current) {
        setCatalog(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load services catalog.");
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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    // Optimistic toggle
    setCatalog((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s))
    );

    try {
      const res = await toggleCatalogServiceAction(id, currentStatus);
      if (res.error) {
        toastError("Status update failed", res.error);
        loadData();
      } else {
        success("Service updated", `Service status set to ${!currentStatus ? "Active" : "Inactive"}.`);
        loadData();
      }
    } catch {
      toastError("Status update failed", "Server connection error.");
      loadData();
    }
  };

  const filteredServices = catalog.filter((s) => {
    if (categoryFilter !== "All" && s.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Services Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standard company offerings, regulatory packages, professional fees, and renewals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh services"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Service to Catalog</span>
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
            placeholder="Search service name, description, or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">All Categories</option>
          <option value="Company Incorporation">Company Incorporation</option>
          <option value="GST & Tax Filing">GST & Tax Filing</option>
          <option value="Intellectual Property">Intellectual Property</option>
          <option value="Accounting & Audit">Accounting & Audit</option>
          <option value="Web & Technology">Web & Technology</option>
          <option value="General">General</option>
        </select>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Services Table */}
      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Default Service Fee</th>
                  <th className="py-3 px-4 text-right">Default Govt Fee</th>
                  <th className="py-3 px-4 text-right">Total Est. Price</th>
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
                        <span>Loading services catalog...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No services found in catalog. Click &quot;Add Service to Catalog&quot; to define offerings.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{s.name}</span>
                        {s.description && (
                          <span className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{s.description}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{s.category}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatINR(Number(s.default_service_fee) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {formatINR(Number(s.default_govt_fee) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#077EA1]">
                        {formatINR((Number(s.default_service_fee) || 0) + (Number(s.default_govt_fee) || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {s.is_active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(s.id, s.is_active)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            s.is_active ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={s.is_active ? "Archive Service" : "Activate Service"}
                        >
                          <Power size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCatalogServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
