"use client";

import { useActionState, useEffect, useState, useMemo } from "react";
import { UserCheck, X, Loader2, Store, Search, AlertCircle, IndianRupee } from "lucide-react";
import { assignVendorToClientServiceAction } from "@/app/actions/serviceVendors";
import { fetchVendorsAction } from "@/app/actions/vendors";
import { useToast } from "@/components/common/ToastProvider";
import { formatINR } from "@/lib/utils";

interface AssignVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAssignment?: any) => void;
  clientServiceId: string;
  serviceName: string;
  serviceFee: number;
  clientName: string;
  existingVendorIds?: string[];
}

export function AssignVendorModal({
  isOpen,
  onClose,
  onSuccess,
  clientServiceId,
  serviceName,
  serviceFee,
  clientName,
  existingVendorIds = [],
}: AssignVendorModalProps) {
  const [state, formAction, isPending] = useActionState(assignVendorToClientServiceAction, null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [agreedCostInput, setAgreedCostInput] = useState<string>("");
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoadingVendors(true);
      fetchVendorsAction()
        .then((res) => setVendors(res.data || []))
        .finally(() => setIsLoadingVendors(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (state?.success) {
      success("Vendor assigned", "Partner successfully linked to service deliverable.");
      onSuccess(state.assignment);
      onClose();
    } else if (state?.error) {
      toastError("Failed to assign vendor", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  // Filter only active vendors and filter by search term
  const activeVendors = useMemo(() => {
    return vendors.filter((v) => v.status === "Active");
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return activeVendors;
    const q = vendorSearch.toLowerCase();
    return activeVendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q))
    );
  }, [activeVendors, vendorSearch]);

  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId);
  }, [vendors, selectedVendorId]);

  const numericCost = parseFloat(agreedCostInput) || 0;
  const isCostExceeding = numericCost > serviceFee && serviceFee > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <UserCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assign Vendor to Service</h3>
              <p className="text-[11px] text-slate-500">
                Client: <strong className="text-slate-700">{clientName}</strong> • Service:{" "}
                <strong className="text-slate-700">{serviceName}</strong> (Fee: {formatINR(serviceFee)})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          <input type="hidden" name="client_service_id" value={clientServiceId} />

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{state.error}</span>
            </div>
          )}

          {/* Searchable Vendor Dropdown / Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Select Vendor / Partner *</label>
              <span className="text-[10px] text-slate-400">{activeVendors.length} active vendors</span>
            </div>

            {isLoadingVendors ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-center">
                Loading vendors directory...
              </div>
            ) : activeVendors.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                No active vendors found. Add a vendor from the Vendors & Partners module first.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search Box */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Search vendor by name, category, or contact..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1] text-xs"
                  />
                </div>

                {/* Dropdown Select */}
                <select
                  name="vendor_id"
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
                >
                  <option value="">Select a partner vendor...</option>
                  {filteredVendors.map((v) => {
                    const isAlreadyAssigned = existingVendorIds.includes(v.id);
                    return (
                      <option key={v.id} value={v.id} disabled={isAlreadyAssigned}>
                        {v.name} ({v.category}) — {v.contactPerson !== "-" ? v.contactPerson : v.phone}
                        {isAlreadyAssigned ? " [Already Assigned]" : ""}
                      </option>
                    );
                  })}
                </select>

                {selectedVendor && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <strong>Vendor:</strong> {selectedVendor.name}{" "}
                      <span className="text-slate-400">({selectedVendor.category})</span>
                    </p>
                    <p>
                      <strong>Contact:</strong> {selectedVendor.contactPerson} • {selectedVendor.phone}
                    </p>
                    {selectedVendor.email && selectedVendor.email !== "-" && (
                      <p>
                        <strong>Email:</strong> {selectedVendor.email}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Agreed Vendor Cost */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Agreed Vendor Cost (₹) *</label>
              <input
                name="agreed_cost"
                type="number"
                step="any"
                min="0"
                required
                value={agreedCostInput}
                onChange={(e) => setAgreedCostInput(e.target.value)}
                placeholder="e.g. 8000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
              />
            </div>

            {/* Vendor Payment Status */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vendor Payment Status</label>
              <select
                name="payment_status"
                defaultValue="Pending"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Cost vs Fee Warning */}
          {isCostExceeding && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" />
              <span>
                Warning: Agreed vendor cost ({formatINR(numericCost)}) exceeds the client service fee (
                {formatINR(serviceFee)}).
              </span>
            </div>
          )}

          {/* Preliminary Margin Summary */}
          {numericCost > 0 && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
              <span>Client Service Fee: <strong>{formatINR(serviceFee)}</strong></span>
              <span>
                Preliminary Margin:{" "}
                <strong className={serviceFee - numericCost < 0 ? "text-rose-600" : "text-emerald-600"}>
                  {formatINR(serviceFee - numericCost)}
                </strong>
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Outsourcing Notes / Scope</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Website development outsourced to rajaoverseas; due in 10 days..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-xs"
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
              disabled={isPending || !selectedVendorId}
              className="px-4 py-1.5 font-semibold text-white bg-[#077EA1] hover:bg-[#066B89] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign Vendor</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
