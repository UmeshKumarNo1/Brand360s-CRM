"use client";

import { Users, Calendar, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

interface FollowupStatsCardsProps {
  totalCount?: number;
  dueTodayCount?: number;
  overdueCount?: number;
  inFollowupCount?: number;
  likelyToConvertCount?: number;
  pendingCount?: number;
  todayCount?: number;
  upcomingCount?: number;
  completedCount?: number;
}

export function FollowupStatsCards({
  totalCount = 61,
  dueTodayCount,
  overdueCount = 7,
  inFollowupCount = 18,
  likelyToConvertCount = 6,
  todayCount,
}: FollowupStatsCardsProps) {
  const resolvedDueToday = dueTodayCount !== undefined ? dueTodayCount : (todayCount !== undefined ? todayCount : 6);

  const cards = [
    {
      label: "Total Prospects",
      value: totalCount,
      icon: Users,
      iconBg: "bg-[#EAF5FC]",
      iconColor: "text-[#0284C7]",
      isCircle: true,
    },
    {
      label: "Follow-ups Due Today",
      value: resolvedDueToday,
      icon: Calendar,
      iconBg: "bg-[#E6F7FA]",
      iconColor: "text-[#0481A2]",
      isCircle: false,
    },
    {
      label: "Overdue Follow-ups",
      value: overdueCount,
      icon: Clock,
      iconBg: "bg-[#FEECEC]",
      iconColor: "text-[#EF4444]",
      isCircle: true,
    },
    {
      label: "In Follow-up",
      value: inFollowupCount,
      icon: TrendingUp,
      iconBg: "bg-[#F3E8FF]",
      iconColor: "text-[#9333EA]",
      isCircle: false,
    },
    {
      label: "Likely to Convert",
      value: likelyToConvertCount,
      icon: CheckCircle2,
      iconBg: "bg-[#ECFDF5]",
      iconColor: "text-[#10B981]",
      isCircle: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[110px]"
          >
            {/* Top row: Icon and label */}
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 shrink-0 flex items-center justify-center ${
                  card.isCircle ? "rounded-full" : "rounded-xl"
                } ${card.iconBg} ${card.iconColor}`}
              >
                <Icon size={17} strokeWidth={2.2} />
              </div>
              <p className="text-xs font-semibold text-slate-500 leading-snug">
                {card.label}
              </p>
            </div>

            {/* Bottom area: Value */}
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                {card.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
