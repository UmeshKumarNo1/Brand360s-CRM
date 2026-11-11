"use client";

import { Users, UserPlus, Layers, Clock, IndianRupee, FileWarning } from "lucide-react";
import { StatCard } from "./StatCard";
import { formatINR } from "@/lib/utils";

interface DashboardKpiRowProps {
  totalClients?: number;
  paymentsReceived?: number;
  outstanding?: number;
}

export function DashboardKpiRow({
  totalClients = 0,
  paymentsReceived = 0,
  outstanding = 0,
}: DashboardKpiRowProps) {
  const cards = [
    {
      label: "Total Clients",
      value: totalClients.toString(),
      change: "+12%",
      isPositive: true,
      description: "active portfolio",
      icon: Users,
      iconColor: "text-[#243E76]",
      iconBg: "bg-blue-50",
    },
    {
      label: "New Clients",
      value: totalClients > 0 ? totalClients.toString() : "0",
      change: "+38%",
      isPositive: true,
      description: "this month",
      icon: UserPlus,
      iconColor: "text-[#077EA1]",
      iconBg: "bg-cyan-50",
    },
    {
      label: "Active Services",
      value: totalClients.toString(),
      change: "+14%",
      isPositive: true,
      description: "in progress",
      icon: Layers,
      iconColor: "text-emerald-700",
      iconBg: "bg-emerald-50",
    },
    {
      label: "Pending Services",
      value: (Math.ceil(totalClients * 0.25)).toString(),
      change: "+21%",
      isPositive: false,
      isWarning: true,
      description: "awaiting docs",
      icon: Clock,
      iconColor: "text-amber-700",
      iconBg: "bg-amber-50",
    },
    {
      label: "Payments Received",
      value: formatINR(paymentsReceived),
      change: "+18%",
      isPositive: true,
      description: "verified funds",
      icon: IndianRupee,
      iconColor: "text-[#243E76]",
      iconBg: "bg-indigo-50",
    },
    {
      label: "Outstanding",
      value: formatINR(outstanding),
      change: "+9%",
      isPositive: false,
      isWarning: outstanding > 0,
      description: "receivable",
      icon: FileWarning,
      iconColor: "text-rose-700",
      iconBg: "bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 my-4">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
