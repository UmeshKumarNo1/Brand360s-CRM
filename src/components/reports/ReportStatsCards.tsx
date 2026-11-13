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
      label: "TOTAL REVENUE",
      value: formatINR(kpis.totalRevenue),
      sublabel: "Contract value volume",
      icon: IndianRupee,
      color: "bg-[#243E76]/10 text-[#243E76]",
    },
    {
      label: "PAYMENTS RECEIVED",
      value: formatINR(kpis.paymentsReceived),
      sublabel: "Verified collected funds",
      icon: CreditCard,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "OUTSTANDING RECEIVABLES",
      value: formatINR(kpis.outstandingReceivables),
      sublabel: "Pending client balances",
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "TOTAL INVOICED",
      value: formatINR(kpis.totalInvoiced),
      sublabel: "Total tax invoices issued",
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "NEW CLIENTS",
      value: kpis.newClients.toString(),
      sublabel: "Onboarded accounts",
      icon: UserPlus,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "ACTIVE SERVICES",
      value: kpis.activeServices.toString(),
      sublabel: "In-progress fulfillments",
      icon: Layers,
      color: "bg-teal-50 text-teal-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100/90 shadow-2xs hover:shadow-xs transition-shadow relative flex flex-col justify-between min-h-[110px]"
          >
            {/* Top row: Label uppercase on left, small Icon on top right */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
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
              <div className="text-xl sm:text-[22px] font-bold font-number text-[#1B3260] leading-tight truncate">
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
