"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Calendar, Edit3, Check, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateClientServiceDueDateAction } from "@/app/actions/services";
import { PortalDropdown } from "@/components/common/PortalDropdown";
import { CompactCalendar } from "@/components/services/CompactCalendar";

/**
 * Working days helpers (Monday - Friday only, excluding weekends)
 */
export function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export function snapDateToWorkingDay(d: Date): Date {
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = res.getDay();
  if (day === 6) {
    res.setDate(res.getDate() + 2); // Saturday -> Monday
  } else if (day === 0) {
    res.setDate(res.getDate() + 1); // Sunday -> Monday
  }
  return res;
}

export function addWorkingDays(baseDate: Date, workingDays: number): Date {
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

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

export function parseDateSafely(dateStr?: string | null): Date | null {
  if (!dateStr || dateStr === "-" || dateStr === "N/A") return null;
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr || dateStr === "-" || dateStr === "N/A") return "-";
  try {
    const d = parseDateSafely(dateStr);
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {}
  return dateStr;
}

/**
 * Calculates proximity and visual theme for target delivery dates:
 * - Green: More than 7 days remaining (> 7 days)
 * - Orange: 4–7 days remaining (4 to 7 days)
 * - Red: 0–3 days remaining or Overdue (< 0 days)
 * - Neutral Grey: No target date set
 * - Completed: Emerald green badge
 */
export function getTargetDateMeta(dateStr?: string | null, isCompleted?: boolean) {
  if (isCompleted) {
    return {
      color: "green" as const,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      iconClass: "text-emerald-600",
      text: dateStr ? formatDate(dateStr) : "Completed",
      title: "Service is completed",
      indicatorLabel: null,
    };
  }

  const target = parseDateSafely(dateStr);
  if (!target) {
    return {
      color: "none" as const,
      badgeClass: "bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/70",
      iconClass: "text-slate-400",
      text: "Set Target Date",
      title: "No target date set yet. Click to set.",
      indicatorLabel: null,
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = targetDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 7) {
    // Green: More than 7 days remaining
    return {
      color: "green" as const,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/70",
      iconClass: "text-emerald-600",
      text: formatDate(dateStr),
      title: `Target Date: ${formatDate(dateStr)} (${diffDays} days remaining - On Track)`,
      indicatorLabel: null,
    };
  } else if (diffDays >= 4) {
    // Orange: 4–7 days remaining
    return {
      color: "orange" as const,
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/70",
      iconClass: "text-amber-600",
      text: formatDate(dateStr),
      title: `Target Date: ${formatDate(dateStr)} (${diffDays} days remaining - Attention needed)`,
      indicatorLabel: "Due Soon",
    };
  } else if (diffDays >= 0) {
    // Red: 0–3 days remaining (including Today)
    const label = diffDays === 0 ? "Due Today" : "Due Soon";
    return {
      color: "red" as const,
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100/70",
      iconClass: "text-rose-600",
      text: formatDate(dateStr),
      title: diffDays === 0
        ? `Target Date is TODAY (${formatDate(dateStr)}) - Deliverable due!`
        : `Target Date: ${formatDate(dateStr)} (${diffDays} day${diffDays > 1 ? "s" : ""} left - Urgent!)`,
      indicatorLabel: label,
    };
  } else {
    // Red: Target date has passed (Overdue)
    const overdue = Math.abs(diffDays);
    return {
      color: "red" as const,
      badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100/70",
      iconClass: "text-rose-600",
      text: formatDate(dateStr),
      title: `Target Date was ${formatDate(dateStr)} (${overdue} day${overdue > 1 ? "s" : ""} overdue)`,
      indicatorLabel: "Overdue",
    };
  }
}

interface TargetDateCellProps {
  serviceId?: string;
  clientId?: string;
  initialDate?: string | null;
  isCompleted?: boolean;
  editable?: boolean;
  onDateUpdated?: (newDate: string) => void;
  className?: string;
}

export function TargetDateCell({
  serviceId,
  clientId,
  initialDate,
  isCompleted = false,
  editable = false,
  onDateUpdated,
  className,
}: TargetDateCellProps) {
  const [currentDate, setCurrentDate] = useState<string | null>(initialDate || null);
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>("");
  const [warning, setWarning] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrentDate(initialDate || null);
  }, [initialDate]);

  const meta = getTargetDateMeta(currentDate, isCompleted);

  // If read-only (e.g. in the main clients list table)
  if (!editable) {
    return (
      <div
        title={meta.title}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-sans font-number shadow-2xs select-none",
          meta.badgeClass,
          className
        )}
      >
        <Calendar size={12} className={cn("shrink-0", meta.iconClass)} />
        <span>{meta.text}</span>
      </div>
    );
  }

  const handleOpen = () => {
    if (isCompleted) return;
    const initial = currentDate
      ? toIsoDate(parseDateSafely(currentDate)!)
      : toIsoDate(snapDateToWorkingDay(new Date()));
    setTempDate(initial);
    setWarning(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setWarning(null);
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

  const handleClear = () => {
    setCurrentDate(null);
    setTempDate("");
    startTransition(async () => {
      if (serviceId && !serviceId.startsWith("synth-")) {
        try {
          await updateClientServiceDueDateAction(serviceId, null, clientId);
        } catch (err) {
          console.error("Failed to clear target delivery date:", err);
        }
      }
      if (onDateUpdated) {
        onDateUpdated("");
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsOpen(false);
      }, 500);
    });
  };

  const handleSave = () => {
    if (!tempDate) return;
    const parsed = parseDateSafely(tempDate);
    if (!parsed) return;
    const finalDate = snapDateToWorkingDay(parsed);
    const iso = toIsoDate(finalDate);

    setCurrentDate(iso);

    startTransition(async () => {
      if (serviceId && !serviceId.startsWith("synth-")) {
        try {
          await updateClientServiceDueDateAction(serviceId, iso, clientId);
        } catch (err) {
          console.error("Failed to update target delivery date:", err);
        }
      }
      if (onDateUpdated) {
        onDateUpdated(iso);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsOpen(false);
      }, 500);
    });
  };

  return (
    <div className={cn("relative inline-block text-center", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        disabled={isCompleted}
        title={isCompleted ? "Service is completed" : `${meta.title} — Click to update target date`}
        className={cn(
          "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-sans font-number transition-all duration-150 shadow-2xs select-none",
          isCompleted ? "cursor-default" : "cursor-pointer hover:shadow-xs",
          meta.badgeClass
        )}
      >
        <Calendar size={12} className={cn("shrink-0", meta.iconClass)} />
        <span>{meta.text}</span>
        {meta.indicatorLabel && (
          <span className={cn(
            "text-[9px] font-bold px-1 py-0.2 rounded uppercase tracking-wider shrink-0",
            meta.color === "red" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
          )}>
            {meta.indicatorLabel}
          </span>
        )}
        {!isCompleted && (
          <Edit3
            size={10}
            className="opacity-0 group-hover:opacity-70 transition-opacity ml-0.5 text-slate-500"
          />
        )}
      </button>

      {/* Popover to Fix Target Date with Calendar & Background Scroll Lock */}
      <PortalDropdown
        isOpen={isOpen}
        onClose={handleClose}
        triggerRef={triggerRef}
        minWidth={290}
        align="right"
        lockScroll={true}
        className="p-3 text-left text-xs space-y-2.5 z-50 w-72"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <p className="font-bold text-slate-800 text-xs">Set Target Date</p>
            <p className="text-[10px] text-slate-400 font-medium">Committed delivery timeline</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Mon – Fri
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Interactive Compact Calendar */}
        <div className="pt-0.5">
          <CompactCalendar
            selectedDate={tempDate}
            onSelectDate={handleDateSelect}
          />
        </div>

        {warning ? (
          <div className="flex items-start gap-1.5 text-[10.5px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-snug">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{warning}</span>
          </div>
        ) : tempDate ? (
          <div className="flex items-center justify-between text-[10.5px] px-1 font-medium">
            <span className="text-slate-500">Selected:</span>
            <span className="text-emerald-700 font-bold font-sans font-number">
              {formatDate(tempDate)} ({new Date(tempDate).toLocaleDateString("en-US", { weekday: "short" })})
            </span>
          </div>
        ) : null}

        {/* Quick Working Day Presets */}
        <div>
          <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Quick Working Day Presets
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => applyQuickDays(3)}
              className="px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center cursor-pointer"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => applyQuickDays(5)}
              className="px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center cursor-pointer"
            >
              +5 Days (1 Wk)
            </button>
            <button
              type="button"
              onClick={() => applyQuickDays(10)}
              className="px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-[#E0F3F7] hover:text-[#0481A2] rounded-md transition-colors text-center cursor-pointer"
            >
              +10 Days (2 Wks)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {currentDate ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50 font-medium"
            >
              Clear Date
            </button>
          ) : <div />}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !tempDate}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0481A2] text-white text-xs font-semibold rounded-md shadow-2xs hover:bg-[#036c88] transition-colors disabled:opacity-50 cursor-pointer"
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
      </PortalDropdown>
    </div>
  );
}
