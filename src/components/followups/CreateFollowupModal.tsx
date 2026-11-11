"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckSquare, X, Loader2, Calendar, Clock, AlertTriangle, User } from "lucide-react";
import { createFollowupAction, updateFollowupAction } from "@/app/actions/followups";
import { fetchClientsAction } from "@/app/actions/clients";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

interface FollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "create" | "edit";
  initialData?: {
    id?: string;
    clientId?: string;
    client_id?: string;
    assignedToId?: string;
    assigned_to?: string;
    title?: string;
    followUpType?: string;
    type?: string;
    due_date?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    notes?: string;
    description?: string;
  } | null;
  defaultClientId?: string;
  defaultClientName?: string;
}

export function CreateFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData,
  defaultClientId,
  defaultClientName,
}: FollowupModalProps) {
  const isEdit = mode === "edit" && !!initialData?.id;
  const actionToUse = isEdit ? updateFollowupAction : createFollowupAction;
  const [state, formAction, isPending] = useActionState(actionToUse, null);

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const { success, error: toastError } = useToast();

  // Form values state for reliable prefill during edit mode
  const resolvedClientId = initialData?.clientId || initialData?.client_id || defaultClientId || "";
  const resolvedAssignedTo = initialData?.assignedToId || initialData?.assigned_to || "";
  const resolvedTitle = initialData?.title || "";
  const resolvedType = initialData?.followUpType || initialData?.type || "Call";
  const resolvedDueDate = initialData?.dueDate || initialData?.due_date || new Date().toISOString().split("T")[0];
  const resolvedPriority = initialData?.priority || "Medium";
  const resolvedStatus = initialData?.status || "Pending";
  const resolvedNotes = initialData?.notes || initialData?.description || "";

  const [clientId, setClientId] = useState(resolvedClientId);
  const [assignedTo, setAssignedTo] = useState(resolvedAssignedTo);
  const [title, setTitle] = useState(resolvedTitle);
  const [followUpType, setFollowUpType] = useState(resolvedType);
  const [dueDate, setDueDate] = useState(resolvedDueDate);
  const [priority, setPriority] = useState(resolvedPriority);
  const [status, setStatus] = useState(resolvedStatus);
  const [notes, setNotes] = useState(resolvedNotes);

  useEffect(() => {
    if (isOpen) {
      // Re-sync values when opening
      setClientId(initialData?.clientId || initialData?.client_id || defaultClientId || "");
      setAssignedTo(initialData?.assignedToId || initialData?.assigned_to || "");
      setTitle(initialData?.title || "");
      setFollowUpType(initialData?.followUpType || initialData?.type || "Call");
      setDueDate(initialData?.dueDate || initialData?.due_date || new Date().toISOString().split("T")[0]);
      setPriority(initialData?.priority || "Medium");
      setStatus(initialData?.status || "Pending");
      setNotes(initialData?.notes || initialData?.description || "");

      // Load clients if not pre-bound
      fetchClientsAction().then((data) => setClients(data || []));
      fetchSalespeopleAction().then((data) => setEmployees(data || []));
    }
  }, [isOpen, initialData, defaultClientId]);

  useEffect(() => {
    if (state?.success) {
      success(
        isEdit ? "Follow-up updated" : "Follow-up created",
        isEdit ? "Changes saved successfully." : "Reminder scheduled successfully."
      );
      onSuccess();
      onClose();
    } else if (state?.error) {
      toastError(isEdit ? "Failed to update follow-up" : "Failed to schedule follow-up", state.error);
    }
  }, [state, onSuccess, onClose, success, toastError, isEdit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <CheckSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEdit ? "Edit Follow-up Task" : "Create Follow-up Reminder"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isEdit ? "Modify task details, deadlines, and assignment" : "Document requests, status check-ins, calls"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form action={formAction} className="p-6 space-y-4 text-xs">
          {/* Hidden ID if editing */}
          {isEdit && <input type="hidden" name="id" value={initialData?.id} />}

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold">
              {state.error}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Associated Client *</label>
            {defaultClientId ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold flex items-center justify-between">
                <span>{defaultClientName || "Selected Client"}</span>
                <input type="hidden" name="client_id" value={defaultClientId} />
              </div>
            ) : (
              <select
                name="client_id"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1] font-medium"
              >
                <option value="">Select Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.client_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task / Reminder Title *</label>
            <input
              name="title"
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Request signed MOA from director..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Follow-up Type</label>
              <select
                name="follow_up_type"
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="Call">Phone Call</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Document Collection">Document Collection</option>
                <option value="Payment Reminder">Payment Reminder</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Due Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
              <input
                name="due_date"
                required
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Assigned Employee */}
          {employees.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Employee</label>
              <select
                name="assigned_to"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#077EA1]"
              >
                <option value="">Select Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details regarding callback or required documentation..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#077EA1]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
                  <span>{isEdit ? "Saving..." : "Scheduling..."}</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Schedule Follow-up"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CreateFollowupModal as EditFollowupModal };
