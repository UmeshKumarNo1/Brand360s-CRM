"use client";

import { IndianRupee, CreditCard, AlertCircle, FileText, UserPlus, Layers } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { ReportSummaryKpis } from "@/app/actions/reports";

interface ReportStatsCardsProps {
  kpis: ReportSummaryKpis;
}

export function ReportStatsCards({ kpis }: ReportStatsCardsProps) {
  const cards = [
    {
      label: "Total Revenue",
      value: formatINR(kpis.totalRevenue),
      icon: IndianRupee,
      color: "bg-[#243E76]/10 text-[#243E76]",
      desc: "Contract value volume",
    },
    {
      label: "Payments Received",
      value: formatINR(kpis.paymentsReceived),
      icon: CreditCard,
      color: "bg-emerald-50 text-emerald-700",
      desc: "Verified collected funds",
    },
    {
      label: "Outstanding Receivables",
      value: formatINR(kpis.outstandingReceivables),
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-700",
      desc: "Pending client balances",
    },
    {
      label: "Total Invoiced",
      value: formatINR(kpis.totalInvoiced),
      icon: FileText,
      color: "bg-blue-50 text-blue-700",
      desc: "Total tax invoices issued",
    },
    {
      label: "New Clients",
      value: kpis.newClients.toString(),
      icon: UserPlus,
      color: "bg-indigo-50 text-indigo-700",
      desc: "Onboarded accounts",
    },
    {
      label: "Active Services",
      value: kpis.activeServices.toString(),
      icon: Layers,
      color: "bg-teal-50 text-teal-700",
      desc: "In-progress fulfillments",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                {c.label}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
                <Icon size={14} />
              </div>
            </div>
            <div className="text-xl font-bold font-number text-[#1B3260] truncate">
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
