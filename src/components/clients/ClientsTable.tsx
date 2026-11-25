"use client";

import Link from "next/link";
import {
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
import { ClientRecord, ClientServiceItem } from "@/data/mockClients";
import { formatINR, cn } from "@/lib/utils";
import { useState } from "react";
import { TargetDateCell } from "@/components/services/TargetDateCell";
import { ServiceStageModal } from "@/components/services/ServiceStageModal";
import { AssignServiceModal } from "@/components/services/AssignServiceModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { ServiceFulfillmentTimeline } from "@/components/services/ServiceFulfillmentTimeline";
import { InlineAssignEmployeeCell } from "@/components/services/InlineAssignEmployeeCell";

interface ClientsTableProps {
  clients: ClientRecord[];
  isAdmin?: boolean;
  currentUserId?: string | null;
  currentUserName?: string | null;
  onDeleteClient?: (client: ClientRecord) => void;
  onArchiveClient?: (client: ClientRecord) => void;
  onRestoreClient?: (client: ClientRecord) => void;
  onReassignClient?: (client: ClientRecord) => void;
  onRefresh?: () => void;
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
  currentUserId,
  currentUserName,
  onDeleteClient,
  onArchiveClient,
  onRestoreClient,
  onReassignClient,
  onRefresh,
}: ClientsTableProps) {
  const [stageModalServiceId, setStageModalServiceId] = useState<string | null>(null);
  const [assignModalClient, setAssignModalClient] = useState<{ id: string; name: string } | null>(null);
  const [createInvoiceService, setCreateInvoiceService] = useState<{
    clientId: string;
    clientName: string;
    serviceId: string;
    serviceName: string;
    amount: number;
  } | null>(null);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden w-full max-w-full">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs sm:text-[13px] min-w-[1080px]">
          {/* Column Proportions */}
          <colgroup>
            {/* 1. No. */}
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
                No.
              </th>
              <th className="py-3 px-2.5 sm:px-3 text-left font-semibold leading-tight">
                Client / Company
              </th>
              <th className="py-3 px-2 sm:px-3 text-left font-semibold leading-tight">
                Client Salesperson
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

                return (
                  <tr key={client.id} className="contents">
                    {/* Master Row */}
                    <tr
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100",
                        isArchived && "opacity-75 bg-slate-50/30"
                      )}
                    >
                      {/* 1. No. */}
                      <td className="py-3 px-2 text-center font-bold text-slate-800 font-sans font-number align-middle">
                        {client.no}
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
                            {/* Distinction badge for non-admin logged-in employee */}
                            {!isAdmin && currentUserId && (
                              client.assignedSalespersonId === currentUserId || (currentUserName && client.salesperson === currentUserName) ? (
                                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0" title="You are the client owner/salesperson">
                                  My Client
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0" title="Service assigned to you (client owned by another salesperson)">
                                  Service Assigned
                                </span>
                              )
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

                      {/* 3. Salesperson */}
                      <td className="py-3 px-2 sm:px-3 align-middle">
                        <span
                          className="text-xs font-semibold text-slate-800 truncate block"
                          title={client.salesperson}
                        >
                          {client.salesperson}
                        </span>
                      </td>

                      {/* 4. Contract Value */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-slate-900 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.contractValue)}
                      </td>

                      {/* 5. Invoiced */}
                      <td className="py-3 px-2 sm:px-3 text-right font-bold text-slate-700 font-sans font-number whitespace-nowrap align-middle">
                        {formatINR(client.invoicedAmount ?? client.contractValue)}
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

                    {/* Child Services Portfolio (Always Opened, Minimal Clean UI) */}
                    <tr className="bg-slate-50/50 border-b border-slate-200 transition-all">
                        <td colSpan={11} className="py-2.5 px-3 sm:px-4">
                          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                            {/* 1. Minimal Light Child Header */}
                            <div className="px-4 py-2.5 bg-[#F0F5FA] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Left: Clean Title & Action */}
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-[#1E3A5F] text-xs sm:text-[13px] tracking-tight">
                                  Services
                                </span>
                                {services.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAssignModalClient({
                                        id: client.id,
                                        name: client.companyName,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#0481A2] bg-white border border-sky-200 hover:bg-sky-50 shadow-2xs transition-colors cursor-pointer"
                                    title="Assign additional service deliverable"
                                  >
                                    <Plus size={11} />
                                    <span>Add Service</span>
                                  </button>
                                )}
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
                                    {formatINR(client.invoicedAmount ?? client.contractValue)}
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAssignModalClient({
                                      id: client.id,
                                      name: client.companyName,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2] text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-[#036c88] transition-colors mt-2.5 cursor-pointer"
                                >
                                  <Plus size={14} />
                                  <span>Assign Service</span>
                                </button>
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
                                      <th className="py-2 px-3.5 text-center" title="Target delivery date for service fulfillment (working days only)">
                                        TARGET DATE
                                      </th>
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
                                          {/* SERVICE: Minimal icon + Name & Category with Direct Link */}
                                          <td className="py-2.5 px-3.5 align-middle">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center shrink-0">
                                                <FileText size={14} />
                                              </div>
                                              <div className="min-w-0">
                                                {service.id ? (
                                                  <Link
                                                    href={`/clients/${client.id}?tab=services&serviceId=${service.id}`}
                                                    className="font-semibold text-slate-900 text-xs leading-tight truncate hover:text-[#0481A2] hover:underline inline-flex items-center gap-1 group transition-colors"
                                                    title={`Open ${client.companyName} services`}
                                                  >
                                                    <span className="truncate">{service.service_name}</span>
                                                    <ArrowUpRight
                                                      size={11}
                                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2] shrink-0"
                                                    />
                                                  </Link>
                                                ) : (
                                                  <p className="font-semibold text-slate-900 text-xs leading-tight truncate">
                                                    {service.service_name}
                                                  </p>
                                                )}
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
                                              {service.paymentStatus === "Not Invoiced" || (!service.hasIssuedInvoice && (service.invoicedAmount || 0) === 0) ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCreateInvoiceService({
                                                      clientId: client.id,
                                                      clientName: client.companyName,
                                                      serviceId: service.id,
                                                      serviceName: service.service_name,
                                                      amount: service.total_amount,
                                                    });
                                                  }}
                                                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-[#0481A2] hover:text-white hover:border-[#0481A2] transition-colors cursor-pointer group flex items-center gap-1 shadow-2xs"
                                                  title={`Generate Invoice for ${service.service_name}`}
                                                >
                                                  <span>Not Invoiced</span>
                                                  <Plus size={9} className="opacity-70 group-hover:opacity-100" />
                                                </button>
                                              ) : (
                                                <span
                                                  className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                                    service.paymentStatus === "Paid" &&
                                                      "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                    (service.paymentStatus === "Partially Paid" || service.paymentStatus === "Partial") &&
                                                      "bg-amber-50 text-amber-700 border border-amber-200",
                                                    service.paymentStatus !== "Paid" &&
                                                      service.paymentStatus !== "Partially Paid" &&
                                                      service.paymentStatus !== "Partial" &&
                                                      "bg-rose-50 text-rose-700 border border-rose-200"
                                                  )}
                                                >
                                                  {service.paymentStatus || "Unpaid"}
                                                </span>
                                              )}
                                              <span className="text-[10px] text-slate-500 font-medium font-sans font-number mt-0.5">
                                                {service.paymentStatus === "Not Invoiced" || (!service.hasIssuedInvoice && (service.invoicedAmount || 0) === 0)
                                                  ? "Not Invoiced"
                                                  : service.paymentStatus === "Paid"
                                                  ? formatINR(service.invoicedAmount || service.amountPaid || service.total_amount)
                                                  : service.paymentStatus === "Partially Paid" || service.paymentStatus === "Partial"
                                                  ? `${formatINR(service.amountPaid || 0)} / ${formatINR(service.invoicedAmount || service.total_amount)}`
                                                  : (service.invoicedAmount || 0) > 0
                                                  ? `₹0 / ${formatINR(service.invoicedAmount || 0)}`
                                                  : service.total_amount > 0
                                                  ? `₹0 / ${formatINR(service.total_amount)}`
                                                  : "Not Invoiced"}
                                              </span>
                                            </div>
                                          </td>

                                          {/* FULFILLMENT PROGRESS (STAGES) */}
                                          <td
                                            onClick={() => service.id && setStageModalServiceId(service.id)}
                                            className="py-2.5 px-3 align-middle cursor-pointer hover:bg-sky-50/50 transition-colors"
                                            title="Click to manage service fulfillment stages"
                                          >
                                            <div className="flex justify-center w-[260px] mx-auto">
                                              <ServiceFulfillmentTimeline
                                                stages={
                                                  Array.isArray(service.fulfillment_stages) && service.fulfillment_stages.length > 0
                                                    ? service.fulfillment_stages
                                                    : computeServiceFulfillment({
                                                        service_name: service.service_name,
                                                        service_category: service.service_category,
                                                        service_status: service.service_status,
                                                      }).stages
                                                }
                                                currentStageName={service.stage}
                                                progressPercentage={service.progressPercent}
                                                size="sm"
                                              />
                                            </div>
                                          </td>

                                          {/* PROGRESS: Minimal Pill Badge */}
                                          <td
                                            onClick={() => service.id && setStageModalServiceId(service.id)}
                                            className="py-2.5 px-3 text-center align-middle whitespace-nowrap cursor-pointer hover:bg-sky-50/50 transition-colors"
                                            title="Click to manage service fulfillment stages"
                                          >
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
                                          <td
                                            onClick={() => service.id && setStageModalServiceId(service.id)}
                                            className="py-2.5 px-3 text-center align-middle whitespace-nowrap cursor-pointer hover:bg-sky-50/50 transition-colors"
                                            title="Click to manage service fulfillment stages"
                                          >
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
                                                  <p className="text-xs font-semibold text-slate-800 hover:text-[#0481A2] transition-colors">{title}</p>
                                                  {sub && (
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </td>

                                          {/* ASSIGNED TO: Interactive inline dropdown */}
                                          <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                            {service.id ? (
                                              <InlineAssignEmployeeCell
                                                serviceId={service.id}
                                                clientId={client.id}
                                                assignedEmployeeId={service.assigned_employee_id}
                                                assignedEmployeeName={service.assigned_employee_name}
                                                editable={true}
                                                onUpdated={() => onRefresh?.()}
                                              />
                                            ) : (
                                              <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                                <User size={12} className="text-slate-400 shrink-0" />
                                                <span className="font-medium text-slate-700">
                                                  {service.assigned_employee_name || "Unassigned"}
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          {/* TARGET DATE: Set / update target date popover with working days logic */}
                                          <td className="py-2.5 px-3.5 text-center align-middle whitespace-nowrap">
                                            <TargetDateCell
                                              serviceId={service.id}
                                              clientId={client.id}
                                              initialDate={service.expected_completion_date}
                                              isCompleted={service.service_status === "Completed"}
                                              editable={Boolean(service.id)}
                                              onDateUpdated={() => onRefresh?.()}
                                            />
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Service Fulfillment Stage Management Modal */}
      <ServiceStageModal
        isOpen={Boolean(stageModalServiceId)}
        onClose={() => setStageModalServiceId(null)}
        serviceId={stageModalServiceId}
        onSuccess={() => {
          onRefresh?.();
        }}
      />

      {/* One-Click Direct Service Assignment Modal */}
      {assignModalClient && (
        <AssignServiceModal
          isOpen={Boolean(assignModalClient)}
          onClose={() => setAssignModalClient(null)}
          onSuccess={() => {
            setAssignModalClient(null);
            onRefresh?.();
          }}
          clientId={assignModalClient.id}
          clientName={assignModalClient.name}
        />
      )}

      {/* Service-Based GST Invoice Creation Modal */}
      {createInvoiceService && (
        <CreateInvoiceModal
          isOpen={Boolean(createInvoiceService)}
          onClose={() => setCreateInvoiceService(null)}
          defaultClientId={createInvoiceService.clientId}
          defaultClientName={createInvoiceService.clientName}
          defaultServiceId={createInvoiceService.serviceId}
          defaultDescription={`${createInvoiceService.serviceName} - Professional Deliverable`}
          defaultAmount={createInvoiceService.amount}
          onSuccess={() => {
            setCreateInvoiceService(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
