"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus, X, Loader2, Shield, Mail, Lock, Phone } from "lucide-react";
import { createEmployeeAction } from "@/app/actions/employees";
import { useToast } from "@/components/common/ToastProvider";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [state, formAction, isPending] = useActionState(createEmployeeAction, null);
  const { success, error: toastError } = useToast();
  const handledStateRef = useRef<any>(null);

  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success) {
      success("Employee added", "Employee account created and linked to profile.");
      onSuccess();
      onClose();
    } else if (state.error) {
      toastError("Failed to add employee", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Team Member</h3>
              <p className="text-[11px] text-slate-500">Create employee login and CRM credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              name="full_name"
              required
              type="text"
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company Email *</label>
            <input
              name="email"
              required
              type="email"
              placeholder="ramesh@brand360s.co"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
            <input
              name="password"
              required
              type="password"
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                name="phone"
                type="text"
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role *</label>
              <select
                name="role"
                defaultValue="employee"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="employee">Marketing / Sales Employee</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Employee</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
