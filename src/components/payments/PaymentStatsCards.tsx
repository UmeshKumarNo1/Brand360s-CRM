"use client";

import {
  Receipt,
  Layers,
  Wallet,
  Calendar,
  Clock,
  AlertTriangle,
  CircleCheck,
  TrendingUp,
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
      icon: Receipt,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Allocated to Invoices",
      value: formatINR(totalAllocated),
      icon: Layers,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Unallocated Pool",
      value: formatINR(totalUnallocated),
      icon: Wallet,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Total Installments",
      value: formatINR(totalScheduled),
      icon: Calendar,
      iconBg: "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Upcoming / Due",
      value: upcomingCount.toString(),
      icon: Clock,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
    {
      label: "Overdue Milestones",
      value: overdueCount.toString(),
      icon: AlertTriangle,
      iconBg: overdueCount > 0 ? "bg-rose-500" : "bg-[#243E76]",
      iconColor: "text-white",
    },
    {
      label: "Outstanding Balance",
      value: formatINR(totalInstallmentRemaining),
      icon: CircleCheck,
      iconBg: "bg-[#E0F3F7]",
      iconColor: "text-[#0481A2]",
    },
    {
      label: "Total Transactions",
      value: paymentsCount.toString(),
      icon: TrendingUp,
      iconBg: "bg-[#0481A2]",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4.5 border border-slate-100/90 shadow-2xs relative overflow-hidden flex items-center gap-4 transition-all duration-200 hover:shadow-xs min-h-[92px]"
          >
            {/* Subtle organic decorative wave matching reference design and Clients stats cards */}
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

            {/* Icon Circle */}
            <div
              className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${card.iconBg} ${card.iconColor} shadow-2xs z-10`}
            >
              <Icon size={20} strokeWidth={2.2} />
            </div>

            {/* Value & Label */}
            <div className="z-10 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight leading-tight font-sans font-number whitespace-nowrap">
                {card.value}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-snug">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

