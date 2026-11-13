"use client";

import { RefreshCw, Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface RenewalStats {
  total: number;
  upcoming: number;
  dueSoon: number;
  overdue: number;
  renewedThisMonth: number;
}

interface RenewalStatsCardsProps {
  stats: RenewalStats;
}

export function RenewalStatsCards({ stats }: RenewalStatsCardsProps) {
  const cards = [
    {
      label: "TOTAL RENEWALS",
      value: stats.total,
      sublabel: "All tracked subscriptions",
      icon: RefreshCw,
      color: "bg-[#243E76]/10 text-[#243E76]",
    },
    {
      label: "UPCOMING RENEWALS",
      value: stats.upcoming,
      sublabel: "Due in > 30 days",
      icon: Calendar,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "DUE SOON",
      value: stats.dueSoon,
      sublabel: "Next 30 days window",
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "OVERDUE RENEWALS",
      value: stats.overdue,
      sublabel: "Expired / past due date",
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-600",
    },
    {
      label: "RENEWED THIS MONTH",
      value: stats.renewedThisMonth,
      sublabel: "Successfully renewed",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-shadow relative flex flex-col justify-between min-h-[110px]"
          >
            {/* Top row: Label uppercase on left, small Icon on top right */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
