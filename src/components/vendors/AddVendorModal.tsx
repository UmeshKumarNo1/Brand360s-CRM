"use client";

import { useActionState, useEffect, useRef } from "react";
import { Store, X, Loader2, Phone, Mail, User } from "lucide-react";
import { createVendorAction, updateVendorAction } from "@/app/actions/vendors";
import { useToast } from "@/components/common/ToastProvider";

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newVendor?: any) => void;
  vendorToEdit?: any | null;
}

export function AddVendorModal({ isOpen, onClose, onSuccess, vendorToEdit }: AddVendorModalProps) {
  const isEditing = Boolean(vendorToEdit);
  const actionToUse = isEditing ? updateVendorAction : createVendorAction;
  const [state, formAction, isPending] = useActionState(actionToUse, null);
  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success(
        isEditing ? "Vendor updated" : "Vendor created",
        `${isEditing ? "Updated" : "Created"} vendor record successfully.`
      );
      onSuccess(state.vendor);
      onClose();
    } else if (state.error) {
      toastError("Failed to save vendor", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError, isEditing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <Store size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEditing ? "Edit External Vendor" : "Add External Vendor"}
              </h3>
              <p className="text-[11px] text-slate-500">Partner agency, legal associate, or notary</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form action={formAction} className="p-6 space-y-4 text-xs">
          {isEditing && <input type="hidden" name="vendor_id" value={vendorToEdit.id} />}

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vendor / Agency Name *</label>
            <input
              name="name"
              required
              type="text"
              defaultValue={vendorToEdit?.name || ""}
              placeholder="e.g. Apex Notary Services"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                name="category"
                defaultValue={vendorToEdit?.category || "Legal & IP"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Legal & IP">Legal & IP</option>
                <option value="Chartered Accountant">Chartered Accountant</option>
                <option value="Notary & Stamping">Notary & Stamping</option>
                <option value="Web & Technology">Web & Technology</option>
                <option value="Digital Signature">Digital Signature</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                name="contact_person"
                type="text"
                defaultValue={vendorToEdit?.contactPerson === "-" ? "" : vendorToEdit?.contactPerson || ""}
                placeholder="e.g. Adv. R. Verma"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                name="phone"
                type="text"
                defaultValue={vendorToEdit?.phone === "-" ? "" : vendorToEdit?.phone || ""}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                defaultValue={vendorToEdit?.email === "-" ? "" : vendorToEdit?.email || ""}
                placeholder="partner@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Services Provided / Scope</label>
            <input
              name="services_provided"
              type="text"
              defaultValue={vendorToEdit?.servicesProvided === "-" ? "" : vendorToEdit?.servicesProvided || ""}
              placeholder="e.g. Trademark searches, Stamp paper franking..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={vendorToEdit?.notes || ""}
              placeholder="Standard fee structure, turn-around times, etc."
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
                  <span>{isEditing ? "Updating..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isEditing ? "Update Vendor" : "Add Vendor"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
