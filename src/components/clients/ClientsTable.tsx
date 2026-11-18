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
  Layers,
  ShieldCheck,
  Globe,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { ClientRecord, ClientServiceItem } from "@/data/mockClients";
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
  } catch {}
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

function getServiceIcon(name: string, category?: string) {
  const lower = (name + " " + (category || "")).toLowerCase();
  if (lower.includes("trademark") || lower.includes("tm ") || lower.includes("brand") || lower.includes("ip")) {
    return <ShieldCheck size={15} className="text-emerald-600 shrink-0" />;
  }
  if (lower.includes("annual") || lower.includes("roc") || lower.includes("compliance") || lower.includes("gst")) {
    return <FileText size={15} className="text-blue-600 shrink-0" />;
  }
  if (lower.includes("web") || lower.includes("design") || lower.includes("app") || lower.includes("tech")) {
    return <Globe size={15} className="text-indigo-600 shrink-0" />;
  }
  if (lower.includes("llp") || lower.includes("incorporation") || lower.includes("pvt")) {
    return <Layers size={15} className="text-[#0481A2] shrink-0" />;
  }
  return <FileSpreadsheet size={15} className="text-slate-600 shrink-0" />;
}

function getServiceStages(serviceName: string) {
  const lower = serviceName.toLowerCase();
  if (lower.includes("trademark") || lower.includes("tm ") || lower.includes("brand")) {
    return ["Onboarding", "Search & Check", "Filing", "Examination", "Registration"];
  }
  if (lower.includes("annual") || lower.includes("compliance") || lower.includes("roc") || lower.includes("gst")) {
    return ["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"];
  }
  if (lower.includes("web") || lower.includes("design") || lower.includes("dev")) {
    return ["Briefing", "Wireframing", "Development", "Review", "Launched"];
  }
  return ["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"];
}

