"use client";

import Link from "next/link";
import { Plus, ChevronDown, Calendar } from "lucide-react";
import { DashboardPeriod } from "@/app/actions/dashboard";

interface DashboardHeaderProps {
  userName?: string;
  userRole?: string;
  selectedPeriod?: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
  isLoading?: boolean;
}

export function DashboardHeader({ 
  userName = "CEO",
  userRole = "Administrator",
  selectedPeriod = "This Month",
  onPeriodChange,
  isLoading = false,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
          Good Morning, {userName} 👋
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-sans">
          {userRole === "Administrator" 
            ? "Here's what's happening across all BRAND 360s clients today."
            : "Here's your personal client portfolio, tasks, and follow-ups."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Date Selector with Calendar Icon */}
        <div className="relative">
          <div className="flex items-center pl-3.5 pr-8 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-xl focus-within:border-[#243E76] font-semibold text-slate-700 shadow-2xs cursor-pointer hover:border-slate-300 transition-colors">
            <Calendar size={15} className="text-slate-500 mr-2 shrink-0" />
            <select 
              value={selectedPeriod}
              onChange={(e) => onPeriodChange?.(e.target.value as DashboardPeriod)}
              disabled={isLoading}
              className="appearance-none bg-transparent focus:outline-none cursor-pointer pr-1 text-slate-700 font-semibold"
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="Last 3 Months">Last 3 Months</option>
              <option value="This Year">This Year</option>
            </select>
          </div>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Add New Client Button */}
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#1A2B4C] hover:bg-[#15233E] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Client</span>
        </Link>
      </div>
    </div>
  );
}
