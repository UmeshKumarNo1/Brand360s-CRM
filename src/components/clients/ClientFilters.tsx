"use client";

import { Search, ChevronDown, RotateCcw } from "lucide-react";

interface ClientFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedSalesperson: string;
  setSelectedSalesperson: (val: string) => void;
  selectedService: string;
  setSelectedService: (val: string) => void;
  selectedPaymentStatus: string;
  setSelectedPaymentStatus: (val: string) => void;
  onReset: () => void;
}

export function ClientFilters({
  searchQuery,
  setSearchQuery,
  selectedSalesperson,
  setSelectedSalesperson,
  selectedService,
  setSelectedService,
  selectedPaymentStatus,
  setSelectedPaymentStatus,
  onReset,
}: ClientFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 my-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company name"
          className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] focus:ring-1 focus:ring-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
        />
      </div>

      {/* Salesperson Filter */}
      <div className="relative min-w-[140px]">
        <select
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-700 shadow-xs cursor-pointer font-medium"
        >
          <option value="All">Salesperson: All</option>
          <option value="Yogeetha">Yogeetha</option>
          <option value="Jai Sakthi">Jai Sakthi</option>
          <option value="Adhithya">Adhithya</option>
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Service Filter */}
      <div className="relative min-w-[140px]">
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-700 shadow-xs cursor-pointer font-medium"
        >
          <option value="All">Service: All</option>
          <option value="Annual Compliance">Annual Compliance</option>
          <option value="Website">Website</option>
          <option value="Trademark">Trademark Filing</option>
          <option value="HR & Payroll">HR & Payroll</option>
          <option value="SEO">SEO Retainer</option>
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Payment Status Filter */}
      <div className="relative min-w-[150px]">
        <select
          value={selectedPaymentStatus}
          onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-700 shadow-xs cursor-pointer font-medium"
        >
          <option value="All">Payment Status: All</option>
          <option value="Paid in full">Paid in full</option>
          <option value="Overdue">Overdue</option>
          <option value="Upcoming">Upcoming</option>
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-xs sm:text-sm font-medium text-[#077EA1] bg-[#F0FDF4]/30 hover:bg-[#E0F2FE] border border-[#BAE6FD] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
      >
        <RotateCcw size={13} />
        <span>Reset</span>
      </button>
    </div>
  );
}