function FulfillmentStepper({
  serviceName,
  status,
}: {
  serviceName: string;
  status: string;
}) {
  const stages = getServiceStages(serviceName);
  const isCompleted = status === "Completed";
  const isInProgress = status === "In Progress" || status === "Processing";
  const isFiling = status === "Filing";

  let activeIndex = 0;
  if (isCompleted) activeIndex = 4;
  else if (isFiling) activeIndex = 3;
  else if (isInProgress) activeIndex = 2;
  else activeIndex = 0; // Pending

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 min-w-[280px] max-w-[340px] py-1">
      {stages.map((stageName, sIdx) => {
        const isStepDone = sIdx < activeIndex || (sIdx === activeIndex && isCompleted);
        const isStepActive = sIdx === activeIndex && !isCompleted;
        const isStepPending = sIdx > activeIndex;

        return (
          <div key={sIdx} className="flex items-center flex-1 min-w-0 last:flex-none">
            {/* Stage Node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all shrink-0",
                  isStepDone && "bg-emerald-500 text-white shadow-2xs",
                  isStepActive && "border-2 border-blue-600 bg-white text-blue-600 ring-2 ring-blue-100",
                  isStepPending && "border border-slate-300 bg-white text-slate-400"
                )}
                title={`${stageName} (${isStepDone ? "Completed" : isStepActive ? "In Progress" : "Pending"})`}
              >
                {isStepDone ? (
                  <Check size={10} strokeWidth={3} />
                ) : isStepActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                ) : null}
              </div>
              <span
                className={cn(
                  "text-[8.5px] mt-0.5 whitespace-nowrap leading-tight text-center max-w-[50px] truncate font-medium",
                  isStepDone && "text-slate-600 font-semibold",
                  isStepActive && "text-blue-700 font-bold bg-blue-50 px-1 rounded border border-blue-200",
                  isStepPending && "text-slate-400"
                )}
                title={stageName}
              >
                {stageName}
              </span>
            </div>

            {/* Connecting Connector Line */}
            {sIdx < stages.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 -mt-3.5 transition-colors",
                  isStepDone ? "bg-emerald-500" : "bg-slate-200"
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
          {/* Proportional Column Widths */}
          <colgroup>
            {/* 1. No. & Toggle */}
            <col style={{ width: "4%" }} />
            {/* 2. Client / Company */}
            <col style={{ width: "17%" }} />
            {/* 3. Salesperson */}
            <col style={{ width: "11%" }} />
            {/* 4. Contract */}
            <col style={{ width: "9%" }} />
            {/* 5. Invoiced / Contract Value */}
            <col style={{ width: "9%" }} />
            {/* 6. Collected */}
            <col style={{ width: "9%" }} />
            {/* 7. Outstanding */}
            <col style={{ width: "9%" }} />
            {/* 8. Services Progress */}
            <col style={{ width: "12%" }} />
            {/* 9. Next Action / Follow-up */}
            <col style={{ width: "11%" }} />
            {/* 10. Next Due Date */}
            <col style={{ width: "8%" }} />
            {/* 11. Actions */}
            <col style={{ width: "8%" }} />
          </colgroup>

          {/* Navy Blue Table Header matching design */}
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
                        isExpanded && "bg-sky-50/40"
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

                      {/* 5. Invoiced (Equal to contract value or payments billed) */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-slate-700 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.contractValue)}
                      </td>

                      {/* 6. Collected (Payments Received) in Bold Green */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-emerald-600 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.paymentsReceived)}
                      </td>

                      {/* 7. Outstanding (Balance Receivable) in Bold Red/Amber */}
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
                          {/* Progress Track & Fill */}
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

                          {/* Admin Reassign Quick Action */}
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

                    {/* Expanded Child Services Portfolio */}
                    {isExpanded && (
                      <tr className="bg-[#F8FAFC] border-b-2 border-slate-200 transition-all">
                        <td colSpan={11} className="p-3 sm:p-5">
                          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                            {/* Child Header with Title and Financial Breakdown */}
                            <div className="px-4 py-3 bg-[#F0F5FA] border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1E3A5F] text-xs sm:text-sm">
                                  Services for {client.companyName} ({services.length})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 flex-wrap">
                                <span>
                                  Contract:{" "}
                                  <strong className="text-slate-900 font-sans font-number">
                                    {formatINR(client.contractValue)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Invoiced:{" "}
                                  <strong className="text-slate-900 font-sans font-number">
                                    {formatINR(client.contractValue)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Collected:{" "}
                                  <strong className="text-emerald-600 font-sans font-number">
                                    {formatINR(client.paymentsReceived)}
                                  </strong>
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>
                                  Outstanding:{" "}
                                  <strong className="text-red-500 font-sans font-number">
                                    {formatINR(client.balanceReceivable)}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* Services Sub-Table */}
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
                                  <thead>
                                    <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                      <th className="py-2.5 px-3">Service</th>
                                      <th className="py-2.5 px-3 text-right">Contract Value</th>
                                      <th className="py-2.5 px-3 text-center">Payment</th>
                                      <th className="py-2.5 px-3 text-center min-w-[280px]">
                                        Fulfillment Progress (Stages)
                                      </th>
                                      <th className="py-2.5 px-3 text-center">Progress</th>
                                      <th className="py-2.5 px-3 text-center">Current Stage</th>
                                      <th className="py-2.5 px-3">Assigned To</th>
                                      <th className="py-2.5 px-3 text-center">Due Date</th>
                                      <th className="py-2.5 px-3 text-center">Status</th>
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
                                          {/* Service Name & Icon */}
                                          <td className="py-3 px-3 align-middle font-medium">
                                            <div className="flex items-center gap-2">
                                              {getServiceIcon(
                                                service.service_name,
                                                service.service_category
                                              )}
                                              <div className="min-w-0">
                                                <p className="font-bold text-slate-900 leading-tight">
                                                  {service.service_name}
                                                </p>
                                                {service.service_category && (
                                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {service.service_category}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </td>

                                          {/* Contract Value */}
                                          <td className="py-3 px-3 text-right font-bold text-slate-900 font-sans font-number whitespace-nowrap align-middle">
                                            {formatINR(service.total_amount)}
                                          </td>

                                          {/* Payment Pill */}
                                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            {service.paymentStatus === "Paid" ? (
                                              <div className="inline-flex flex-col items-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  Paid
                                                </span>
                                                <span className="text-[10px] font-bold font-sans font-number text-slate-700 mt-0.5">
                                                  {formatINR(service.total_amount)}
                                                </span>
                                              </div>
                                            ) : service.paymentStatus === "Partial" ? (
                                              <div className="inline-flex flex-col items-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                  Partial
                                                </span>
                                                <span className="text-[10px] font-bold font-sans font-number text-slate-700 mt-0.5">
                                                  {formatINR(service.amountPaid || 0)} /{" "}
                                                  {formatINR(service.total_amount)}
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="inline-flex flex-col items-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                  Unpaid
                                                </span>
                                                <span className="text-[10px] font-bold font-sans font-number text-slate-700 mt-0.5">
                                                  ₹0 / {formatINR(service.total_amount)}
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          {/* 5-Stage Stepper */}
                                          <td className="py-3 px-3 align-middle">
                                            <div className="flex justify-center">
                                              <FulfillmentStepper
                                                serviceName={service.service_name}
                                                status={service.service_status}
                                              />
                                            </div>
                                          </td>

                                          {/* Progress Badge */}
                                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            <span
                                              className={cn(
                                                "px-2 py-0.5 rounded-full text-white text-[11px] font-bold font-sans font-number shadow-2xs",
                                                isServComplete && "bg-emerald-500",
                                                isServInProgress && "bg-[#0481A2]",
                                                !isServComplete && !isServInProgress && "bg-slate-400"
                                              )}
                                            >
                                              {service.progressPercent || (isServComplete ? 100 : 25)}%
                                            </span>
                                          </td>

                                          {/* Current Stage */}
                                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            <span
                                              className={cn(
                                                "px-2.5 py-1 rounded-lg text-xs font-semibold leading-tight inline-block",
                                                isServComplete &&
                                                  "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                isServInProgress &&
                                                  "bg-sky-50 text-sky-700 border border-sky-200",
                                                !isServComplete &&
                                                  !isServInProgress &&
                                                  "bg-slate-50 text-slate-600 border border-slate-200"
                                              )}
                                            >
                                              {service.stage || (isServComplete ? "Completed" : "In Progress")}
                                            </span>
                                          </td>

                                          {/* Assigned To */}
                                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                              <User size={13} className="text-[#0481A2] shrink-0" />
                                              <span className="truncate max-w-[120px]">
                                                {service.assigned_employee_name || "Unassigned"}
                                              </span>
                                            </div>
                                          </td>

                                          {/* Due Date */}
                                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1 text-xs text-slate-600 font-sans font-number">
                                              <Calendar size={13} className="text-slate-400 shrink-0" />
                                              <span>{formatDate(service.expected_completion_date)}</span>
                                            </div>
                                          </td>

                                          {/* Service Status */}
                                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                                            <span
                                              className={cn(
                                                "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                                isServComplete &&
                                                  "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                isServInProgress &&
                                                  "bg-sky-50 text-[#0481A2] border-sky-200",
                                                !isServComplete &&
                                                  !isServInProgress &&
                                                  "bg-amber-50 text-amber-700 border-amber-200"
                                              )}
                                            >
                                              {service.service_status}
                                            </span>
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
