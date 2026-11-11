"use client";

import { useActionState, useEffect, useRef } from "react";
import { Layers, X, Loader2, IndianRupee } from "lucide-react";
import { createCatalogServiceAction } from "@/app/actions/services";
import { useToast } from "@/components/common/ToastProvider";

interface AddCatalogServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCatalogServiceModal({ isOpen, onClose, onSuccess }: AddCatalogServiceModalProps) {
  const [state, formAction, isPending] = useActionState(createCatalogServiceAction, null);
  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success("Service added to catalog", "New service offering created successfully.");
      onSuccess();
      onClose();
    } else if (state.error) {
      toastError("Failed to add service", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Service to Catalog</h3>
              <p className="text-[11px] text-slate-500">Define standard service offering & pricing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form action={formAction} className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
            <input
              name="name"
              required
              type="text"
              placeholder="e.g. Private Limited Company Registration"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category</label>
            <select
              name="category"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
            >
              <option value="Company Incorporation">Company Incorporation</option>
              <option value="GST & Tax Filing">GST & Tax Filing</option>
              <option value="Intellectual Property">Intellectual Property</option>
              <option value="Accounting & Audit">Accounting & Audit</option>
              <option value="Web & Technology">Web & Technology</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Service Fee (₹)</label>
              <input
                name="default_service_fee"
                type="number"
                step="any"
                placeholder="15000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Govt Fee (₹)</label>
              <input
                name="default_govt_fee"
                type="number"
                step="any"
                placeholder="5000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Description</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Scope of work, deliverables, and typical requirements..."
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
              className="px-4 py-1.5 font-semibold text-white bg-[#077EA1] hover:bg-[#066B89] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Adding Service...</span>
                </>
              ) : (
                <span>Add to Catalog</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
