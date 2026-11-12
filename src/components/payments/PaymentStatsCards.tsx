"use client";

import {
  CheckCircle2,
  FileCheck2,
  Coins,
  CalendarDays,
  Clock,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface PaymentStatsCardsProps {
  totalVerifiedPayments: number;
  paymentsCount: number;
  totalAllocated: number;
  totalUnallocated: number;
  totalScheduled: number;
  activeMilestonesCount: number;
  upcomingCount: number;
  overdueCount: number;
  totalInstallmentRemaining: number;
}

export function PaymentStatsCards({
  totalVerifiedPayments,
  paymentsCount,
  totalAllocated,
  totalUnallocated,
  totalScheduled,
  activeMilestonesCount,
  upcomingCount,
  overdueCount,
  totalInstallmentRemaining,
}: PaymentStatsCardsProps) {
  const cards = [
    {
      label: "Verified Receipts",
      value: formatINR(totalVerifiedPayments),
      subLabel: `${paymentsCount} transactions`,
      icon: CheckCircle2,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Allocated to Invoices",
      value: formatINR(totalAllocated),
      subLabel: "Reconciled funds",
      icon: FileCheck2,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Unallocated Pool",
      value: formatINR(totalUnallocated),
      subLabel: "Available to allocate",
      icon: Coins,
      iconBg: totalUnallocated > 0 ? "bg-amber-500" : "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Total Installments",
      value: formatINR(totalScheduled),
      subLabel: `${activeMilestonesCount} active milestones`,
      icon: CalendarDays,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Upcoming / Due",
      value: upcomingCount.toString(),
      subLabel: "Pending collection",
      icon: Clock,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Overdue Milestones",
      value: overdueCount.toString(),
      subLabel: "Past due date",
      icon: AlertTriangle,
      iconBg: overdueCount > 0 ? "bg-rose-500" : "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Outstanding Bal",
      value: formatINR(totalInstallmentRemaining),
      subLabel: "Remaining to receive",
      icon: IndianRupee,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-start sm:items-center gap-3.5 transition-all duration-200 hover:shadow-xs min-h-[96px]"
          >
            {/* Subtle organic decorative wave matching Clients stats card */}
            <div className="pointer-events-none absolute right-0 bottom-0 w-20 h-14 opacity-30">
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
              className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center ${card.iconBg} ${card.iconColor} shadow-2xs z-10 mt-0.5 sm:mt-0`}
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-base sm:text-lg 2xl:text-xl font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number whitespace-nowrap">
                {card.value}
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">
                {card.label}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                {card.subLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

