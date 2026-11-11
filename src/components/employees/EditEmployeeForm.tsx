"use client";

import { useActionState, useEffect } from "react";
import { updateEmployeeProfileAction } from "@/app/actions/employees";
import { Loader2, Save } from "lucide-react";

interface EditEmployeeFormProps {
  profile: any;
}

export function EditEmployeeForm({ profile }: EditEmployeeFormProps) {
  const [state, formAction, isPending] = useActionState(updateEmployeeProfileAction, null);

  return (
    <form action={formAction} className="space-y-4 text-xs">
      <input type="hidden" name="employee_id" value={profile.id} />

      {state?.error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">
          Staff member profile updated successfully.
        </div>
      )}

      <div>
        <label className="block font-medium text-slate-700 mb-1">Full Name</label>
        <input
          name="full_name"
          required
          type="text"
          defaultValue={profile.full_name}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#077EA1]"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Email (Read Only)</label>
        <input
          disabled
          type="email"
          defaultValue={profile.email}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 font-mono"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Phone</label>
        <input
          name="phone"
          type="tel"
          defaultValue={profile.phone || ""}
          placeholder="+91 98765 43210"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#077EA1]"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Role</label>
        <select
          name="role"
          defaultValue={profile.role}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
        >
          <option value="employee">Employee / Marketing</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <div>
        <label className="block font-medium text-slate-700 mb-1">Account Status</label>
        <select
          name="is_active"
          defaultValue={profile.is_active ? "true" : "false"}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
        >
          <option value="true">Active (Can log in)</option>
          <option value="false">Deactivated (Blocked)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 bg-[#077EA1] hover:bg-[#066B89] text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Updating...</span>
          </>
        ) : (
          <>
            <Save size={14} />
            <span>Update Staff Member</span>
          </>
        )}
      </button>
    </form>
  );
}

