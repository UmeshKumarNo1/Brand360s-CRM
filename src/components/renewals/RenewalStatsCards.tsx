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
      label: "Total Renewals",
      value: stats.total,
      icon: RefreshCw,
      color: "bg-[#243E76]/10 text-[#243E76]",
      desc: "All tracked subscriptions",
    },
    {
      label: "Upcoming Renewals",
      value: stats.upcoming,
      icon: Calendar,
      color: "bg-blue-50 text-blue-700",
      desc: "Due in > 30 days",
    },
    {
      label: "Due Soon",
      value: stats.dueSoon,
      icon: Clock,
      color: "bg-amber-50 text-amber-700",
      desc: "Next 30 days window",
    },
    {
      label: "Overdue Renewals",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-700",
      desc: "Expired / past due date",
    },
    {
      label: "Renewed This Month",
      value: stats.renewedThisMonth,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
      desc: "Successfully renewed",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {c.label}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.color}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold font-number text-[#1B3260]">
              {c.value}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              {c.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}
