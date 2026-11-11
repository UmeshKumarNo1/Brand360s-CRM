"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, CheckSquare, CheckCircle2, Clock, Trash2, Calendar, AlertTriangle, RefreshCw, Pencil } from "lucide-react";
import { fetchClientFollowupsAction, updateFollowupStatusAction, deleteFollowupAction } from "@/app/actions/followups";
import { CreateFollowupModal } from "@/components/followups/CreateFollowupModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

interface ClientFollowupsTabProps {
  clientId: string;
  clientName: string;
}

export function ClientFollowupsTab({ clientId, clientName }: ClientFollowupsTabProps) {
  const [followups, setFollowups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<any | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
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
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
    );

    try {
      const res = await updateFollowupStatusAction(id, nextStatus, clientId);
      if (res.error) {
        toastError("Status update failed", res.error);
        loadData();
      } else {
        success("Follow-up updated", `Status set to ${nextStatus}.`);
        loadData();
      }
    } catch {
      toastError("Status update failed", "Server connection error.");
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this follow-up?")) return;

    setFollowups((prev) => prev.filter((f) => f.id !== id));

    try {
      const res = await deleteFollowupAction(id, clientId);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Follow-up History & Scheduled Tasks</h4>
          <p className="text-xs text-slate-500">Document requests, callbacks, and status reminders</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh follow-ups"
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

      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Title / Task</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-[#0481A2]" />
                      <span>Loading follow-ups...</span>
                    </div>
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No follow-ups recorded for this client. Click &quot;Add Follow-up&quot; to log a task.
                  </td>
                </tr>
              ) : (
                followups.map((f) => {
                  const isOverdue = f.due_date < todayStr && f.status !== "Completed";
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold text-slate-900 block ${f.status === "Completed" ? "line-through text-slate-400" : ""}`}>
                          {f.title}
                        </span>
                        {f.description && <span className="text-[11px] text-slate-400 block line-clamp-1">{f.description}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{f.type}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-medium ${isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                          {f.due_date}
                        </span>
                        {f.due_time && <span className="text-[10px] text-slate-400 block">{f.due_time}</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          f.priority === "High" ? "bg-rose-50 text-rose-700" : f.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {f.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          f.status === "Completed" ? "bg-emerald-50 text-emerald-700" : isOverdue ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
                        }`}>
                          {f.status === "Completed" ? "Completed" : isOverdue ? "Overdue" : f.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingFollowup(f)}
                            className="p-1 text-slate-400 hover:text-[#0481A2] hover:bg-sky-50 rounded transition-colors cursor-pointer"
                            title="Edit follow-up"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleToggle(f.id, f.status)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              f.status === "Completed" ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={f.status === "Completed" ? "Mark Pending" : "Mark Completed"}
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete follow-up"
                          >
                            <Trash2 size={13} />
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
      )}

      <CreateFollowupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
        defaultClientId={clientId}
        defaultClientName={clientName}
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
        />
      )}
    </div>
  );
}
