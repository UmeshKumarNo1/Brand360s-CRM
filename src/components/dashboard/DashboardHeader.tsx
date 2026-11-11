import Link from "next/link";
import { Plus, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  userRole?: string;
}

export function DashboardHeader({ 
  userName = "Admin",
  userRole = "Administrator"
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
          Good Morning, {userName} 👋
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          {userRole === "Administrator" 
            ? "Here's what's happening across all BRAND 360s clients today."
            : "Here's your personal client portfolio, tasks, and follow-ups."}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative">
          <select 
            defaultValue="This Month"
            className="appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#243E76] font-medium text-slate-700 cursor-pointer shadow-xs"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
            <option>This Year</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243E76] hover:bg-[#1B2F5B] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>Add New Client</span>
        </Link>
      </div>
    </div>
  );
}
