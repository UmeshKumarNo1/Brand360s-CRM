"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { History, User, Calendar, RefreshCw, FileText } from "lucide-react";
import { fetchClientActivityHistoryAction } from "@/app/actions/client-delete";

interface ClientActivityTabProps {
  clientId: string;
}

export function ClientActivityTab({ clientId }: ClientActivityTabProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const logs = await fetchClientActivityHistoryAction(clientId);
      if (currentReqId === requestIdRef.current) {
        setActivities(logs || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load activity logs.");
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

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
      case "CREATED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REASSIGN":
      case "REASSIGNED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ARCHIVE":
      case "ARCHIVED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RESTORE":
      case "RESTORED":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "DELETE":
      case "DELETED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History size={16} className="text-[#0481A2]" />
          <h3 className="font-semibold text-slate-800 text-sm">Audit & Activity Log</h3>
        </div>
        <button
          onClick={loadData}
          className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title="Refresh activities"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-[#0481A2]" />
          <span>Loading activity history...</span>
        </div>
      ) : errorMessage ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {errorMessage}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No recorded activity events for this client yet. Actions like edits, reassignments, and archiving will be logged here automatically.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {activities.map((item) => (
            <div key={item.id} className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#0481A2] border-2 border-white ring-2 ring-slate-100" />
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(
                        item.action
                      )}`}
                    >
                      {item.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.entityName || "Client Record"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar size={11} />
                    {item.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <User size={12} className="text-slate-400" />
                  <span>
                    Initiated by: <strong className="text-slate-700">{item.actorName}</strong>
                    {item.actorRole && ` (${item.actorRole})`}
                  </span>
                </div>

                {item.details && Object.keys(item.details).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg">
                    {item.details.reason && (
                      <p className="font-sans text-slate-700 mb-1">
                        <strong>Reason:</strong> {item.details.reason}
                      </p>
                    )}
                    {item.details.new_salesperson_name && (
                      <p className="font-sans text-slate-700">
                        <strong>Reassigned To:</strong> {item.details.new_salesperson_name}
                      </p>
                    )}
                    {item.details.deleted_by_name && (
                      <p className="font-sans text-slate-700">
                        <strong>Deleted By:</strong> {item.details.deleted_by_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

