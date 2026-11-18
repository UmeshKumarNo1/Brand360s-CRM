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
  Clock,
  LayoutGrid,
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

/** Circular Donut Progress Ring matching UI */
function CircularProgress({ percent }: { percent: number }) {
  const radius = 17;
  const circumference = 2 * Math.PI * radius; // ~106.8
  const validPercent = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (validPercent / 100) * circumference;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        {/* Background track */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke="#E2E8F0"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Foreground colored arc */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke="#0481A2"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Centered percentage text */}
      <span className="absolute font-bold text-slate-800 text-[11px] font-sans font-number">
        {validPercent}%
      </span>
    </div>
  );
}

/** 5-Stage Stepper matching the reference image */
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

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 min-w-[270px] max-w-[320px] py-1">
      {stages.map((stageName, sIdx) => {
        const isStepDone = sIdx < activeIndex || (sIdx === activeIndex && isCompleted);
        const isStepActive = sIdx === activeIndex && !isCompleted;
        const isStepPending = sIdx > activeIndex;

        return (
          <div key={sIdx} className="flex items-center flex-1 min-w-0 last:flex-none">
            {/* Step Node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all shrink-0",
                  isStepDone && "bg-[#0481A2] text-white shadow-2xs",
                  isStepActive && "border-2 border-[#0481A2] bg-white text-[#0481A2]",
                  isStepPending && "border-2 border-slate-200 bg-white"
                )}
                title={`${stageName} (${isStepDone ? "Completed" : isStepActive ? "Active" : "Pending"})`}
              >
                {isStepDone ? (
                  <Check size={10} strokeWidth={3} />
                ) : isStepActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0481A2]" />
                ) : null}
              </div>
              <span
                className={cn(
                  "text-[9px] mt-1 whitespace-nowrap leading-tight text-center max-w-[50px] truncate",
                  isStepActive && "text-[#0481A2] font-bold",
                  isStepDone && "text-slate-600 font-semibold",
                  isStepPending && "text-slate-400 font-medium"
                )}
                title={stageName}
              >
                {stageName}
              </span>
            </div>

            {/* Connecting Line */}
            {sIdx < stages.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 -mt-3.5 transition-colors",
                  isStepDone ? "bg-[#0481A2]" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
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

                    {/* Expanded Child Services Portfolio (Matching Reference Image) */}
                    {isExpanded && (
                      <tr className="bg-[#F8FAFC] border-b-2 border-slate-200 transition-all">
                        <td colSpan={11} className="p-3 sm:p-5">
                          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                            {/* 1. Dark Navy Child Header Banner matching reference image */}
                            <div className="px-4 py-3 bg-[#0F2347] flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
                              {/* Left: Icon & Title */}
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                  <LayoutGrid size={15} />
                                </div>
                                <span className="font-bold text-white text-xs sm:text-sm tracking-wide">
                                  Services for {client.companyName} ({services.length})
                                </span>
                              </div>

                              {/* Right: Colored Bullet Metrics matching reference image */}
                              <div className="flex items-center gap-4 sm:gap-6 text-xs flex-wrap font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0" />
                                  <span className="text-slate-300">Contract:</span>
                                  <span className="font-bold text-white font-sans font-number">
                                    {formatINR(client.contractValue)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7] shrink-0" />
                                  <span className="text-slate-300">Invoiced:</span>
                                  <span className="font-bold text-white font-sans font-number">
                                    {formatINR(client.contractValue)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shrink-0" />
                                  <span className="text-slate-300">Collected:</span>
                                  <span className="font-bold text-white font-sans font-number">
                                    {formatINR(client.paymentsReceived)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
                                  <span className="text-slate-300">Outstanding:</span>
                                  <span className="font-bold text-white font-sans font-number">
                                    {formatINR(client.balanceReceivable)}
                                  </span>
                                </div>
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
                                  <thead className="bg-[#F1F6FB] border-b border-slate-200">
                                    <tr className="text-[10.5px] font-bold text-[#1E3A5F] tracking-wider uppercase">
                                      <th className="py-2.5 px-4 text-left">SERVICE</th>
                                      <th className="py-2.5 px-3 text-center">CONTRACT VALUE</th>
                                      <th className="py-2.5 px-3 text-center">PAYMENT</th>
                                      <th className="py-2.5 px-3 text-center min-w-[270px]">
                                        FULFILLMENT PROGRESS (STAGES)
                                      </th>
                                      <th className="py-2.5 px-3 text-center">PROGRESS</th>
                                      <th className="py-2.5 px-3 text-center">CURRENT STAGE</th>
                                      <th className="py-2.5 px-3 text-center">ASSIGNED TO</th>
                                      <th className="py-2.5 px-3 text-center">DUE DATE</th>
                                      <th className="py-2.5 px-4 text-center">STATUS</th>
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
                                          {/* SERVICE: Light blue squircle with FileText icon + Name & Category */}
                                          <td className="py-3.5 px-4 align-middle">
                                            <div className="flex items-center gap-3">
                                              <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] text-[#0284C7] flex items-center justify-center shrink-0 shadow-2xs">
                                                <FileText size={17} />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="font-bold text-[#0F172A] text-xs leading-tight">
                                                  {service.service_name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                                                  {service.service_category || "Company Incorporation"}
                                                </p>
                                              </div>
                                            </div>
                                          </td>

                                          {/* CONTRACT VALUE */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap font-bold text-slate-900 font-sans font-number text-xs sm:text-sm">
                                            {formatINR(service.total_amount)}
                                          </td>

                                          {/* PAYMENT: Unpaid/Paid/Partial pill + amount subtext */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex flex-col items-center">
                                              <span
                                                className={cn(
                                                  "px-3 py-0.5 rounded-full text-[10px] font-bold shadow-2xs",
                                                  service.paymentStatus === "Paid" &&
                                                    "bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]",
                                                  service.paymentStatus === "Partial" &&
                                                    "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]",
                                                  service.paymentStatus !== "Paid" &&
                                                    service.paymentStatus !== "Partial" &&
                                                    "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                                                )}
                                              >
                                                {service.paymentStatus || "Unpaid"}
                                              </span>
                                              <span className="text-[10px] font-bold font-sans font-number text-slate-600 mt-1">
                                                {service.paymentStatus === "Paid"
                                                  ? formatINR(service.total_amount)
                                                  : service.paymentStatus === "Partial"
                                                  ? `${formatINR(service.amountPaid || 0)} / ${formatINR(service.total_amount)}`
                                                  : `₹0 / ${formatINR(service.total_amount)}`}
                                              </span>
                                            </div>
                                          </td>

                                          {/* FULFILLMENT PROGRESS (STAGES): 5-Stage Stepper with target ring */}
                                          <td className="py-3.5 px-3 align-middle">
                                            <div className="flex justify-center">
                                              <FulfillmentStepper
                                                serviceName={service.service_name}
                                                status={service.service_status}
                                              />
                                            </div>
                                          </td>

                                          {/* PROGRESS: Circular Donut Ring Chart */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="flex justify-center">
                                              <CircularProgress
                                                percent={
                                                  service.progressPercent ??
                                                  (isServComplete ? 100 : 20)
                                                }
                                              />
                                            </div>
                                          </td>

                                          {/* CURRENT STAGE: Soft cyan/teal rounded pill with Clock icon */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E0F7FA] text-[#00695C] border border-[#B2EBF2] shadow-2xs text-left">
                                              <Clock size={13} className="text-[#00695C] shrink-0" />
                                              <div className="leading-tight">
                                                <p className="text-[11px] font-bold">
                                                  {isServComplete
                                                    ? "Completed"
                                                    : service.stage || "Onboarding"}
                                                </p>
                                                {!isServComplete && (
                                                  <p className="text-[9px] font-medium text-[#00796B]/80">
                                                    (Pending)
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </td>

                                          {/* ASSIGNED TO: Soft gray pill with User icon */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-slate-200/90 shadow-2xs text-xs">
                                              <User size={13} className="text-[#0284C7] shrink-0" />
                                              <span className="font-semibold text-slate-700 text-xs">
                                                {service.assigned_employee_name || "Unassigned"}
                                              </span>
                                            </div>
                                          </td>

                                          {/* DUE DATE: Calendar icon + date */}
                                          <td className="py-3.5 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-sans font-number">
                                              <Calendar size={14} className="text-[#0284C7] shrink-0" />
                                              <span className="font-bold text-slate-800">
                                                {service.expected_completion_date
                                                  ? formatDate(service.expected_completion_date)
                                                  : "01 Dec 2026"}
                                              </span>
                                            </div>
                                          </td>

                                          {/* STATUS: Amber Pending / Emerald Completed pill */}
                                          <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                                            {isServComplete ? (
                                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] shadow-2xs text-xs font-bold">
                                                <CheckCircle2 size={13} className="text-[#16A34A] shrink-0" />
                                                <span>Completed</span>
                                              </div>
                                            ) : isServInProgress ? (
                                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] shadow-2xs text-xs font-bold">
                                                <Clock size={13} className="text-[#0284C7] shrink-0" />
                                                <span>In Progress</span>
                                              </div>
                                            ) : (
                                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] shadow-2xs text-xs font-bold">
                                                <Clock size={13} className="text-[#D97706] shrink-0" />
                                                <span>Pending</span>
                                              </div>
                                            )}
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
