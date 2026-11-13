"use client";

import { CheckSquare, Clock, Calendar, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

interface FollowupStatsCardsProps {
  totalCount: number;
  pendingCount: number;
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
  completedCount: number;
}

export function FollowupStatsCards({
  totalCount,
  pendingCount,
  todayCount,
  upcomingCount,
  overdueCount,
  completedCount,
}: FollowupStatsCardsProps) {
  const cards = [
    {
      label: "TOTAL FOLLOW-UPS",
      value: totalCount,
      sublabel: "All scheduled tasks",
      icon: ListTodo,
      color: "bg-[#243E76]/10 text-[#243E76]",
    },
    {
      label: "PENDING TASKS",
      value: pendingCount,
      sublabel: "Action required",
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "TODAY'S TASKS",
      value: todayCount,
      sublabel: "Due today",
      icon: Calendar,
      color: "bg-[#0481A2]/10 text-[#0481A2]",
    },
    {
      label: "UPCOMING TASKS",
      value: upcomingCount,
      sublabel: "Future scheduled",
      icon: CheckSquare,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "OVERDUE REMINDERS",
      value: overdueCount,
      sublabel: "Past deadline",
      icon: AlertTriangle,
      color: overdueCount > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600",
    },
    {
      label: "COMPLETED",
      value: completedCount,
      sublabel: "Successfully done",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-shadow relative flex flex-col justify-between min-h-[110px]"
          >
            {/* Top row: Label uppercase on left, small Icon on top right */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                {c.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
            </div>

            {/* Bottom area: Value & Description */}
            <div className="mt-2">
              <div className="text-2xl sm:text-[26px] font-bold font-number text-[#1B3260] leading-tight">
                {c.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {c.sublabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

