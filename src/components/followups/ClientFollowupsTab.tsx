"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Pencil,
  User,
  PhoneCall,
  Mail,
  CalendarPlus,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { fetchClientFollowupsAction, deleteFollowupAction } from "@/app/actions/followups";
import { CreateFollowupModal } from "@/components/followups/CreateFollowupModal";
import { CompleteFollowupModal } from "@/components/followups/CompleteFollowupModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

interface ClientFollowupsTabProps {
  clientId: string;
  clientName: string;
  clientContactPerson?: string;
  clientPhone?: string;
  clientAssignedSalespersonId?: string | null;
  isAdmin?: boolean;
}

export function ClientFollowupsTab({
  clientId,
  clientName,
  clientContactPerson,
  clientPhone,
  clientAssignedSalespersonId,
  isAdmin = false,
}: ClientFollowupsTabProps) {
  const [followups, setFollowups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<any | null>(null);
  const [completingFollowup, setCompletingFollowup] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const loadData = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchClientFollowupsAction(clientId);
      if (currentReqId === requestIdRef.current) {
        setFollowups(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load client follow-ups.");
      }
    } finally {
      inFlightRef.current = false;
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this follow-up record?")) return;

    setFollowups((prev) => prev.filter((f) => f.id !== id));

    try {
      const res = await deleteFollowupAction(id, clientId);
      if (res.error) {
        toastError("Failed to delete follow-up", res.error);
        loadData();
      } else {
        success("Follow-up deleted", "Record removed successfully.");
      }
    } catch {
      toastError("Failed to delete follow-up", "Server connection error.");
      loadData();
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Summary Metrics
  const totalCount = followups.length;
  const completedCount = followups.filter((f) => f.status === "Completed").length;
  const pendingCount = followups.filter((f) => f.status === "Pending" || f.status === "In Progress").length;
  const overdueCount = followups.filter((f) => f.isOverdue).length;

  // Newest completed interaction
  const lastInteraction = useMemo(() => {
    const completed = followups
      .filter((f) => f.status === "Completed" && (f.actualCompletedAt || f.due_date))
      .sort((a, b) => {
        const dateA = a.actualCompletedAt || a.due_date || "";
        const dateB = b.actualCompletedAt || b.due_date || "";
        return dateB.localeCompare(dateA);
      });
    return completed[0] || null;
  }, [followups]);

  // Earliest upcoming pending follow-up
  const nextScheduled = useMemo(() => {
    const upcoming = followups
      .filter((f) => (f.status === "Pending" || f.status === "In Progress") && f.due_date >= todayStr)
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
    return upcoming[0] || null;
  }, [followups, todayStr]);

  // Filtered list
  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      if (statusFilter === "pending") return f.status === "Pending" || f.status === "In Progress";
      if (statusFilter === "completed") return f.status === "Completed";
      if (statusFilter === "overdue") return f.isOverdue;
      return true;
    });
  }, [followups, statusFilter]);

  const getTypeIcon = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("call") || t.includes("phone")) return <PhoneCall size={13} className="text-[#0481A2]" />;
    if (t.includes("mail")) return <Mail size={13} className="text-blue-600" />;
    if (t.includes("meet")) return <MessageSquare size={13} className="text-purple-600" />;
    return <Calendar size={13} className="text-slate-600" />;
  };

  const getOutcomeBadgeClass = (outcome?: string | null) => {
    const o = (outcome || "").toLowerCase();
    if (o.includes("interested") || o.includes("converted") || o.includes("won")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (o.includes("proposal") || o.includes("quotation") || o.includes("callback")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (o.includes("not interested") || o.includes("lost")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (o.includes("no response") || o.includes("unreachable")) {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }
    if (o.includes("meeting") || o.includes("negotiation")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Customer Follow-up History &amp; Activity Timeline</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#0481A2]/10 text-[#0481A2] rounded-full">
              {totalCount} Total Records
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete interaction history: logged calls, discussion notes, outcomes, and scheduled next actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh follow-up history"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Follow-up</span>
          </button>
        </div>
      </div>

      {/* Customer Follow-up Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
          <p className="text-lg font-black text-slate-800 mt-0.5">{totalCount}</p>
          <span className="text-[10px] text-slate-500">All customer interactions</span>
        </div>

        <div className="p-3 bg-white border border-emerald-200/80 rounded-xl shadow-2xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
          <p className="text-lg font-black text-emerald-700 mt-0.5">{completedCount}</p>
          <span className="text-[10px] text-emerald-600">Documented conversations</span>
        </div>

        <div className="p-3 bg-white border border-amber-200/80 rounded-xl shadow-2xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending / Due</span>
          <p className="text-lg font-black text-amber-700 mt-0.5">{pendingCount}</p>
          <span className="text-[10px] text-amber-600">{overdueCount > 0 ? `${overdueCount} overdue` : "On schedule"}</span>
        </div>

        <div className="p-3 bg-white border border-blue-200/80 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Last Interaction</span>
          {lastInteraction ? (
            <div className="mt-0.5 truncate">
              <span className="text-xs font-bold text-slate-900 block truncate">
                {lastInteraction.outcome || "Completed"}
              </span>
              <span className="text-[10px] text-slate-500">
                {lastInteraction.actualCompletedAt
                  ? new Date(lastInteraction.actualCompletedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : lastInteraction.due_date}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1 italic">No completed calls yet</p>
          )}
        </div>

        <div className="p-3 bg-white border border-purple-200/80 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Next Scheduled</span>
          {nextScheduled ? (
            <div className="mt-0.5 truncate">
              <span className="text-xs font-bold text-slate-900 block truncate">
                {nextScheduled.due_date}
              </span>
              <span className="text-[10px] text-purple-700 truncate block">
                {nextScheduled.title}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1 italic">None scheduled</p>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-1 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Activity ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === "pending"
              ? "bg-[#0481A2] text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Pending / Due ({pendingCount})
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === "overdue"
              ? "bg-rose-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Overdue ({overdueCount})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === "completed"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Completed History ({completedCount})
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Timeline List (Newest Activity First) */}
      {!errorMessage && (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#0481A2]" />
                <span className="text-xs">Loading customer interaction history...</span>
              </div>
            </div>
          ) : filteredFollowups.length === 0 ? (
            <div className="py-10 text-center bg-white border border-dashed border-slate-200 rounded-xl text-slate-400">
              <Clock size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">
                {statusFilter === "all"
                  ? "No follow-up records found for this customer."
                  : `No ${statusFilter} follow-ups found.`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click &quot;Add Follow-up&quot; above to schedule a callback, meeting, or proposal reminder.
              </p>
            </div>
          ) : (
            filteredFollowups.map((f) => {
              const isCompleted = f.status === "Completed";
              const isCancelled = f.status === "Cancelled";
              const isOverdue = f.isOverdue;

              return (
                <div key={f.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-3 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isOverdue
                        ? "bg-rose-600 text-white"
                        : "bg-[#0481A2] text-white"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={11} strokeWidth={3} />
                    ) : isOverdue ? (
                      <AlertTriangle size={10} />
                    ) : (
                      <Clock size={10} />
                    )}
                  </div>

                  {/* Activity Card */}
                  <div
                    className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-2xs transition-all hover:shadow-xs ${
                      isCompleted
                        ? "border-emerald-200/70 bg-gradient-to-r from-emerald-50/15 to-transparent"
                        : isOverdue
                        ? "border-rose-200 bg-rose-50/15"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Type Pill */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-200/70">
                            {getTypeIcon(f.type || f.followUpType)}
                            <span>{f.type || f.followUpType || "Call"}</span>
                          </span>

                          {/* Priority Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              f.priority === "High" || f.priority === "Urgent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : f.priority === "Medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {f.priority || "Medium"}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : isOverdue
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : isCancelled
                                ? "bg-slate-100 text-slate-600 border-slate-300"
                                : "bg-blue-100 text-blue-800 border-blue-300"
                            }`}
                          >
                            {isCompleted ? "Completed" : isOverdue ? "Overdue" : f.status || "Pending"}
                          </span>

                          {/* Outcome Badge if Completed */}
                          {f.outcome && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getOutcomeBadgeClass(
                                f.outcome
                              )}`}
                            >
                              Outcome: {f.outcome}
                            </span>
                          )}
                        </div>

                        <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                          {f.title}
                        </h5>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isCompleted && !isCancelled && (
                          <button
                            onClick={() =>
                              setCompletingFollowup({
                                id: f.id,
                                title: f.title,
                                companyName: clientName,
                                assignedToName: f.assignedToName,
                                assignedToId: f.assignedToId,
                                followUpType: f.type || f.followUpType,
                                dueDate: f.due_date || f.dueDate,
                                dueTime: f.due_time || f.dueTime,
                                description: f.description || f.notes,
                                notes: f.notes,
                                clientId: clientId,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Complete Follow-up and record outcome notes"
                          >
                            <CheckCircle2 size={13} />
                            <span>Complete Follow-up</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingFollowup(f)}
                          className="p-1.5 text-slate-400 hover:text-[#0481A2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit follow-up schedule"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete follow-up record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Scheduled Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px] mt-2 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Scheduled: <strong>{f.due_date || f.dueDate}</strong></span>
                        {f.due_time && <span>at {f.due_time}</span>}
                      </span>

                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        <span>Assigned: <strong>{f.assignedToName || "Assigned Staff"}</strong></span>
                      </span>

                      {f.contact_person && (
                        <span>Contact: <strong>{f.contact_person}</strong></span>
                      )}
                    </div>

                    {/* Planned Task Description */}
                    {f.description && !f.description.startsWith("{") && f.description !== f.title && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {f.description}
                      </p>
                    )}

                    {/* Completed Conversation Details & Discussion Notes */}
                    {isCompleted && (
                      <div className="mt-3 p-3 bg-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-emerald-900 font-medium">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>
                              Completed on:{" "}
                              <strong>
                                {f.actualCompletedAt
                                  ? new Date(f.actualCompletedAt).toLocaleString("en-IN")
                                  : f.due_date || "Recorded"}
                              </strong>
                            </span>
                          </span>

                          {f.outcome && (
                            <span className="font-semibold px-2 py-0.5 bg-white border border-emerald-200 rounded-md text-[10px] text-emerald-800">
                              Outcome: {f.outcome}
                            </span>
                          )}
                        </div>

                        {f.discussionNotes ? (
                          <div className="mt-1">
                            <span className="text-[10px] font-bold text-emerald-800/80 uppercase tracking-wider block">
                              Discussion Notes &amp; Client Commitments:
                            </span>
                            <p className="text-xs text-slate-700 italic mt-0.5 whitespace-pre-line">
                              &ldquo;{f.discussionNotes}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">No discussion notes recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create / Edit Follow-up Modal */}
      <CreateFollowupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadData();
        }}
        defaultClientId={clientId}
        defaultClientName={clientName}
        defaultContactPerson={clientContactPerson}
        defaultPhone={clientPhone}
        defaultAssignedTo={clientAssignedSalespersonId}
        isAdmin={isAdmin}
      />

      {editingFollowup && (
        <CreateFollowupModal
          isOpen={!!editingFollowup}
          mode="edit"
          initialData={editingFollowup}
          onClose={() => setEditingFollowup(null)}
          onSuccess={() => {
            setEditingFollowup(null);
            loadData();
          }}
          defaultClientId={clientId}
          defaultClientName={clientName}
          isAdmin={isAdmin}
        />
      )}

      {/* Complete Follow-up and Schedule Next Modal */}
      {completingFollowup && (
        <CompleteFollowupModal
          isOpen={!!completingFollowup}
          followup={completingFollowup}
          onClose={() => setCompletingFollowup(null)}
          onSuccess={() => {
            setCompletingFollowup(null);
            loadData();
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
