"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  UserCheck,
  Plus,
  Loader2,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { updateLeadFollowupActivityAction } from "@/app/actions/leads";
import { useToast } from "@/components/common/ToastProvider";

export function LeadDetailModal({
  isOpen,
  onClose,
  lead,
  onConvertClick,
  onRefresh,
}) {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState("overview"); // overview | directors | followups | log
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Quick follow-up log state
  const [callOutcome, setCallOutcome] = useState("Connected - Positive");
  const [newLeadStatus, setNewLeadStatus] = useState(lead?.leadStatus || "In Discussion");
  const [logNotes, setLogNotes] = useState("");
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [nextDueType, setNextDueType] = useState("Call");

  if (!isOpen || !lead) return null;

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setIsSubmittingLog(true);

    try {
      const res = await updateLeadFollowupActivityAction({
        leadId: lead.id,
        leadStatus: newLeadStatus,
        callOutcome,
        notes: logNotes,
        nextDueDate: scheduleNext ? nextDueDate : null,
        nextDueType: scheduleNext ? nextDueType : null,
      });

      if (res.success) {
        success("Activity Logged", "Follow-up note and next contact schedule recorded.");
        setLogNotes("");
        if (onRefresh) onRefresh();
        setActiveTab("followups");
      } else {
        toastError("Error", res.error || "Failed to record activity.");
      }
    } catch (err) {
      toastError("Error", err.message || "Failed to save follow-up.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const directors = Array.isArray(lead.directors) ? lead.directors : [];
  const followups = Array.isArray(lead.allFollowups) ? lead.allFollowups : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-[#1B3260]">
                  {lead.companyName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {lead.leadStatus || "New Lead"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Entity ID: {lead.entityId || "N/A"} • Assigned to: <span className="font-semibold text-slate-700">{lead.assignedSalespersonName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onConvertClick) onConvertClick(lead);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Convert to Client</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-100 flex gap-4 text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-[#0481A2] text-[#0481A2]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Company Overview
          </button>
          <button
            onClick={() => setActiveTab("directors")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "directors"
                ? "border-[#0481A2] text-[#0481A2]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Associated Directors</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {directors.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "followups"
                ? "border-[#0481A2] text-[#0481A2]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Follow-up History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {followups.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("log")}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "log"
                ? "border-[#0481A2] text-[#0481A2]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PhoneCall size={12} />
            <span>Log Activity</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#0481A2]" />
                    <span>Company Details</span>
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">Entity Type:</span><span className="font-medium text-slate-800">{lead.entityType || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Class:</span><span className="font-medium text-slate-800">{lead.classOfCompany || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">ROC:</span><span className="font-medium text-slate-800">{lead.roc || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Incorporation Date:</span><span className="font-medium text-slate-800">{lead.dateOfIncorporation || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Paid-up Capital:</span><span className="font-medium text-slate-800 font-number">{formatINR(lead.paidUpCapital || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Authorized Capital:</span><span className="font-medium text-slate-800 font-number">{formatINR(lead.authorizedCapital || 0)}</span></div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#0481A2]" />
                    <span>Location &amp; NIC</span>
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">City / District:</span><span className="font-medium text-slate-800">{lead.city || "-"} / {lead.district || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">State:</span><span className="font-medium text-slate-800">{lead.state || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">NIC Code:</span><span className="font-medium text-slate-800">{lead.nicCode || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">NIC Activity:</span><span className="font-medium text-slate-800 truncate max-w-[180px]" title={lead.nicLabel}>{lead.nicLabel || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Address:</span><span className="font-medium text-slate-800 text-right truncate max-w-[180px]" title={lead.address}>{lead.address || "-"}</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <UserCheck size={14} className="text-[#0481A2]" />
                  <span>Sales &amp; Follow-up Status</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-slate-600">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[11px] text-slate-400">Assigned Salesperson</p>
                    <p className="font-bold text-slate-800 mt-0.5">{lead.assignedSalespersonName}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[11px] text-slate-400">Next Follow-up</p>
                    <p className="font-bold text-[#0481A2] mt-0.5">{lead.nextFollowupDate ? `${lead.nextFollowupDate} (${lead.nextFollowupType || "Call"})` : "None scheduled"}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="text-[11px] text-slate-400">Import Source</p>
                    <p className="font-bold text-slate-800 mt-0.5">{lead.leadSource || "Excel Import"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTORS */}
          {activeTab === "directors" && (
            <div className="space-y-3">
              {directors.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  No individual director details parsed for this company.
                </div>
              ) : (
                directors.map((dir, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{dir.name || "Director"}</p>
                        <p className="text-[11px] text-slate-400">{dir.designation || "Director / Authorized Signatory"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600">
                      {dir.mobile && (
                        <a href={`tel:${dir.mobile}`} className="flex items-center gap-1 text-[#0481A2] hover:underline font-mono">
                          <Phone size={12} />
                          <span>{dir.mobile}</span>
                        </a>
                      )}
                      {dir.email && (
                        <a href={`mailto:${dir.email}`} className="flex items-center gap-1 text-slate-600 hover:underline">
                          <Mail size={12} />
                          <span>{dir.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: FOLLOW-UPS HISTORY */}
          {activeTab === "followups" && (
            <div className="space-y-3">
              {followups.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  No follow-up activities recorded yet.
                </div>
              ) : (
                followups.map((f, idx) => (
                  <div key={f.id || idx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{f.title}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          f.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}>
                          {f.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{f.due_date || f.dueDate}</span>
                      </span>
                    </div>
                    {f.notes && (
                      <p className="text-slate-600 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {f.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: LOG ACTIVITY */}
          {activeTab === "log" && (
            <form onSubmit={handleSaveActivity} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">Record Call Outcome &amp; Activity</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Call Outcome</label>
                  <select
                    value={callOutcome}
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="Connected - Positive">Connected - Interested in Registration</option>
                    <option value="Connected - Follow-up Requested">Connected - Asked to Call Later</option>
                    <option value="Connected - Proposal Sent">Connected - Proposal / Quote Sent</option>
                    <option value="Not Reachable / Busy">Not Reachable / Line Busy</option>
                    <option value="Wrong Number / Invalid">Wrong Number / Invalid Contact</option>
                    <option value="Not Interested">Not Interested / Disqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Pipeline Status</label>
                  <select
                    value={newLeadStatus}
                    onChange={(e) => setNewLeadStatus(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Discussion">In Discussion</option>
                    <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                    <option value="Lost">Lost / Dropped</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Call Notes &amp; Discussion Summary</label>
                <textarea
                  rows={3}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Summarize client conversation, requirement details, expected budget..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={scheduleNext}
                    onChange={(e) => setScheduleNext(e.target.checked)}
                    className="rounded text-[#0481A2]"
                  />
                  <span>Schedule Next Follow-up</span>
                </label>

                {scheduleNext && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        value={nextDueDate}
                        onChange={(e) => setNextDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Follow-up Type</label>
                      <select
                        value={nextDueType}
                        onChange={(e) => setNextDueType(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                      >
                        <option value="Call">Call</option>
                        <option value="Meeting">Meeting / Consultation</option>
                        <option value="Email">Email Proposal</option>
                        <option value="Document Collection">Document Collection</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLog ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Save Activity Log</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
