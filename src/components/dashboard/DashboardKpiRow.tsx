"use client";

import { Users, UserPlus, Layers, Clock, IndianRupee, FileWarning } from "lucide-react";
import { StatCard } from "./StatCard";
import { formatINR } from "@/lib/utils";

interface DashboardKpiRowProps {
  totalClients?: number;
  totalClientsChange?: string | null;
  newClients?: number;
  newClientsChange?: string | null;
  activeServices?: number;
  activeServicesChange?: string | null;
  pendingServices?: number;
  pendingServicesChange?: string | null;
  paymentsReceived?: number;
  paymentsReceivedChange?: string | null;
  outstanding?: number;
  outstandingChange?: string | null;
}

export function DashboardKpiRow({
  totalClients = 128,
  totalClientsChange = "+6.7% vs. last month",
  newClients = 14,
  newClientsChange = "+27.3% vs. last month",
  activeServices = 186,
  activeServicesChange = "+8.1% vs. last month",
  pendingServices = 32,
  pendingServicesChange = "+14.3% vs. last month",
  paymentsReceived = 1276000,
  paymentsReceivedChange = "+18.9% vs. last month",
  outstanding = 87160,
  outstandingChange = "-5.4% vs. last month",
}: DashboardKpiRowProps) {
  const cards = [
    {
      label: "Total Clients",
      value: totalClients.toString(),
      icon: Users,
      iconColor: "text-[#2563EB]",
      iconBg: "bg-blue-50",
    },
    {
      label: "New Clients",
      value: newClients.toString(),
      icon: UserPlus,
      iconColor: "text-[#0284C7]",
      iconBg: "bg-cyan-50",
    },
    {
      label: "Active Services",
      value: activeServices.toString(),
      icon: Layers,
      iconColor: "text-emerald-700",
      iconBg: "bg-emerald-50",
    },
    {
      label: "Pending Services",
      value: pendingServices.toString(),
      icon: Clock,
      iconColor: "text-amber-700",
      iconBg: "bg-amber-50",
    },
    {
      label: "Payments Received",
      value: formatINR(paymentsReceived),
      icon: IndianRupee,
      iconColor: "text-purple-700",
      iconBg: "bg-purple-50",
    },
    {
      label: "Outstanding",
      value: formatINR(outstanding),
      icon: FileWarning,
      iconColor: "text-rose-700",
      iconBg: "bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 my-2">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
