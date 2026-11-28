"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Clock,
  User,
  Building2,
  CalendarPlus,
  PhoneCall,
  Mail,
  Users,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { completeAndScheduleFollowupAction } from "@/app/actions/followups";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

const OUTCOMES = [
  { value: "Interested", label: "Interested", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "Requested Callback", label: "Requested Callback", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "No Response", label: "No Response", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "Not Interested", label: "Not Interested", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "Quotation Requested", label: "Quotation Requested", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "Negotiation", label: "Negotiation", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "Converted", label: "Converted", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "Meeting Scheduled", label: "Meeting Scheduled", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "Other", label: "Other", color: "bg-slate-50 text-slate-600 border-slate-200" },
];

const NEXT_FOLLOWUP_TYPES = [
  { value: "Call", label: "Phone Call" },
  { value: "Email", label: "Email Outreach" },
  { value: "Meeting", label: "Client Meeting / Demo" },
  { value: "Document Collection", label: "Send Proposal / Documentation" },
  { value: "Payment Reminder", label: "Payment Reminder" },
  { value: "Other", label: "General Follow-up" },
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const REMINDER_OPTIONS = [
  { value: "none", label: "No reminder" },
  { value: "on_due_date", label: "On due date (Morning 9:00 AM)" },
  { value: "1_day_before", label: "1 day before" },
  { value: "3_days_before", label: "3 days before" },
];

function getFutureDate(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}

interface CompleteFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  followup: {
    id: string;
    title: string;
    companyName?: string;
    assignedToName?: string;
    assignedToId?: string;
    followUpType?: string;
    dueDate?: string;
    dueTime?: string | null;
    isLead?: boolean;
    clientId?: string | null;
    description?: string | null;
    notes?: string | null;
    contactPerson?: string | null;
  } | null;
  isAdmin?: boolean;
}

