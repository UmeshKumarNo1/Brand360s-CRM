"use client";

import {
  Users,
  Building2,
  Layers,
  FileText,
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
      iconBg: "bg-[#E0F2FE]",
      iconColor: "text-[#0284C7]",
    },
    {
      label: "Active Clients",
      value: activeClients,
      sublabel: "Operational",
      icon: Building2,
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
      label: "Total Contract Value",
      value: totalContractValue,
      sublabel: "Excl. GST",
      icon: FileText,
      iconBg: "bg-[#E0F2FE]",
      iconColor: "text-[#0284C7]",
    },
    {
      label: "Amount Collected",
      value: amountCollected,
      sublabel: "Received",
      icon: CheckCircle2,
      iconBg: "bg-[#DCFCE7]",
      iconColor: "text-[#16A34A]",
    },
    {
      label: "Outstanding",
      value: totalOutstanding,
      sublabel: "Receivable",
      icon: Clock,
      iconBg: "bg-[#FEF3C7]",
      iconColor: "text-[#D97706]",
    },
    {
      label: "Pending follow ups",
      value: pendingFollowups,
      sublabel: "Action Required",
      icon: CalendarDays,
      iconBg: "bg-[#FEF3C7]",
      iconColor: "text-[#D97706]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 w-full">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs flex items-center gap-2.5 sm:gap-3 transition-all duration-200 hover:shadow-xs min-h-[82px] sm:min-h-[86px] min-w-0"
          >
            {/* Icon Circle */}
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center ${stat.iconBg} ${stat.iconColor} shadow-2xs`}
            >
              <Icon size={17} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="text-lg sm:text-xl font-bold font-number text-slate-900 leading-tight truncate">
                {stat.value}
              </div>
              <p
                className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 break-words line-clamp-2"
                title={stat.label}
              >
                {stat.label}
              </p>
              {stat.sublabel && (
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight truncate">
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
