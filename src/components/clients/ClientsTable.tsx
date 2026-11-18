"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Calendar,
  User,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  UserCheck,
  FileText,
  Plus,
} from "lucide-react";
import { ClientRecord } from "@/data/mockClients";
import { formatINR, cn } from "@/lib/utils";

interface ClientsTableProps {
  clients: ClientRecord[];
  isAdmin?: boolean;
  onDeleteClient?: (client: ClientRecord) => void;
  onArchiveClient?: (client: ClientRecord) => void;
  onRestoreClient?: (client: ClientRecord) => void;
  onReassignClient?: (client: ClientRecord) => void;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr || dateStr === "-" || dateStr === "N/A") return "-";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch { }
  return dateStr;
}

function formatCurrentStage(stage?: string, isComplete?: boolean) {
  if (isComplete) return { title: "Completed", sub: null };
  if (!stage) return { title: "Onboarding", sub: "(Pending)" };

  const match = stage.match(/^(.*?)\s*(\(.*?\))$/);
  if (match) {
    return { title: match[1].trim(), sub: match[2].trim() };
  }
  return { title: stage.trim(), sub: null };
}

function getSalespersonAvatarColor(name: string) {
  const colors = [
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

/** Minimal Progress Pill Badge */
function ProgressBadge({ percent }: { percent: number }) {
  const validPercent = Math.min(100, Math.max(0, percent));
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-sans font-number",
        validPercent === 100
          ? "bg-emerald-500 text-white shadow-2xs"
          : validPercent > 0
          ? "bg-[#0481A2] text-white shadow-2xs"
          : "bg-slate-100 text-slate-500"
      )}
    >
      {validPercent}%
    </span>
  );
}