export function CompleteFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  followup,
  isAdmin = false,
}: CompleteFollowupModalProps) {
  const { success, error: toastError } = useToast();

  // Completion State
  const [outcome, setOutcome] = useState("Interested");
  const [discussionNotes, setDiscussionNotes] = useState("");
  const [actualDate, setActualDate] = useState(getCurrentDate);
  const [actualTime, setActualTime] = useState(getCurrentTime);

  // Next Follow-up State
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextTitle, setNextTitle] = useState("");
  const [nextType, setNextType] = useState("Call");
  const [nextDueDate, setNextDueDate] = useState(() => getFutureDate(3));
  const [nextDueTime, setNextDueTime] = useState("10:30");
  const [nextPriority, setNextPriority] = useState("Medium");
  const [nextReminder, setNextReminder] = useState("on_due_date");
  const [nextActionNotes, setNextActionNotes] = useState("");
  const [nextAssignedTo, setNextAssignedTo] = useState(followup?.assignedToId || "");
  const [salespeople, setSalespeople] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial assignee & default next title
  useEffect(() => {
    if (isOpen && followup) {
      setNextAssignedTo(followup.assignedToId || "");
      const company = followup.companyName || "Client";
      if (outcome === "Proposal Requested") {
        setNextTitle(`Send Proposal - ${company}`);
        setNextType("Document Collection");
      } else if (outcome === "Meeting Scheduled") {
        setNextTitle(`Strategy Meeting - ${company}`);
        setNextType("Meeting");
      } else if (outcome === "Call Back Requested") {
        setNextTitle(`Call Back - ${company}`);
        setNextType("Call");
      } else {
        setNextTitle(`Follow-up Call - ${company}`);
        setNextType("Call");
      }
    }
  }, [isOpen, followup, outcome]);

  // Load salespeople for admin reassignment
  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchSalespeopleAction().then((data) => {
        setSalespeople(data || []);
      });
    }
  }, [isOpen, isAdmin]);

  if (!isOpen || !followup) return null;

  const todayStr = getCurrentDate();
  const companyLabel = followup.companyName || "Company Record";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!outcome) {
      setErrorMessage("Please select a follow-up outcome.");
      return;
    }

    if (scheduleNext) {
      if (!nextDueDate) {
        setErrorMessage("Please select a due date for the next follow-up.");
        return;
      }
      if (nextDueDate < todayStr) {
        setErrorMessage("Next follow-up date cannot be in the past.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await completeAndScheduleFollowupAction({
        followupId: followup.id,
        outcome,
        discussionNotes,
        actualCompletedAt: `${actualDate}T${actualTime}:00`,
        scheduleNext,
        nextTitle: nextTitle.trim() || `Follow-up - ${companyLabel}`,
        nextFollowUpType: nextType,
        nextDueDate,
        nextDueTime: nextDueTime || null,
        nextAssignedTo,
        nextPriority,
        nextReminderSetting: nextReminder,
        nextActionNotes,
      });

      if (res.success) {
        if (scheduleNext) {
          success(
            "Task Completed & Scheduled",
            `Current task completed (${outcome}) and next follow-up task scheduled for ${nextDueDate}.`
          );
        } else {
          success("Follow-up Completed", `"${followup.title}" has been moved to completed history.`);
        }
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to complete follow-up.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Unexpected server error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-slate-100 bg-[#F0F8FA]">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
            <CheckCircle2 size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Complete &amp; Schedule
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  followup.isLead
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-teal-50 text-teal-700 border border-teal-200"
                }`}
              >
                {followup.isLead ? "Unconverted Lead" : "Client"}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
              Complete Task: {companyLabel}
            </h3>
            <p className="text-xs text-slate-500 truncate">{followup.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Current Activity Completion */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <span className="font-bold text-[#1B3260] text-xs flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>1. Current Conversation &amp; Call Outcome</span>
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Scheduled: <strong>{followup.dueDate}</strong></span>
                <span>•</span>
                <span>Type: <strong>{followup.followUpType || "Call"}</strong></span>
                <span>•</span>
                <span>Rep: <strong>{followup.assignedToName || "You"}</strong></span>
              </div>
            </div>

            {/* Previous Description */}
            {(followup.description || (followup.notes && !followup.notes.startsWith("{"))) && (
              <div className="p-2.5 bg-white border border-slate-200/90 rounded-lg text-slate-600">
                <span className="font-semibold text-slate-800 text-[11px] block mb-0.5">Previous Task / Description:</span>
                <p className="text-xs text-slate-600 italic">
                  {followup.description || followup.notes}
                </p>
              </div>
            )}

            {/* Outcome Selection */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Follow-up Outcome *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OUTCOMES.map((o) => {
                  const isSelected = outcome === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOutcome(o.value)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? `${o.color} ring-2 ring-[#0481A2]/40 shadow-2xs`
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100/70"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                      {isSelected && <CheckCircle2 size={13} className="shrink-0 text-[#0481A2]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discussion Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Discussion Notes &amp; Client Feedback
              </label>
              <textarea
                rows={3}
                value={discussionNotes}
                onChange={(e) => setDiscussionNotes(e.target.value)}
                placeholder="Record key conversation points, client requirements, budget discussions, or next step commitments..."
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            {/* Actual Completion Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Actual Completion Date
                </label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Completion Time
                </label>
                <input
                  type="time"
                  value={actualTime}
                  onChange={(e) => setActualTime(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Schedule Next Follow-up (Toggleable) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {/* Toggle Header */}
            <div className="p-3.5 bg-gradient-to-r from-[#F0F8FA] to-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0481A2]/10 text-[#0481A2] rounded-lg">
                  <CalendarPlus size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#1B3260]">
                    2. Schedule Next Follow-up Task
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Automatically create a separate pending task linked to this lead
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleNext}
                  onChange={(e) => setScheduleNext(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0481A2]"></div>
              </label>
            </div>

            {/* Sub-form when Schedule Next is enabled */}
            {scheduleNext ? (
              <div className="p-4 space-y-3.5 bg-white animate-in fade-in duration-150">
                {/* Next Task Title */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Next Follow-up Title *
                  </label>
                  <input
                    type="text"
                    required={scheduleNext}
                    value={nextTitle}
                    onChange={(e) => setNextTitle(e.target.value)}
                    placeholder="e.g. Follow-up Call - Client Discussion"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                  />
                </div>

                {/* Next Type, Due Date, Due Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Next Action Type *
                    </label>
                    <select
                      value={nextType}
                      onChange={(e) => setNextType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                    >
                      {NEXT_FOLLOWUP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required={scheduleNext}
                      min={todayStr}
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Due Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={nextDueTime}
                      onChange={(e) => setNextDueTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                    />
                  </div>
                </div>

                {/* Priority, Reminder, Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Priority *
                    </label>
                    <select
                      value={nextPriority}
                      onChange={(e) => setNextPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Reminder Setting
                    </label>
                    <select
                      value={nextReminder}
                      onChange={(e) => setNextReminder(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                    >
                      {REMINDER_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Assigned Salesperson
                    </label>
                    {isAdmin && salespeople.length > 0 ? (
                      <select
                        value={nextAssignedTo}
                        onChange={(e) => setNextAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                      >
                        {salespeople.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} ({s.email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium truncate">
                        {followup.assignedToName || "Current Salesperson"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Action Notes */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Next Action Notes &amp; Objectives
                  </label>
                  <textarea
                    rows={2}
                    value={nextActionNotes}
                    onChange={(e) => setNextActionNotes(e.target.value)}
                    placeholder="Specify action items, documents to share, or specific questions to ask in the next call..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50/50 text-slate-500 text-xs italic text-center">
                Next follow-up will not be scheduled. Current task will be archived as completed.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors disabled:opacity-60 cursor-pointer ${
                scheduleNext
                  ? "bg-[#0481A2] hover:bg-[#036c88]"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Workflow...</span>
                </>
              ) : scheduleNext ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Complete &amp; Schedule Next</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Complete Follow-up</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
