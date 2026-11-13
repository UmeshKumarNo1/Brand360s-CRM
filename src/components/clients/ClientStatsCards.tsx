"use client";

import { Users, Briefcase, CalendarDays, IndianRupee } from "lucide-react";

interface ClientStatsCardsProps {
  totalClients?: number;
  activeClients?: number;
  pendingFollowups?: number;
  totalRevenue?: string;
  totalOutstanding?: string;
}

export function ClientStatsCards({
  totalClients = 245,
  activeClients = 180,
  pendingFollowups = 65,
  totalRevenue = "₹12.5L",
  totalOutstanding,
}: ClientStatsCardsProps) {
  const stats = [
    {
      label: "Total Clients",
      value: totalClients,
      sublabel: "All Registered",
      icon: Users,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Active Clients",
      value: activeClients,
      sublabel: "Operational",
      icon: Briefcase,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Pending Follow-ups",
      value: pendingFollowups,
      sublabel: "Action Required",
      icon: CalendarDays,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Total Revenue",
      value: totalRevenue,
      sublabel: totalOutstanding ? `Receivable: ${totalOutstanding}` : undefined,
      icon: IndianRupee,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-center gap-3.5 transition-all duration-200 hover:shadow-xs min-h-[96px] min-w-0"
          >
            {/* Soft decorative wave background on bottom right */}
            <div className="pointer-events-none absolute right-0 bottom-0 w-28 h-20 opacity-40">
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
              className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${stat.iconBg} ${stat.iconColor} shadow-2xs z-10`}
            >
              <Icon size={20} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number">
                {stat.value}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {stat.label}
              </p>
              {stat.sublabel && (
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
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

