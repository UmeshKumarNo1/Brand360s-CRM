"use client";

import { X, Clock, User, Calendar, Activity, CheckCircle2, AlertCircle, FileText, CreditCard } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type?: string;
}

interface ServiceActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  clientName: string;
  activities: ActivityItem[];
}

export function ServiceActivityHistoryModal({
  isOpen,
  onClose,
  serviceName,
  clientName,
  activities,
}: ServiceActivityHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Full Service Activity</h3>
              <p className="text-[11px] text-slate-500">
                {serviceName} • <span className="font-semibold text-slate-700">{clientName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Activity Timeline List */}
        <div className="p-6 max-h-[65vh] overflow-y-auto text-xs space-y-4">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No activity recorded for this service yet.</p>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {activities.map((act) => {
                const dateStr = act.timestamp
                  ? new Date(act.timestamp).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-";

                const isCompleted = act.type === "status" || act.title.toLowerCase().includes("complete");
                const isPayment = act.type === "payment";
                const isInvoice = act.type === "invoice";

                return (
                  <div key={act.id} className="relative flex items-start gap-3">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        isCompleted
                          ? "bg-emerald-600"
                          : isPayment
                          ? "bg-emerald-500"
                          : isInvoice
                          ? "bg-[#0481A2]"
                          : "bg-slate-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0 bg-slate-50/70 border border-slate-100 p-3 rounded-xl">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-slate-900 font-bold block">{act.title}</strong>
                        <span className="text-[10px] text-slate-400 font-sans font-number shrink-0">{dateStr}</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
