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
      sublabel: "All tracked subscriptions",
      icon: RefreshCw,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Upcoming Renewals",
      value: stats.upcoming,
      sublabel: "Due in > 30 days",
      icon: Calendar,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Due Soon",
      value: stats.dueSoon,
      sublabel: "Next 30 days window",
      icon: Clock,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Overdue Renewals",
      value: stats.overdue,
      sublabel: "Expired / past due date",
      icon: AlertTriangle,
      iconBg: stats.overdue > 0 ? "bg-rose-500" : "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Renewed This Month",
      value: stats.renewedThisMonth,
      sublabel: "Successfully renewed",
      icon: CheckCircle2,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-center gap-3.5 transition-all duration-200 hover:shadow-xs min-h-[96px] min-w-0"
          >
            {/* Subtle organic decorative wave matching Clients and Payments cards */}
            <div className="pointer-events-none absolute right-0 bottom-0 w-24 h-16 opacity-35">
              <svg viewBox="0 0 120 80" fill="none" className="w-full h-full">
                <path
                  d="M120 80C90 75 70 50 80 20C90 -5 110 5 120 0V80Z"
                  fill="#0481A2"
                  opacity="0.25"
                />
                <path
                  d="M120 80C80 80 50 65 60 40C70 15 100 25 120 15V80Z"
                  fill="#38BDF8"
                  opacity="0.2"
                />
              </svg>
            </div>

            {/* Icon Circle on left */}
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center ${card.iconBg} ${card.iconColor} shadow-2xs z-10`}
            >
              <Icon size={20} strokeWidth={2.2} />
            </div>

            {/* Value & Label on right */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number whitespace-nowrap">
                {card.value}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-snug">
                {card.label}
              </p>
              {card.sublabel && (
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                  {card.sublabel}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
