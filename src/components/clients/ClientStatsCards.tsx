"use client";

import {
  Users,
  Briefcase,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react";

interface ClientStatsCardsProps {
  totalClients?: number;
  activeClients?: number;
  activeServices?: number;
  totalContractValue?: string;
  amountCollected?: string;
  totalOutstanding?: string;
  pendingFollowups?: number;
}

export function ClientStatsCards({
  totalClients = 0,
  activeClients = 0,
  activeServices = 0,
  totalContractValue = "₹0",
  amountCollected = "₹0",
  totalOutstanding = "₹0",
  pendingFollowups = 0,
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
      label: "Active Services",
      value: activeServices,
      sublabel: "In Progress",
      icon: Layers,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Total Contract Value (Excl. GST)",
      value: totalContractValue,
      sublabel: "Excl. GST",
      icon: FileSpreadsheet,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Amount Collected",
      value: amountCollected,
      sublabel: "Received",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
    },
    {
      label: "Outstanding",
      value: totalOutstanding,
      sublabel: "Receivable",
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
    },
    {
      label: "Pending follow ups",
      value: pendingFollowups,
      sublabel: "Action Required",
      icon: CalendarDays,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5 w-full">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-center gap-2.5 sm:gap-3 transition-all duration-200 hover:shadow-xs min-h-[92px] min-w-0"
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
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 flex items-center justify-center ${stat.iconBg} ${stat.iconColor} shadow-2xs z-10`}
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number truncate">
                {stat.value}
              </div>
              <p
                className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-0.5 leading-snug line-clamp-2"
                title={stat.label}
              >
                {stat.label}
              </p>
              {stat.sublabel && (
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
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
