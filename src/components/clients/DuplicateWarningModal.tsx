"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { DuplicateMatch } from "@/lib/validation/duplicate-detector";

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: DuplicateMatch[];
  isBlocked: boolean; // True if email already belongs to an active client
  isAdmin: boolean;
  onProceedAnyway?: () => void;
  isSubmitting?: boolean;
}

export function DuplicateWarningModal({
  isOpen,
  onClose,
  matches,
  isBlocked,
  isAdmin,
  onProceedAnyway,
  isSubmitting,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-5 flex items-start gap-4 border-b ${isBlocked ? "bg-red-50/70 border-red-100" : "bg-amber-50/70 border-amber-100"}`}>
          <div className={`p-2.5 rounded-xl shrink-0 ${isBlocked ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
            {isBlocked ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-bold ${isBlocked ? "text-red-900" : "text-amber-900"}`}>
              {isBlocked ? "Duplicate Active Client Detected (Blocked)" : "Potential Duplicate Client Records Found"}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {isBlocked
                ? "A client with this email address is already active in BRAND 360s CRM. Duplicate active client records with identical email are prevented to protect financial and billing integrity."
                : "One or more existing clients match the provided company name, phone number, or email. Please inspect the existing records below before proceeding."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Matches Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {matches.map((m) => (
            <div key={m.id} className="pt-3.5 first:pt-0 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{m.companyName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {m.clientCode}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      m.clientStatus === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : m.clientStatus === "Archived"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {m.clientStatus}
                  </span>
                </div>

                <Link
                  href={`/clients/${m.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0481A2] hover:underline"
                >
                  <span>View Client</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Match pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500">Matched on:</span>
                {m.matchReasons.includes("email") && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-medium">
                    Email ({m.email})
                  </span>
                )}
                {m.matchReasons.includes("phone") && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium">
                    Phone ({m.phone})
                  </span>
                )}
                {m.matchReasons.includes("companyName") && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                    Company Name
                  </span>
                )}
              </div>

              {/* Details table preview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Contact Person</span>
                  <span className="font-medium text-slate-700">{m.contactPerson || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Salesperson</span>
                  <span className="font-medium text-slate-700">{m.assignedSalespersonName || "Admin"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contract Value</span>
                  <span className="font-medium text-slate-700">₹{m.contractValue.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Review & Edit Form
          </button>

          {!isBlocked && isAdmin && onProceedAnyway && (
            <button
              type="button"
              onClick={onProceedAnyway}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#243E76] hover:bg-[#1a2d56] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Creating..." : "Proceed Anyway (Admin Override)"}
            </button>
          )}

          {isBlocked && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <ShieldAlert size={14} />
              <span>Duplicate Active Email Not Allowed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

