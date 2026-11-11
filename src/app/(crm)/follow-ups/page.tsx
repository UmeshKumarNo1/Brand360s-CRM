"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { CheckSquare, Search, Plus, CheckCircle2, Clock, Trash2, Calendar, AlertTriangle, RefreshCw, Pencil } from "lucide-react";
import { fetchFollowupsAction, updateFollowupStatusAction, deleteFollowupAction } from "@/app/actions/followups";
import { CreateFollowupModal } from "@/components/followups/CreateFollowupModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<any | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchFollowupsAction();
      if (currentReqId === requestIdRef.current) {
        setFollowups(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load follow-up tasks.");
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    // Optimistic status toggle
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
    );

    try {
      const res = await updateFollowupStatusAction(id, nextStatus);
      if (res.error) {
        toastError("Failed to update status", res.error);
        loadData();
      } else {
        success("Follow-up updated", `Marked as ${nextStatus}.`);
        loadData();
      }
    } catch {
      toastError("Failed to update status", "Server connection error.");
      loadData();
    }
  };

  const handleDelete = async (followup: any) => {
    if (!confirm(`Delete follow-up reminder "${followup.title}"?`)) return;

    setFollowups((prev) => prev.filter((f) => f.id !== followup.id));

    try {
      const res = await deleteFollowupAction(followup.id);
      if (res.error) {
        toastError("Failed to delete follow-up", res.error);
        loadData();
      } else {
        success("Follow-up deleted", "Reminder removed successfully.");
      }
    } catch {
      toastError("Failed to delete follow-up", "Server connection error.");
      loadData();
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const totalCount = followups.length;
  const todayCount = followups.filter((f) => f.dueDate === todayStr && f.status !== "Completed").length;
  const overdueCount = followups.filter((f) => f.dueDate < todayStr && f.status !== "Completed").length;
  const completedCount = followups.filter((f) => f.status === "Completed").length;

  const filteredFollowups = followups.filter((f) => {
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    if (priorityFilter !== "All" && f.priority !== priorityFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.companyName && f.companyName.toLowerCase().includes(q)) ||
      (f.contactPerson && f.contactPerson.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Follow-ups & Reminders</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track pending client communications, document submissions, compliance renewals, and sales callbacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh follow-ups"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Follow-up</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">All Follow-ups</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Due Today</span>
          <p className="text-2xl font-bold text-[#077EA1] mt-1">{todayCount}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Overdue Reminders</span>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>{overdueCount}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Completed</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search follow-ups by title, company, or note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">Status: All</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">Priority: All</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Follow-ups Table */}
      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
                  <th className="py-3 px-4">Task / Reminder</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span>Loading follow-up tasks...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFollowups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No follow-ups found. Click &quot;Create Follow-up&quot; to schedule a reminder.
                    </td>
                  </tr>
                ) : (
                  filteredFollowups.map((f) => {
                    const isOverdue = f.dueDate < todayStr && f.status !== "Completed";
                    return (
                      <tr key={f.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <span className={`font-semibold text-slate-900 block ${f.status === "Completed" ? "line-through text-slate-400" : ""}`}>
                            {f.title}
                          </span>
                          {f.description && (
                            <span className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{f.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {f.clientId ? (
                            <Link href={`/clients/${f.clientId}`} className="font-semibold text-[#077EA1] hover:underline">
                              {f.companyName}
                            </Link>
                          ) : (
                            <span className="text-slate-400 font-medium">General / Internal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{f.type}</td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                            {f.dueDate}
                          </span>
                          {f.dueTime && <span className="text-[10px] text-slate-400 block">{f.dueTime}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            f.priority === "High" ? "bg-rose-50 text-rose-700" : f.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {f.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            f.status === "Completed" ? "bg-emerald-50 text-emerald-700" : isOverdue ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
                          }`}>
                            {f.status === "Completed" ? "Completed" : isOverdue ? "Overdue" : f.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingFollowup(f)}
                              className="p-1 text-slate-400 hover:text-[#077EA1] hover:bg-sky-50 rounded transition-colors cursor-pointer"
                              title="Edit follow-up"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleStatusToggle(f.id, f.status)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                f.status === "Completed" ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={f.status === "Completed" ? "Mark Pending" : "Mark Completed"}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(f)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete follow-up"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateFollowupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
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
        />
      )}
    </div>
  );
}
