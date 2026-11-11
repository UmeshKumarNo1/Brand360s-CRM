"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { Plus, X, Loader2, Layers } from "lucide-react";
import { assignClientServiceAction, fetchServicesCatalogAction } from "@/app/actions/services";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

interface AssignServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
}

export function AssignServiceModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
}: AssignServiceModalProps) {
  const [state, formAction, isPending] = useActionState(assignClientServiceAction, null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null);
  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchServicesCatalogAction().then((data) => setCatalog(data || []));
      fetchSalespeopleAction().then((data) => setSalespeople(data || []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success("Service assigned", "Deliverable successfully assigned to client.");
      onSuccess();
      onClose();
    } else if (state.error) {
      toastError("Failed to assign service", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  const handleCatalogChange = (serviceName: string) => {
    const item = catalog.find((c) => c.name === serviceName);
    setSelectedCatalogItem(item || null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assign Service Deliverable</h3>
              <p className="text-[11px] text-slate-500">{clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          <input type="hidden" name="client_id" value={clientId} />

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          {/* Quick Select from Catalog */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pick from Services Catalog</label>
            <select
              onChange={(e) => handleCatalogChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
            >
              <option value="">Select a catalog template or enter custom...</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
              <input
                name="service_name"
                required
                type="text"
                defaultValue={selectedCatalogItem?.name || ""}
                placeholder="e.g. GST Registration"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                name="service_category"
                value={selectedCatalogItem?.category || "General"}
                onChange={(e) =>
                  setSelectedCatalogItem({
                    ...selectedCatalogItem,
                    category: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Company Incorporation">Company Incorporation</option>
                <option value="GST & Tax Filing">GST & Tax Filing</option>
                <option value="Intellectual Property">Intellectual Property</option>
                <option value="Accounting & Audit">Accounting & Audit</option>
                <option value="Web & Technology">Web & Technology</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Professional / Service Fee (₹)</label>
              <input
                name="service_fee"
                type="number"
                step="any"
                defaultValue={selectedCatalogItem?.default_service_fee || 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Government Fee (₹)</label>
              <input
                name="govt_fee"
                type="number"
                step="any"
                defaultValue={selectedCatalogItem?.default_govt_fee || 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Executive</label>
              <select
                name="assigned_employee_id"
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
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                name="service_status"
                defaultValue="Pending"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Pending">Pending (Not Started)</option>
                <option value="Processing">Processing / In Progress</option>
                <option value="Awaiting Documents">Awaiting Documents</option>
                <option value="Under Review">Under Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                name="start_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Completion</label>
              <input
                name="expected_completion_date"
                type="date"
                defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Special Client Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Expedited filing requested..."
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
              disabled={isPending}
              className="px-4 py-1.5 font-semibold text-white bg-[#0481A2] hover:bg-[#036c88] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Confirm Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
