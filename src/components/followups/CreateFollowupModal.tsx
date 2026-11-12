"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckSquare, X, Loader2, Calendar, Clock, AlertTriangle, User, Phone, Bell } from "lucide-react";
import { createFollowupAction, updateFollowupAction } from "@/app/actions/followups";
import { fetchClientsAction, fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

const FOLLOWUP_TYPES = [
  "Call",
  "Email",
  "Meeting",
  "Document Collection",
  "Payment Reminder",
  "General",
];

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];
const REMINDER_OPTIONS = [
  { value: "none", label: "No reminder" },
  { value: "on_due_date", label: "On due date (Morning 9:00 AM)" },
  { value: "1_day_before", label: "1 day before" },
  { value: "3_days_before", label: "3 days before" },
];

interface FollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "create" | "edit";
  initialData?: any | null;
  defaultClientId?: string;
  defaultClientName?: string;
  isAdmin?: boolean;
}

export function CreateFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData,
  defaultClientId,
  defaultClientName,
  isAdmin = false,
}: FollowupModalProps) {
  const isEdit = mode === "edit" && !!initialData?.id;
  const actionToUse = isEdit ? updateFollowupAction : createFollowupAction;
  const [state, formAction, isPending] = useActionState(actionToUse, null);

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>("");

  const { success, error: toastError } = useToast();

  // Load clients and employees
  useEffect(() => {
    if (isOpen) {
      fetchClientsAction().then((data) => {
        // Exclude archived clients for new followups unless editing
        const available = isEdit ? data : (data || []).filter((c: any) => c.client_status !== "Archived");
        setClients(available || []);
      });

      if (isAdmin) {
        fetchSalespeopleAction().then((data) => {
          setEmployees(data || []);
        });
      }
    }
  }, [isOpen, isEdit, isAdmin]);

  // Sync initial selections
  useEffect(() => {
    if (isOpen) {
      const cId = initialData?.clientId || initialData?.client_id || defaultClientId || "";
      setSelectedClientId(cId);

      const aId = initialData?.assignedToId || initialData?.assigned_to || "";
      setSelectedAssignedTo(aId);
    }
  }, [isOpen, initialData, defaultClientId]);

  // Handle successful submission
  useEffect(() => {
    if (state?.success) {
      success(
        isEdit ? "Follow-up Updated" : "Follow-up Created",
        isEdit ? "Changes saved successfully." : "New reminder task added."
      );
      onSuccess();
      onClose();
    } else if (state?.error) {
      toastError("Failed to save follow-up", state.error);
    }
  }, [state, isEdit, success, toastError, onSuccess, onClose]);

  if (!isOpen) return null;

  const resolvedTitle = initialData?.title || "";
  const resolvedType = initialData?.followUpType || initialData?.type || "Phone Call";
  const resolvedDueDate = initialData?.dueDate || initialData?.due_date || new Date().toISOString().split("T")[0];
  const resolvedDueTime = initialData?.dueTime || initialData?.due_time || "";
  const resolvedPriority = initialData?.priority || "Medium";
  const resolvedStatus = initialData?.status || "Pending";
  const resolvedNotes = initialData?.notes || initialData?.description || "";
  const resolvedContactPerson = initialData?.contactPerson || initialData?.contact_person || "";
  const resolvedContactMethod = initialData?.contactMethod || initialData?.contact_method || "Phone";
  const resolvedReminder = initialData?.reminderSetting || initialData?.reminder_setting || "none";

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-slate-100 bg-[#F0F8FA]">
          <div className="p-2.5 bg-[#E0F2F7] text-[#0481A2] rounded-xl shrink-0">
            <CheckSquare size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {isEdit ? "Edit Follow-up Task" : "Create Follow-up Reminder"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? "Update communication schedules, status, or details" : "Schedule a reminder, client call, or compliance milestone"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {isEdit && <input type="hidden" name="id" value={initialData.id} />}

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 font-medium">
              <AlertTriangle size={15} className="shrink-0 text-red-500" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Follow-up Title *
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={resolvedTitle}
              placeholder="e.g. Call regarding GST certificate & payment"
              className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                state?.fieldErrors?.title ? "border-red-300 bg-red-50/30" : "border-slate-200"
              }`}
            />
            {state?.fieldErrors?.title && (
              <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.title}</p>
            )}
          </div>

          {/* Client Selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Associated Client *
            </label>
            {defaultClientId && !isEdit ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold">
                {defaultClientName || "Selected Client"}
                <input type="hidden" name="client_id" value={defaultClientId} />
              </div>
            ) : (
              <select
                name="client_id"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer ${
                  state?.fieldErrors?.client_id ? "border-red-300" : "border-slate-200"
                }`}
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_code})
                    {c.client_status === "Archived" ? " [Archived]" : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Display Selected Client quick info */}
            {selectedClient && (
              <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span>Contact: <strong className="text-slate-800">{selectedClient.contact_person}</strong></span>
                <span>Phone: <strong className="text-slate-800">{selectedClient.phone}</strong></span>
                <span>Lead: <strong className="text-slate-800">{selectedClient.assigned_profile?.full_name || "Unassigned"}</strong></span>
              </div>
            )}
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Follow-up Type *
              </label>
              <select
                name="follow_up_type"
                defaultValue={resolvedType}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {FOLLOWUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Priority *
              </label>
              <select
                name="priority"
                defaultValue={resolvedPriority}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Due Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="due_date"
                  required
                  defaultValue={resolvedDueDate}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Due Time (Optional)
              </label>
              <input
                type="time"
                name="due_time"
                defaultValue={resolvedDueTime}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Assignment (Admin Reassignment) & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                <span>Assigned Employee</span>
                {isAdmin && <span className="text-[10px] text-slate-400 font-normal">Admin Override</span>}
              </label>
              {isAdmin ? (
                <select
                  name="assigned_to"
                  value={selectedAssignedTo}
                  onChange={(e) => setSelectedAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                >
                  <option value="">Auto-assign Current User</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.role === "admin" ? "Admin" : "Sales"})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <User size={13} className="text-[#0481A2]" />
                  <span>Assigned to You</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={resolvedStatus}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Details & Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Contact Person & Method
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="contact_person"
                  defaultValue={resolvedContactPerson}
                  placeholder="e.g. Rahul (Director)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                />
                <select
                  name="contact_method"
                  defaultValue={resolvedContactMethod}
                  className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="Phone">Phone</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="In-person">In-person</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <Bell size={12} className="text-slate-400" />
                <span>Reminder Setting</span>
              </label>
              <select
                name="reminder_setting"
                defaultValue={resolvedReminder}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {REMINDER_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Internal Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Description & Internal Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={resolvedNotes}
              placeholder="Add key discussion topics, documents requested, or action items..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  <span>{isEdit ? "Update Follow-up" : "Create Follow-up"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
