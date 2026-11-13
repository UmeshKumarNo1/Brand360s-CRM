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
      label: "Total Follow-ups",
      value: totalCount,
      sublabel: "All scheduled",
      icon: ListTodo,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Pending Tasks",
      value: pendingCount,
      sublabel: "To be completed",
      icon: Clock,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Today's Tasks",
      value: todayCount,
      sublabel: "Action required today",
      icon: Calendar,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Upcoming Tasks",
      value: upcomingCount,
      sublabel: "Future scheduled",
      icon: CheckSquare,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Overdue Reminders",
      value: overdueCount,
      sublabel: "Past deadline",
      icon: AlertTriangle,
      iconBg: overdueCount > 0 ? "bg-rose-500" : "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Completed",
      value: completedCount,
      sublabel: "Marked done",
      icon: CheckCircle2,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
      {cards.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-center gap-3.5 transition-all duration-200 hover:shadow-xs min-h-[96px] min-w-0"
          >
            {/* Soft decorative wave background on bottom right */}
            <div className="pointer-events-none absolute right-0 bottom-0 w-24 h-16 opacity-35">
              <svg viewBox="0 0 120 80" fill="none" className="w-full h-full">
                <path
                  d="M120 80C90 75 70 50 80 20C90 -5 110 5 120 0V80Z"
                  fill="#0481A2"
                  opacity="0.2"
                />
                <path
                  d="M120 80C80 80 50 65 60 40C70 15 100 25 120 15V80Z"
                  fill="#38BDF8"
                  opacity="0.15"
                />
              </svg>
            </div>

            {/* Icon Circle */}
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center ${stat.iconBg} ${stat.iconColor} shadow-2xs z-10`}
            >
              <Icon size={19} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number whitespace-nowrap">
                {stat.value}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-snug">
                {stat.label}
              </p>
              {stat.sublabel && (
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                  {stat.sublabel}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