/** Minimal 5-Stage Stepper matching the reference image */
function FulfillmentStepper({
  status,
}: {
  serviceName?: string;
  status: string;
}) {
  const stages = ["Onboard...", "Doc Collect", "Preparation", "Filing", "Completed"];
  const isCompleted = status === "Completed";
  const isInProgress = status === "In Progress" || status === "Processing";
  const isFiling = status === "Filing";

  let activeIndex = 0;
  if (isCompleted) activeIndex = 4;
  else if (isFiling) activeIndex = 3;
  else if (isInProgress) activeIndex = 2;
  else activeIndex = 0; // Pending / Onboarding

  const linePercent = isCompleted ? 100 : (activeIndex / 4) * 100;

  return (
    <div className="relative w-[260px] py-0.5 select-none">
      {/* 1. Continuous Background Track Line connecting circle centers */}
      <div className="absolute top-[8px] left-[18px] right-[18px] h-[1.5px] bg-slate-200 z-0">
        {/* Filled Portion of Line */}
        <div
          className="h-full bg-[#0481A2] transition-all duration-300"
          style={{ width: `${linePercent}%` }}
        />
      </div>

      {/* 2. Nodes and Labels */}
      <div className="relative z-10 flex items-start justify-between w-full">
        {stages.map((stageName, sIdx) => {
          const isStepDone = sIdx < activeIndex || (sIdx === activeIndex && isCompleted);
          const isStepActive = sIdx === activeIndex && !isCompleted;
          const isStepPending = sIdx > activeIndex;

          return (
            <div key={sIdx} className="flex flex-col items-center w-[46px] shrink-0">
              {/* Circle: 16px x 16px sitting directly on the line */}
              <div
                className={cn(
                  "w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 transition-all",
                  isStepDone && "bg-[#0481A2] text-white shadow-2xs",
                  isStepActive && "border-2 border-[#0481A2] bg-white",
                  isStepPending && "border border-slate-300 bg-white"
                )}
                title={`${stageName} (${isStepDone ? "Completed" : isStepActive ? "Active" : "Pending"})`}
              >
                {isStepDone ? (
                  <Check size={9} strokeWidth={3} className="text-white" />
                ) : isStepActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0481A2]" />
                ) : null}
              </div>

              {/* Label below node */}
              <span
                className={cn(
                  "text-[9px] mt-1 leading-tight text-center truncate max-w-full",
                  isStepActive && "text-[#0481A2] font-bold",
                  isStepDone && "text-slate-600 font-medium",
                  isStepPending && "text-slate-400 font-normal"
                )}
                title={stageName}
              >
                {stageName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClientsTable({
  clients,
  isAdmin = false,
  onDeleteClient,
  onArchiveClient,
  onRestoreClient,
  onReassignClient,
}: ClientsTableProps) {
  // Default first client to expanded so user immediately sees the rich UI, or keep state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return clients.length > 0 ? new Set([clients[0].id]) : new Set();
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIds.size === clients.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(clients.map((c) => c.id)));
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden w-full max-w-full">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs sm:text-[13px] min-w-[1080px]">
          {/* Column Proportions */}
          <colgroup>
            {/* 1. No. & Toggle */}
            <col style={{ width: "4%" }} />
            {/* 2. Client / Company */}
            <col style={{ width: "17%" }} />
            {/* 3. Salesperson */}
            <col style={{ width: "11%" }} />
            {/* 4. Contract */}
            <col style={{ width: "9%" }} />
            {/* 5. Invoiced */}
            <col style={{ width: "9%" }} />
            {/* 6. Collected */}
            <col style={{ width: "9%" }} />
            {/* 7. Outstanding */}
            <col style={{ width: "9%" }} />
            {/* 8. Services Progress */}
            <col style={{ width: "12%" }} />
            {/* 9. Next Action */}
            <col style={{ width: "11%" }} />
            {/* 10. Next Due Date */}
            <col style={{ width: "8%" }} />
            {/* 11. Actions */}
            <col style={{ width: "8%" }} />
          </colgroup>

          {/* Navy Blue Table Header */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide align-middle">
              <th className="py-3 px-2 text-center font-semibold">
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="hover:text-sky-200 transition-colors cursor-pointer"
                  title={expandedIds.size === clients.length ? "Collapse all" : "Expand all"}
                >
                  No.
                </button>
              </th>
              <th className="py-3 px-2.5 sm:px-3 text-left font-semibold leading-tight">
                Client / Company
              </th>
              <th className="py-3 px-2 sm:px-3 text-left font-semibold leading-tight">
                Salesperson
              </th>
              <th className="py-3 px-2 sm:px-3 text-right font-semibold leading-tight">
                Contract
              </th>
              <th className="py-3 px-2 sm:px-3 text-right font-semibold leading-tight">
                Invoiced
              </th>
              <th className="py-3 px-2 sm:px-3 text-right font-semibold leading-tight">
                Collected
              </th>
              <th className="py-3 px-2 sm:px-3 text-right font-semibold leading-tight">
                Outstanding
              </th>
              <th className="py-3 px-2 sm:px-3 text-center font-semibold leading-tight">
                Services Progress
              </th>
              <th className="py-3 px-2 sm:px-3 text-left font-semibold leading-tight">
                Next Action
              </th>
              <th className="py-3 px-2 sm:px-3 text-center font-semibold leading-tight">
                Next Due Date
              </th>
              <th className="py-3 px-2 text-center font-semibold min-w-[88px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                  No client records found matching your filters.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const isArchived = client.clientStatus === "Archived";
                const isExpanded = expandedIds.has(client.id);
                const services = client.services || [];
                const completedServicesCount =
                  client.servicesCompletedCount ??
                  services.filter((s) => s.service_status === "Completed").length;
                const totalServicesCount =
                  client.servicesTotalCount ?? (services.length > 0 ? services.length : 1);
                const progressPercent =
                  client.servicesProgressPercent ??
                  (totalServicesCount > 0
                    ? Math.round((completedServicesCount / totalServicesCount) * 100)
                    : 0);

                const spInitial = client.salesperson
                  ? client.salesperson
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                  : "SP";

                return (
                  <tr key={client.id} className="contents">
                    {/* Master Row */}
                    <tr
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100",
                        isArchived && "opacity-75 bg-slate-50/30",
                        isExpanded && "bg-sky-50/30"
                      )}
                    >
                      {/* 1. No. & Expand Chevron Button */}
                      <td className="py-3 px-2 text-center font-bold text-slate-800 font-sans font-number align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-4 text-center">{client.no}</span>
                          <button
                            type="button"
                            onClick={() => toggleExpand(client.id)}
                            className="w-5 h-5 rounded-full hover:bg-slate-200/80 flex items-center justify-center transition-all cursor-pointer text-slate-500 hover:text-slate-800"
                            title={isExpanded ? "Collapse services" : "Expand services"}
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown
                              size={14}
                              className={cn(
                                "transition-transform duration-200",
                                isExpanded ? "rotate-0 text-[#0481A2]" : "-rotate-90"
                              )}
                            />
                          </button>
                        </div>
                      </td>

                      {/* 2. Client / Company Name & GSTIN */}
                      <td className="py-3 px-2.5 sm:px-3 align-middle">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/clients/${client.id}`}
                              className="font-bold text-[#1E3A5F] hover:text-[#0481A2] hover:underline transition-colors inline-flex items-center gap-1 group truncate max-w-[200px]"
                              title={client.companyName}
                            >
                              <span className="truncate">{client.companyName}</span>
                              <ArrowUpRight
                                size={12}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2] shrink-0"
                              />
                            </Link>
                            {isArchived && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                Archived
                              </span>
                            )}
                          </div>
                          {client.gstin ? (
                            <span className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                              GSTIN: {client.gstin}
                            </span>
                          ) : client.phone ? (
                            <span className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {client.contactPerson ? `${client.contactPerson} • ` : ""}
                              {client.phone}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 mt-0.5 truncate">
                              Created: {formatDate(client.dateOfCreation || client.createdAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Salesperson with Circle Avatar */}
                      <td className="py-3 px-2 sm:px-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs",
                              getSalespersonAvatarColor(client.salesperson)
                            )}
                          >
                            {spInitial}
                          </div>
                          <span
                            className="text-xs font-semibold text-slate-800 truncate"
                            title={client.salesperson}
                          >
                            {client.salesperson}
                          </span>
                        </div>
                      </td>

                      {/* 4. Contract Value */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-slate-900 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.contractValue)}
                      </td>

                      {/* 5. Invoiced */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-slate-700 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.contractValue)}
                      </td>

                      {/* 6. Collected */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-emerald-600 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.paymentsReceived)}
                      </td>

                      {/* 7. Outstanding */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold font-sans font-number whitespace-nowrap align-middle">
                        {client.balanceReceivable > 0 ? (
                          <span className="text-red-500">{formatINR(client.balanceReceivable)}</span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0</span>
                        )}
                      </td>

                      {/* 8. Services Progress Bar & Count */}
                      <td className="py-3 px-2 sm:px-3 align-middle">
                        <div className="flex flex-col items-center gap-1 w-full max-w-[140px] mx-auto">
                          <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200/70 overflow-hidden shadow-2xs">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 font-sans font-number leading-tight">
                            {completedServicesCount} / {totalServicesCount} Services ({progressPercent}%)
                          </span>
                        </div>
                      </td>

                      {/* 9. Next Action / Follow-up */}
                      <td className="py-3 px-2 sm:px-3 align-middle">
                        {client.nextActionTitle ? (
                          <div className="flex items-start gap-1.5 min-w-0 max-w-[160px]">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p
                                className="text-xs font-semibold text-slate-800 truncate leading-tight"
                                title={client.nextActionTitle}
                              >
                                {client.nextActionTitle}
                              </p>
                              {client.nextActionDueDate && (
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                                  Due: {formatDate(client.nextActionDueDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">-</span>
                        )}
                      </td>

                      {/* 10. Next Due Date with Red Calendar Badge */}
                      <td className="py-3 px-2 sm:px-3 text-center align-middle whitespace-nowrap">
                        {client.nextPaymentDueDate && client.nextPaymentDueDate !== "-" ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-sans font-number shadow-2xs">
                            <Calendar size={13} className="text-rose-500 shrink-0" />
                            <span>{formatDate(client.nextPaymentDueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">-</span>
                        )}
                      </td>

                      {/* 11. Action Buttons */}
                      <td className="py-3 px-2 text-center whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">
                          {/* View Action (Eye) */}
                          <Link
                            href={`/clients/${client.id}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all shadow-2xs"
                            title="View Client Portfolio"
                          >
                            <Eye size={13} strokeWidth={2} />
                          </Link>

                          {/* Edit Action (Pencil) */}
                          <Link
                            href={`/clients/${client.id}/edit`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0481A2] border border-sky-200 transition-all shadow-2xs"
                            title="Edit Client Details"
                          >
                            <Edit3 size={13} strokeWidth={2} />
                          </Link>

                          {/* Admin Reassign Action */}
                          {isAdmin && onReassignClient && (
                            <button
                              type="button"
                              onClick={() => onReassignClient(client)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all shadow-2xs cursor-pointer"
                              title="Reassign Salesperson (Admin)"
                            >
                              <UserCheck size={13} strokeWidth={2} />
                            </button>
                          )}

                          {/* Admin Restore Action (if archived) */}
                          {isAdmin && isArchived && onRestoreClient && (
                            <button
                              type="button"
                              onClick={() => onRestoreClient(client)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 transition-all shadow-2xs cursor-pointer"
                              title="Restore Client to Active"
                            >
                              <RotateCcw size={13} strokeWidth={2} />
                            </button>
                          )}

                          {/* Admin Delete Action */}
                          {isAdmin && onDeleteClient && (
                            <button
                              type="button"
                              onClick={() => onDeleteClient(client)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-2xs cursor-pointer"
                              title="Delete Client (Admin)"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Child Services Portfolio (Minimal Clean UI) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 border-b border-slate-200 transition-all">
                        <td colSpan={11} className="py-2.5 px-3 sm:px-4">
                          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                            {/* 1. Minimal Light Child Header */}
                            <div className="px-4 py-2.5 bg-[#F0F5FA] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Left: Clean Title */}
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1E3A5F] text-xs sm:text-[13px] tracking-tight">
                                  Services for {client.companyName} ({services.length})
                                </span>
                              </div>

                              {/* Right: Clean Financial Metrics separated by subtle pipes */}
                              <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap font-medium">
                                <span>
                                  Contract:{" "}
                                  <strong className="text-slate-900 font-sans font-number font-bold">
                                    {formatINR(client.contractValue)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Invoiced:{" "}
                                  <strong className="text-slate-900 font-sans font-number font-bold">
                                    {formatINR(client.contractValue)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Collected:{" "}
                                  <strong className="text-emerald-600 font-sans font-number font-bold">
                                    {formatINR(client.paymentsReceived)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Outstanding:{" "}
                                  <strong
                                    className={cn(
                                      "font-sans font-number font-bold",
                                      client.balanceReceivable > 0 ? "text-red-500" : "text-slate-500"
                                    )}
                                  >
                                    {formatINR(client.balanceReceivable)}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* 2. Services Sub-Table */}
                            {services.length === 0 ? (
                              <div className="py-6 px-4 text-center">
                                <p className="text-xs text-slate-500">
                                  No dedicated services assigned to this client yet.
                                </p>
                                <Link
                                  href={`/clients/${client.id}?tab=services`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-[#036c88] transition-colors mt-2.5"
                                >
                                  <Plus size={14} />
                                  <span>Assign Service</span>
                                </Link>
                              </div>
                            ) : (
                              <div className="overflow-x-auto w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead className="bg-slate-50/70 border-b border-slate-100">
                                    <tr className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                                      <th className="py-2 px-3.5 text-left">SERVICE</th>
                                      <th className="py-2 px-3 text-center">CONTRACT VALUE</th>
                                      <th className="py-2 px-3 text-center">PAYMENT</th>
                                      <th className="py-2 px-3 text-center min-w-[260px]">
                                        FULFILLMENT PROGRESS (STAGES)
                                      </th>
                                      <th className="py-2 px-3 text-center">PROGRESS</th>
                                      <th className="py-2 px-3 text-center">CURRENT STAGE</th>
                                      <th className="py-2 px-3 text-center">ASSIGNED TO</th>
                                      <th className="py-2 px-3.5 text-center">DUE DATE</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {services.map((service, sIdx) => {
                                      const isServComplete =
                                        service.service_status === "Completed";
                                      const isServInProgress =
                                        service.service_status === "In Progress" ||
                                        service.service_status === "Processing";

                                      return (
                                        <tr
                                          key={service.id || sIdx}
                                          className="hover:bg-slate-50/60 transition-colors"
                                        >
                                          {/* SERVICE: Minimal icon + Name & Category */}
                                          <td className="py-2.5 px-3.5 align-middle">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
                                                <FileText size={14} />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 text-xs leading-tight truncate">
                                                  {service.service_name}
                                                </p>
                                                <p className="text-[10.5px] text-slate-400 mt-0.5 leading-tight truncate">
                                                  {service.service_category || "Company Incorporation"}
                                                </p>
                                              </div>
                                            </div>
                                          </td>

                                          {/* CONTRACT VALUE */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap font-bold text-slate-800 font-sans font-number text-xs">
                                            {formatINR(service.total_amount)}
                                          </td>

                                          {/* PAYMENT: Minimal pill + amount subtext */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex flex-col items-center">
                                              <span
                                                className={cn(
                                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                                  service.paymentStatus === "Paid" &&
                                                    "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                  service.paymentStatus === "Partial" &&
                                                    "bg-amber-50 text-amber-700 border border-amber-200",
                                                  service.paymentStatus !== "Paid" &&
                                                    service.paymentStatus !== "Partial" &&
                                                    "bg-rose-50 text-rose-700 border border-rose-200"
                                                )}
                                              >
                                                {service.paymentStatus || "Unpaid"}
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-medium font-sans font-number mt-0.5">
                                                {service.paymentStatus === "Paid"
                                                  ? formatINR(service.total_amount)
                                                  : service.paymentStatus === "Partial"
                                                  ? `${formatINR(service.amountPaid || 0)} / ${formatINR(service.total_amount)}`
                                                  : `₹0 / ${formatINR(service.total_amount)}`}
                                              </span>
                                            </div>
                                          </td>

                                          {/* FULFILLMENT PROGRESS (STAGES) */}
                                          <td className="py-2.5 px-3 align-middle">
                                            <div className="flex justify-center">
                                              <FulfillmentStepper
                                                serviceName={service.service_name}
                                                status={service.service_status}
                                              />
                                            </div>
                                          </td>

                                          {/* PROGRESS: Minimal Pill Badge */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="flex justify-center">
                                              <ProgressBadge
                                                percent={
                                                  service.progressPercent ??
                                                  (isServComplete ? 100 : 20)
                                                }
                                              />
                                            </div>
                                          </td>

                                          {/* CURRENT STAGE: Minimal typography */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                            {(() => {
                                              const { title, sub } = formatCurrentStage(service.stage, isServComplete);
                                              if (isServComplete) {
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                                    Completed
                                                  </span>
                                                );
                                              }
                                              return (
                                                <div className="inline-block text-left leading-tight">
                                                  <p className="text-xs font-semibold text-slate-800">{title}</p>
                                                  {sub && (
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </td>

                                          {/* ASSIGNED TO: Clean text with user icon */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                              <User size={12} className="text-slate-400 shrink-0" />
                                              <span className="font-medium text-slate-700">
                                                {service.assigned_employee_name || "Unassigned"}
                                              </span>
                                            </div>
                                          </td>

                                          {/* DUE DATE: Clean text with calendar icon */}
                                          <td className="py-2.5 px-3.5 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-sans font-number">
                                              <Calendar size={13} className="text-slate-400 shrink-0" />
                                              <span className="font-medium text-slate-700">
                                                {service.expected_completion_date
                                                  ? formatDate(service.expected_completion_date)
                                                  : "-"}
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
