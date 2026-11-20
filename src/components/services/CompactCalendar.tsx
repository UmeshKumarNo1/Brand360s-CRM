"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  minDate?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CompactCalendar({
  selectedDate,
  onSelectDate,
  minDate,
}: CompactCalendarProps) {
  const initial = selectedDate ? new Date(selectedDate) : new Date();
  const validInitial = isNaN(initial.getTime()) ? new Date() : initial;

  const [viewYear, setViewYear] = useState<number>(validInitial.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validInitial.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Days in month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isWeekend: new Date(prevY, prevM, day).getDay() === 0 || new Date(prevY, prevM, day).getDay() === 6,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dObj = new Date(viewYear, viewMonth, day);
    const dayOfWeek = dObj.getDay();
    calendarDays.push({
      day,
      dateStr,
      isCurrentMonth: true,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month leading days to fill grid of 35 or 42
  const totalSlots = calendarDays.length <= 35 ? 35 : 42;
  const remaining = totalSlots - calendarDays.length;
  for (let day = 1; day <= remaining; day++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarDays.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isWeekend: new Date(nextY, nextM, day).getDay() === 0 || new Date(nextY, nextM, day).getDay() === 6,
    });
  }

  return (
    <div className="w-full bg-white select-none">
      {/* Month & Year Controls */}
      <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="font-bold text-slate-800 text-xs tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Next Month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((name, idx) => (
          <span
            key={name}
            className={cn(
              "text-[10px] font-bold",
              idx === 0 || idx === 6 ? "text-slate-300" : "text-slate-500"
            )}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.map((item, idx) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;

          return (
            <button
              key={`${item.dateStr}-${idx}`}
              type="button"
              onClick={() => onSelectDate(item.dateStr)}
              className={cn(
                "h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-[11px] font-sans font-number transition-all cursor-pointer relative",
                !item.isCurrentMonth && "text-slate-300 hover:text-slate-500",
                item.isCurrentMonth && !item.isWeekend && "text-slate-700 hover:bg-sky-50 hover:text-[#0481A2]",
                item.isCurrentMonth && item.isWeekend && "text-slate-400 bg-slate-50/50 hover:bg-slate-100",
                isToday && !isSelected && "border border-[#0481A2] text-[#0481A2] font-bold",
                isSelected && "bg-[#0481A2] text-white font-bold shadow-2xs hover:bg-[#036c88]"
              )}
              title={item.isWeekend ? `${item.dateStr} (Weekend)` : item.dateStr}
            >
              {item.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

