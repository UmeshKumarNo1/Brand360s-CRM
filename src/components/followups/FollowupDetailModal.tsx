"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  Building,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  Bell,
  ArrowRight,
  MapPin,
  Briefcase,
  IndianRupee,
  History,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { FollowupItem } from "@/app/actions/followups";
import { formatINR } from "@/lib/utils";

interface FollowupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowupItem | null;
  onEdit?: (followup: FollowupItem) => void;
  onComplete?: (followup: FollowupItem) => void;
  onConvert?: (lead: any) => void;
}

export function FollowupDetailModal({
  isOpen,
  onClose,
  followup,
  onEdit,
  onComplete,
  onConvert,
}: FollowupDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "directors" | "history">("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !followup) return null;

  const isCompleted = followup.status === "Completed";
  const isCancelled = followup.status === "Cancelled";

  // Parse notes if stored as JSON (lead imported data)
  let leadData: any = null;
  let userNotes: string = "";

  if (followup.notes && typeof followup.notes === "string") {
    const trimmed = followup.notes.trim();
    if (trimmed.startsWith("{")) {
      try {
        leadData = JSON.parse(trimmed);
        userNotes = leadData.userNotes || leadData.customNotes || "";
      } catch {
        userNotes = followup.notes;
      }
    } else {
      userNotes = followup.notes;
    }
  }

  const directors: any[] = Array.isArray(leadData?.directors) ? leadData.directors : [];
  const history: any[] = Array.isArray(leadData?.history) ? leadData.history : [];
  const isLead = !followup.clientId || !!leadData?.entityId;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConvertClick = () => {
    if (!onConvert) return;
    const leadObj = {
      id: followup.id,
      companyName: followup.companyName,
      entityId: leadData?.entityId || followup.clientCode,
      contactPerson: followup.contactPerson || directors[0]?.name || "",
      phone: directors[0]?.mobile || (followup as any).phone || "",
      email: leadData?.email || directors[0]?.email || "",
      address: leadData?.address || leadData?.registeredAddress || "",
      city: leadData?.city || leadData?.district || "",
      state: leadData?.state || "Tamil Nadu",
      directors: directors,
    };
    onClose();
    onConvert(leadObj);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-slate-100 bg-[#F0F8FA]">
          <div className="p-2.5 bg-[#E0F2F7] text-[#0481A2] rounded-xl shrink-0 mt-0.5">
            <Building2 size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  followup.priority === "Urgent" || followup.priority === "High"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {followup.priority} Priority
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  followup.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : followup.isOverdue
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {followup.isOverdue ? `Overdue by ${followup.overdueDays}d` : followup.status}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isLead
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-teal-50 text-teal-700 border border-teal-200"
                }`}
              >
                {isLead ? "New Lead" : "Converted Client"}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 truncate">{followup.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Company Card Banner */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-[#1B3260] tracking-tight">{followup.companyName}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
              {leadData?.entityId ? (
                <span className="font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                  CIN: {leadData.entityId}
                </span>
              ) : followup.clientCode && followup.clientCode !== "Lead" ? (
                <span className="font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                  {followup.clientCode}
                </span>
              ) : null}

              {(leadData?.city || leadData?.district) && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-slate-400" />
                  {leadData.city || leadData.district}
                  {leadData.state ? `, ${leadData.state}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {followup.clientId ? (
              <Link
                href={`/clients/${followup.clientId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-[#0481A2] transition-colors"
              >
                <span>View Client</span>
                <ArrowRight size={12} />
              </Link>
            ) : isLead && onConvert ? (
              <button
                onClick={handleConvertClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Convert to Client</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation (when lead data exists) */}
        {leadData && (
          <div className="px-5 border-b border-slate-200 flex gap-4 text-xs font-semibold bg-white">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={14} />
              <span>Company & Task</span>
            </button>
            <button
              onClick={() => setActiveTab("directors")}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "directors"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users size={14} />
              <span>Directors ({directors.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <History size={14} />
              <span>Activity History ({history.length})</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {(!leadData || activeTab === "overview") && (
            <>
              {/* Key metadata grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Due Date & Time</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} className="text-slate-400" />
                    {followup.dueDate} {followup.dueTime ? `at ${followup.dueTime}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Assigned Representative</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <User size={13} className="text-slate-400" />
                    {followup.assignedToName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Follow-up Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{followup.followUpType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Primary Contact</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                    {followup.contactPerson} ({followup.contactMethod || "Phone"})
                  </span>
                </div>
              </div>

              {/* Lead Registration Details (if available) */}
              {leadData && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building size={14} className="text-[#0481A2]" />
                    Registration & MCA Details
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {leadData.entityId && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">CIN / Entity ID</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-slate-800 font-semibold text-[11px] truncate">
                            {leadData.entityId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(leadData.entityId, "cin")}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Copy CIN"
                          >
                            {copiedKey === "cin" ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {leadData.roc && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">ROC Office</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                          {leadData.roc}
                        </span>
                      </div>
                    )}

                    {leadData.classOfCompany && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Company Class</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                          {leadData.classOfCompany}
                        </span>
                      </div>
                    )}

                    {leadData.dateOfIncorporation && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Incorporation Date</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                          {leadData.dateOfIncorporation}
                        </span>
                      </div>
                    )}

                    {leadData.authorizedCapital != null && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Authorized Capital</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                          {formatINR(Number(leadData.authorizedCapital))}
                        </span>
                      </div>
                    )}

                    {leadData.paidUpCapital != null && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Paid-Up Capital</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block text-[11px]">
                          {formatINR(Number(leadData.paidUpCapital))}
                        </span>
                      </div>
                    )}
                  </div>

                  {leadData.nicLabel && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Activity / NIC</span>
                      <span className="font-medium text-slate-700 text-[11px]">
                        {leadData.nicCode ? `${leadData.nicCode} – ` : ""}
                        {leadData.nicLabel}
                      </span>
                    </div>
                  )}

                  {leadData.address && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">Registered Address</span>
                      <span className="font-medium text-slate-700 text-[11px] flex items-start gap-1 mt-0.5">
                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>{leadData.address}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description / Notes (User notes or plain description) */}
              {userNotes && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Follow-up Notes & Remarks:</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {userNotes}
                  </div>
                </div>
              )}

              {/* Completed Details */}
              {isCompleted && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Task Completed on {followup.completedAt}</span>
                  </span>
                  {followup.completedByName && (
                    <p className="text-[11px] text-emerald-700">
                      Completed by: <strong>{followup.completedByName}</strong>
                    </p>
                  )}
                  {followup.completionNotes && (
                    <p className="text-[11px] text-emerald-900 mt-1 italic">
                      "{followup.completionNotes}"
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Directors Tab */}
          {leadData && activeTab === "directors" && (
            <div className="space-y-3">
              {directors.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users size={24} className="mx-auto mb-1 text-slate-300" />
                  <p>No associated directors recorded for this lead.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {directors.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#0481A2] font-bold flex items-center justify-center shrink-0">
                          {d.name ? d.name.charAt(0).toUpperCase() : "D"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{d.name}</span>
                            {d.designation && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200/80 text-slate-600 font-medium">
                                {d.designation}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">Director #{idx + 1}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {d.mobile && (
                          <a
                            href={`tel:${d.mobile}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-[11px] border border-emerald-200 transition-colors"
                          >
                            <Phone size={11} />
                            <span>{d.mobile}</span>
                          </a>
                        )}
                        {d.email && (
                          <a
                            href={`mailto:${d.email}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] border border-blue-200 transition-colors"
                          >
                            <Mail size={11} />
                            <span className="max-w-[140px] truncate">{d.email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity History Tab */}
          {leadData && activeTab === "history" && (
            <div className="space-y-3">
              {/* Current follow-up task card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">
                      {followup.dueDate} – {followup.followUpType || "Follow-up"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        followup.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      Status: {followup.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Current Task</span>
                </div>
                {userNotes && (
                  <p className="text-slate-700 text-xs bg-white p-2 rounded-lg border border-slate-100">
                    {userNotes}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Assigned to: <strong>{followup.assignedToName}</strong></span>
                  {followup.dueTime && <span>Time: {followup.dueTime}</span>}
                </div>
              </div>

              {history.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <History size={22} className="mx-auto mb-1 text-slate-300" />
                  <p>No previous customer conversations logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Previous Activity Trail ({history.length})
                  </div>
                  {history.map((h: any, idx: number) => {
                    const outcomeText = h.outcome || "Completed";
                    let outcomeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                    if (outcomeText === "Interested") outcomeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    else if (outcomeText === "Proposal Requested") outcomeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                    else if (outcomeText === "Meeting Scheduled") outcomeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                    else if (outcomeText === "Call Back Requested") outcomeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                    else if (outcomeText === "Not Interested") outcomeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                    else if (outcomeText === "No Answer") outcomeStyle = "bg-slate-100 text-slate-700 border-slate-200";

                    const dateFormatted = h.date
                      ? new Date(h.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Past Date";

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">
                              {dateFormatted} – {h.followupType || "Call"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${outcomeStyle}`}
                            >
                              Outcome: {outcomeText}
                            </span>
                          </div>
                          <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Status: Completed
                          </span>
                        </div>
                        {h.notes && (
                          <p className="text-slate-700 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                            {h.notes}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          {h.recordedBy && <span>Recorded by: {h.recordedBy}</span>}
                          {h.nextDate && <span>Next scheduled: {h.nextDate}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
          <div>
            {isLead && onConvert && (
              <button
                onClick={handleConvertClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Convert to Client</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            {!isCompleted && !isCancelled && onComplete && (
              <button
                onClick={() => {
                  onClose();
                  onComplete(followup);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Mark Completed</span>
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(followup);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <span>Edit Follow-up</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
