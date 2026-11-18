"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { ClientRecord, ClientServiceItem } from "@/data/mockClients";
import { formatINR, cn } from "@/lib/utils";
import { updateClientServiceDueDateAction } from "@/app/actions/services";

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

/**
 * Working days helpers (Monday - Friday only, excluding weekends)
 */
function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function snapDateToWorkingDay(d: Date): Date {
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = res.getDay();
  if (day === 6) {
    res.setDate(res.getDate() + 2); // Saturday -> Monday
  } else if (day === 0) {
    res.setDate(res.getDate() + 1); // Sunday -> Monday
  }
  return res;
}

function addWorkingDays(baseDate: Date, workingDays: number): Date {
  const res = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  let added = 0;
  while (added < workingDays) {
    res.setDate(res.getDate() + 1);
    if (res.getDay() !== 0 && res.getDay() !== 6) {
      added++;
    }
  }
  return res;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function parseDateSafely(dateStr?: string | null): Date | null {
  if (!dateStr || dateStr === "-" || dateStr === "N/A") return null;
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculates proximity and visual theme for target delivery dates:
 * - Initially Green: > 3 days left
 * - Orange: 3 days before (1 to 3 days left)
 * - Red: On that day (0 days left) or overdue (< 0)
 * - Completed: Emerald green badge
 */
function getTargetDateMeta(dateStr?: string | null, isCompleted?: boolean) {
  if (isCompleted) {
    return {
      color: "green" as const,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      iconClass: "text-emerald-600",
      text: dateStr ? formatDate(dateStr) : "Completed",
      subtext: "Done",
      title: "Service is completed",
    };
  }

  const target = parseDateSafely(dateStr);
  if (!target) {
    return {
      color: "none" as const,
      badgeClass: "bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/70",
      iconClass: "text-slate-400",
      text: "Set Target Date",
      subtext: "Not set",
      title: "No target date set yet. Click to fix.",
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = targetDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 3) {
    // Green: Initially green (> 3 days)
    return {
      color: "green" as const,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100/70",
      iconClass: "text-emerald-600",
      text: formatDate(dateStr),
      subtext: `${diffDays}d left`,
      title: `Target Date: ${formatDate(dateStr)} (${diffDays} days remaining - On Track)`,
    };
  } else if (diffDays >= 1) {
    // Orange: 3 days before (1 to 3 days remaining)
    return {
      color: "orange" as const,
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/90 hover:bg-amber-100/70",
      iconClass: "text-amber-600",
      text: formatDate(dateStr),
      subtext: diffDays === 1 ? "1d left" : `${diffDays}d left`,
      title: `Target Date: ${formatDate(dateStr)} (${diffDays} day${diffDays > 1 ? "s" : ""} left - Attention needed)`,
    };
  } else if (diffDays === 0) {
    // Red: On that day
    return {
      color: "red" as const,
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/90 font-bold hover:bg-rose-100/70",
      iconClass: "text-rose-600",
      text: formatDate(dateStr),
      subtext: "Today",
      title: `Target Date is TODAY (${formatDate(dateStr)}) - Deliverable due!`,
    };
  } else {
    // Red: Overdue
    const overdue = Math.abs(diffDays);
    return {
      color: "red" as const,
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/90 font-bold hover:bg-rose-100/70",
      iconClass: "text-rose-600",
      text: formatDate(dateStr),
      subtext: `${overdue}d overdue`,
      title: `Target Date was ${formatDate(dateStr)} (${overdue} days overdue)`,
    };
  }
}

interface TargetDateCellProps {
  service: ClientServiceItem;
  clientId: string;
}

function TargetDateCell({ service, clientId }: TargetDateCellProps) {
  const [currentDate, setCurrentDate] = useState<string | null>(
    service.expected_completion_date || null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>("");
  const [warning, setWarning] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentDate(service.expected_completion_date || null);
  }, [service.expected_completion_date]);

  const isCompleted = service.service_status === "Completed";
  const meta = getTargetDateMeta(currentDate, isCompleted);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    if (isCompleted) return;
    const initial = currentDate
      ? toIsoDate(parseDateSafely(currentDate)!)
      : toIsoDate(snapDateToWorkingDay(new Date()));
    setTempDate(initial);
    setWarning(null);
    setIsOpen(true);
  };

  const handleDateSelect = (val: string) => {
    if (!val) {
      setTempDate("");
      setWarning(null);
      return;
    }
    const parsed = parseDateSafely(val);
    if (!parsed) return;
    const day = parsed.getDay();
    if (day === 6) {
      const snapped = snapDateToWorkingDay(parsed);
      const iso = toIsoDate(snapped);
      setTempDate(iso);
      setWarning(`Saturday selected. Auto-snapped to Monday, ${formatDate(iso)}.`);
    } else if (day === 0) {
      const snapped = snapDateToWorkingDay(parsed);
      const iso = toIsoDate(snapped);
      setTempDate(iso);
      setWarning(`Sunday selected. Auto-snapped to Monday, ${formatDate(iso)}.`);
    } else {
      setTempDate(val);
      setWarning(null);
    }
  };

  const applyQuickDays = (workingDays: number) => {
    const base = new Date();
    const target = addWorkingDays(base, workingDays);
    const iso = toIsoDate(target);
    setTempDate(iso);
    setWarning(null);
  };

  const handleSave = () => {
    if (!tempDate) return;
    const parsed = parseDateSafely(tempDate);
    if (!parsed) return;
    const finalDate = snapDateToWorkingDay(parsed);
    const iso = toIsoDate(finalDate);

    setCurrentDate(iso);

    startTransition(async () => {
      if (service.id && !service.id.startsWith("synth-")) {
        try {
          await updateClientServiceDueDateAction(service.id, iso, clientId);
        } catch (err) {
          console.error("Failed to update target delivery date:", err);
        }
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsOpen(false);
      }, 500);
    });
  };

  return (
    <div className="relative inline-block text-center">
      <button
        type="button"
        onClick={handleOpen}
        disabled={isCompleted}
        title={isCompleted ? "Service is completed" : `${meta.title} — Click to update target date`}
        className={cn(
          "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-sans font-number transition-all duration-150 shadow-2xs",
          isCompleted ? "cursor-default" : "cursor-pointer hover:shadow-xs",
          meta.badgeClass
        )}
      >
        <Calendar size={12} className={cn("shrink-0", meta.iconClass)} />
        <span>{meta.text}</span>
        {meta.subtext && meta.color !== "none" && (
          <span className="text-[10px] font-medium opacity-80">
            ({meta.subtext})
          </span>
        )}
        {!isCompleted && (
          <Edit3
            size={10}
            className="opacity-0 group-hover:opacity-70 transition-opacity ml-0.5 text-slate-500"
          />
        )}
      </button>

      {/* Popover to Fix Target Date (Working Days Only) */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1.5 z-40 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 text-left text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="font-bold text-slate-800 text-xs">Set Target Date</p>
              <p className="text-[10px] text-slate-400 font-medium">Committed delivery timeline</p>
            </div>
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Mon – Fri only
            </span>
          </div>

          {/* Date Picker Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Select Working Day
            </label>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0481A2] font-sans font-number"
            />
            {warning ? (
              <div className="flex items-start gap-1.5 mt-1.5 text-[10.5px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-snug">
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                <span>{warning}</span>
              </div>
            ) : tempDate ? (
              <p className="text-[10px] text-emerald-600 font-medium mt-1">
                ✓ Valid Working Day ({new Date(tempDate).toLocaleDateString("en-US", { weekday: "long" })})
              </p>
            ) : null}
          </div>

          {/* Quick Shortcuts */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Quick Working Day Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickDays(3)}
                className="px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => applyQuickDays(5)}
                className="px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center"
              >
                +5 Days (1 Wk)
              </button>
              <button
                type="button"
                onClick={() => applyQuickDays(10)}
                className="px-2 py-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center"
              >
                +10 Days (2 Wks)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !tempDate}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0481A2] text-white text-xs font-semibold rounded-md shadow-2xs hover:bg-[#036c88] transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={12} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Date</span>
              )}
            </button>
          </div>
        </div>
      )}
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

                    {/* Child Services Portfolio (Always Opened, Minimal Clean UI) */}
                    <tr className="bg-slate-50/50 border-b border-slate-200 transition-all">
                        <td colSpan={11} className="py-2.5 px-3 sm:px-4">
                          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                            {/* 1. Minimal Light Child Header */}
                            <div className="px-4 py-2.5 bg-[#F0F5FA] border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* Left: Clean Title */}
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1E3A5F] text-xs sm:text-[13px] tracking-tight">
                                  Services
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

                                          {/* TARGET DATE: Green (>3d) -> Orange (3d before) -> Red (On that day / Overdue) with working-day fix picker */}
                                          <td className="py-2.5 px-3.5 text-center align-middle whitespace-nowrap">
                                            <TargetDateCell
                                              service={service}
                                              clientId={client.id}
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
    </div>
  );
}
