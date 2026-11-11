"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  Bell,
  ArrowRight,
} from "lucide-react";
import { FollowupItem } from "@/app/actions/followups";

interface FollowupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowupItem | null;
  onEdit?: (followup: FollowupItem) => void;
  onComplete?: (followup: FollowupItem) => void;
}

export function FollowupDetailModal({
  isOpen,
  onClose,
  followup,
  onEdit,
  onComplete,
}: FollowupDetailModalProps) {
  if (!isOpen || !followup) return null;

  const isCompleted = followup.status === "Completed";
  const isCancelled = followup.status === "Cancelled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 flex items-start gap-3 border-b border-slate-100 bg-[#F0F8FA]">
          <div className="p-2.5 bg-[#E0F2F7] text-[#0481A2] rounded-xl shrink-0">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
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
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{followup.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Details Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Client Card Link */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building size={16} className="text-[#0481A2]" />
              <div>
                <p className="font-bold text-slate-900">{followup.companyName}</p>
                <p className="text-[11px] text-slate-500 font-mono">{followup.clientCode}</p>
              </div>
            </div>
            {followup.clientId && (
              <Link
                href={`/clients/${followup.clientId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0481A2] hover:text-[#036c88]"
              >
                <span>View Client</span>
                <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-slate-200/80 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[11px]">Due Date & Time</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar size={13} className="text-slate-400" />
                {followup.dueDate} {followup.dueTime ? `at ${followup.dueTime}` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Representative</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <User size={13} className="text-slate-400" />
                {followup.assignedToName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Follow-up Type</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{followup.followUpType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Contact Person / Method</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {followup.contactPerson} ({followup.contactMethod || "Phone"})
              </span>
            </div>
          </div>

          {/* Description / Notes */}
          {followup.notes && (
            <div className="space-y-1">
              <span className="font-semibold text-slate-700">Description & Notes:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 leading-relaxed whitespace-pre-wrap">
                {followup.notes}
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
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
  );
}

