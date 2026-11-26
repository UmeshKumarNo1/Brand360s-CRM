"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { CheckSquare, X, Loader2, Calendar, Clock, AlertTriangle, User, Phone, Bell, Building2, Briefcase } from "lucide-react";
import { createFollowupAction, updateFollowupAction } from "@/app/actions/followups";
import { fetchClientsAction, fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

const FOLLOWUP_TYPES = [
  "Phone Call",
  "Email",
  "Meeting",
  "WhatsApp",
  "Proposal Discussion",
  "Document Collection",
  "Payment Reminder",
  "General",
];

const SERVICES_LIST = [
  "Pvt. Ltd. Registration",
  "GST Registration",
  "Trademark Registration",
  "LLP Registration",
  "Compliance (ROC)",
  "ISO Certification",
  "Accounting & Bookkeeping",
  "Import Export Code (IEC)",
  "Tax Filing & Advisory",
  "Other Service",
];

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = [
  "Due Today",
  "In Follow-up",
  "Likely to Convert",
  "Overdue",
  "No Response",
  "On Hold",
  "Completed",
  "Converted to Client",
];

const DEFAULT_STAFF_MEMBERS = [
  { id: "00000000-0000-0000-0000-000000000001", full_name: "Admin User", role: "admin" },
  { id: "00000000-0000-0000-0000-000000000002", full_name: "Employee1", role: "employee" },
  { id: "00000000-0000-0000-0000-000000000003", full_name: "Employee2", role: "employee" },
];

function getInitials(name: string) {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

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
  defaultContactPerson?: string;
  defaultPhone?: string;
  defaultAssignedTo?: string | null;
  isAdmin?: boolean;
  onAddProspectFollowup?: (data: any) => void;
  employeesList?: any[];
}

export function CreateFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "create",
  initialData,
  defaultClientId,
  defaultClientName,
  defaultContactPerson,
  defaultPhone,
  defaultAssignedTo,
  isAdmin = false,
  onAddProspectFollowup,
  employeesList,
}: FollowupModalProps) {
  const isEdit = mode === "edit" && !!initialData?.id;
  const actionToUse = isEdit ? updateFollowupAction : createFollowupAction;
  const [state, formAction, isPending] = useActionState(actionToUse, null);
  const handledStateRef = useRef<any>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>(employeesList || DEFAULT_STAFF_MEMBERS);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>("");

  // Direct prospect inputs
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceInterested, setServiceInterested] = useState("Pvt. Ltd. Registration");
  const [title, setTitle] = useState("");
  const [followUpType, setFollowUpType] = useState("Phone Call");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Due Today");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueTime, setDueTime] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("Admin User");
  const [notes, setNotes] = useState("");

  const { success, error: toastError } = useToast();

  // Load clients and employees
  useEffect(() => {
    if (isOpen) {
      fetchClientsAction().then((data) => {
        const available = isEdit ? data : (data || []).filter((c: any) => c.client_status !== "Archived");
        setClients(available || []);
      });

      if (employeesList && employeesList.length > 0) {
        setEmployees(employeesList);
      } else {
        fetchSalespeopleAction().then((data) => {
          if (data && data.length > 0) {
            setEmployees(data);
          }
        });
      }
    }
  }, [isOpen, isEdit, employeesList]);

  // Sync initial selections
  useEffect(() => {
    if (isOpen) {
      const cId = initialData?.clientId || initialData?.client_id || defaultClientId || "";
      setSelectedClientId(cId);

      const aId = initialData?.assignedToId || initialData?.assigned_to || defaultAssignedTo || "";
      setSelectedAssignedTo(aId);

      if (initialData) {
        setCompanyName(initialData.companyName || defaultClientName || "");
        setContactPerson(initialData.contactPerson || defaultContactPerson || "");
        setPhone(initialData.phone || defaultPhone || "");
        setServiceInterested(initialData.serviceInterested || initialData.service || "Pvt. Ltd. Registration");
        setTitle(initialData.title || "");
        setFollowUpType(initialData.followUpType || initialData.type || "Phone Call");
        setPriority(initialData.priority || "Medium");
        setStatus(initialData.status || "Due Today");
        setDueDate(initialData.dueDate || initialData.due_date || new Date().toISOString().split("T")[0]);
        setDueTime(initialData.dueTime || initialData.due_time || "");
        setAssignedStaff(initialData.assignedToName || initialData.assignedStaff || "Admin User");
        setNotes(initialData.notes || initialData.description || "");
      } else {
        setCompanyName(defaultClientName || "");
        setContactPerson(defaultContactPerson || "");
        setPhone(defaultPhone || "");
        setServiceInterested("Pvt. Ltd. Registration");
        setTitle("");
        setFollowUpType("Phone Call");
        setPriority("Medium");
        setStatus("Due Today");
        setDueDate(new Date().toISOString().split("T")[0]);
        setDueTime("");
        const matchedEmp = employees.find((e) => e.id === defaultAssignedTo);
        setAssignedStaff(matchedEmp?.full_name || employees[0]?.full_name || "Admin User");
        setNotes("");
      }
    }
  }, [isOpen, initialData, defaultClientId, defaultClientName, defaultContactPerson, defaultPhone, defaultAssignedTo, employees]);

  // Handle successful server action submission if not in prospect callback mode
  useEffect(() => {
    if (!state || handledStateRef.current === state) return;

    if (state.success) {
      handledStateRef.current = state;
      success(
        isEdit ? "Follow-up Updated" : "Follow-up Created",
        isEdit ? "Changes saved successfully." : "New reminder task added."
      );
      onSuccess();
      onClose();
    } else if (state.error) {
      handledStateRef.current = state;
      toastError("Failed to save follow-up", state.error);
    }
  }, [state, isEdit, success, toastError, onSuccess, onClose]);

  // Reset handled state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      handledStateRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Custom submit handler for prospect mode
  const handleCustomSubmit = (e: React.FormEvent) => {
    if (onAddProspectFollowup) {
      e.preventDefault();

      const finalCompanyName = companyName.trim() || (selectedClientId ? clients.find(c => c.id === selectedClientId)?.company_name : "") || "New Prospect";
      const finalContactPerson = contactPerson.trim() || (selectedClientId ? clients.find(c => c.id === selectedClientId)?.contact_person : "") || "Contact Person";
      const finalTitle = title.trim() || `${followUpType} with ${finalCompanyName}`;

      const matchedEmp = employees.find(e => e.full_name === assignedStaff) || employees[0] || DEFAULT_STAFF_MEMBERS[0];
      const initials = getInitials(matchedEmp.full_name);
      const color = getAvatarColor(matchedEmp.full_name);

      const newProspectItem = {
        id: initialData?.id || `followup-${Date.now()}`,
        companyName: finalCompanyName,
        contactPerson: finalContactPerson,
        phone: phone.trim() || "+91 98765 00000",
        serviceInterested: serviceInterested,
        service: serviceInterested,
        title: finalTitle,
        lastFollowup: initialData?.lastFollowup || "Today",
        nextFollowup: dueDate,
        dueDate: dueDate,
        dueTime: dueTime || null,
        status: status,
        followUpType: followUpType,
        priority: priority,
        assignedToName: matchedEmp.full_name,
        assignedStaffInitials: initials,
        assignedColor: color,
        notes: notes.trim(),
        clientId: selectedClientId || "",
        isOverdue: status.toLowerCase().includes("overdue"),
      };

      onAddProspectFollowup(newProspectItem);
      success(isEdit ? "Follow-up Updated" : "Follow-up Added", `Follow-up for ${finalCompanyName} recorded.`);
      onSuccess();
      onClose();
    }
  };

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
              {isEdit ? "Edit Follow-up" : "Add New Follow-up"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? "Update communication schedules, status, or details" : "Schedule a follow-up with unconfirmed prospects and track conversion"}
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
        <form
          action={onAddProspectFollowup ? undefined : formAction}
          onSubmit={onAddProspectFollowup ? handleCustomSubmit : undefined}
          className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1"
        >
          {isEdit && <input type="hidden" name="id" value={initialData.id} />}
          {selectedClientId && <input type="hidden" name="client_id" value={selectedClientId} />}

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 font-medium">
              <AlertTriangle size={15} className="shrink-0 text-red-500" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Prospect / Company Name & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Prospect / Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="company_name"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. BrightWay Logistics"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_person"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mr. Arjun Mehta"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Phone Number & Service Interested */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Phone / Mobile Number
              </label>
              <input
                type="text"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Service Interested <span className="text-red-500">*</span>
              </label>
              <select
                name="service_interested"
                value={serviceInterested}
                onChange={(e) => setServiceInterested(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {SERVICES_LIST.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Follow-up Title */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Follow-up Purpose / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Share service proposal / Follow up for documents"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>

          {/* Follow-up Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Follow-up Type <span className="text-red-500">*</span>
              </label>
              <select
                name="follow_up_type"
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
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
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
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

          {/* Next Follow-up Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Next Follow-up Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Time (Optional)
              </label>
              <input
                type="time"
                name="due_time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>

          {/* Status & Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Assigned To
              </label>
              <select
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.full_name}>
                    {emp.full_name} {emp.role ? `(${emp.role === "admin" ? "Admin" : "Employee"})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Discussion Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Discussion Notes / Next Steps
            </label>
            <textarea
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Share service proposal and follow up for documentation..."
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A2B4C] hover:bg-[#15233e] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  <span>{isEdit ? "Update Follow-up" : "Save Follow-up"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
