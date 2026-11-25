"use client";

import { useState } from "react";
import { Search, ChevronDown, RotateCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedSalesperson: string;
  setSelectedSalesperson: (val: string) => void;
  selectedServiceAssignee?: string;
  setSelectedServiceAssignee?: (val: string) => void;
  selectedService: string;
  setSelectedService: (val: string) => void;
  selectedPaymentStatus: string;
  setSelectedPaymentStatus: (val: string) => void;
  selectedClientStatus?: string;
  setSelectedClientStatus?: (val: string) => void;
  salespeople?: { id: string; full_name: string }[];
  services?: string[];
  onReset: () => void;
}

export function ClientFilters({
  searchQuery,
  setSearchQuery,
  selectedSalesperson,
  setSelectedSalesperson,
  selectedServiceAssignee = "All",
  setSelectedServiceAssignee,
  selectedService,
  setSelectedService,
  selectedPaymentStatus,
  setSelectedPaymentStatus,
  selectedClientStatus = "All",
  setSelectedClientStatus,
  salespeople = [],
  services = [],
  onReset,
}: ClientFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isServiceAssigneeActive = selectedServiceAssignee !== "All";

  return (
    <div className="flex flex-col gap-2.5">
      {/* Main Single-Row Filter Bar */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        {/* 1. Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, trade, contact, phone, email, or code..."
            className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] focus:ring-2 focus:ring-[#0481A2]/15 text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
          />
        </div>

        {/* 2. Salesperson Filter (Client Owner) */}
        <div className="relative shrink-0 min-w-[150px] max-w-[200px]">
          <select
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            title="Filter by the employee who brought / owns the client"
          >
            <option value="All">Salesperson: All</option>
            {salespeople.map((sp) => (
              <option key={sp.id} value={sp.full_name}>
                {sp.full_name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 3. Service Filter */}
        <div className="relative shrink-0 min-w-[130px] max-w-[180px]">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
          >
            <option value="All">Service: All</option>
            {services.map((srv) => (
              <option key={srv} value={srv}>
                {srv}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 4. Payment Status Filter */}
        <div className="relative shrink-0 min-w-[130px] max-w-[160px]">
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
          >
            <option value="All">Payment: All</option>
            <option value="Paid in full">Paid in full</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Upcoming">Upcoming</option>
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* 5. Client Status Filter */}
        <div className="relative shrink-0 min-w-[120px] max-w-[150px]">
          <select
            value={selectedClientStatus}
            onChange={(e) => setSelectedClientStatus ? setSelectedClientStatus(e.target.value) : undefined}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Pending Onboarding">Pending Onboarding</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Advanced Filters Toggle (for Service Assignee) */}
        {setSelectedServiceAssignee && (
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={cn(
              "px-3 py-2.5 text-xs sm:text-sm font-semibold border rounded-2xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer",
              showAdvanced || isServiceAssigneeActive
                ? "bg-sky-50 text-[#0481A2] border-[#0481A2]/40 ring-1 ring-[#0481A2]/20"
                : "bg-white text-slate-600 hover:text-slate-800 border-[#E2E8F0] hover:border-slate-300"
            )}
            title="Toggle advanced filters (Service Assigned To)"
          >
            <SlidersHorizontal size={14} className={isServiceAssigneeActive ? "text-[#0481A2]" : "text-slate-400"} />
            <span className="hidden lg:inline">More</span>
            {isServiceAssigneeActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0481A2]" />
            )}
          </button>
        )}

        {/* 6. Reset Button */}
        <button
          type="button"
          onClick={() => {
            onReset();
            setShowAdvanced(false);
          }}
          className="px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0481A2] bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-[#0481A2]/40 rounded-2xl transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          title="Reset all filters"
        >
          <RotateCw size={14} className="text-[#0481A2]" />
          <span>Reset</span>
        </button>
      </div>

      {/* Advanced / Expandable Filter Area */}
      {showAdvanced && setSelectedServiceAssignee && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Service Assigned To:</span>
            <div className="relative min-w-[200px]">
              <select
                value={selectedServiceAssignee}
                onChange={(e) => setSelectedServiceAssignee(e.target.value)}
                className="w-full appearance-none pl-3.5 pr-8 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
                title="Filter by the employee handling the service"
              >
                <option value="All">Service Assigned To: All</option>
                {salespeople.map((sp) => (
                  <option key={sp.id} value={sp.full_name}>
                    {sp.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedServiceAssignee !== "All" && (
            <button
              type="button"
              onClick={() => setSelectedServiceAssignee("All")}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Clear Service Assignee Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
