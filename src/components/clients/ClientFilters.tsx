"use client";

import { Search, ChevronDown, RotateCw } from "lucide-react";

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
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input matching the rounded search bar */}
      <div className="relative flex-1 min-w-[240px]">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company name..."
          className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] focus:ring-2 focus:ring-[#0481A2]/15 text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
        />
      </div>

      {/* Salesperson Filter */}
      <div className="relative min-w-[155px]">
        <select
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
          className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
        >
          <option value="All">Salesperson: All</option>
          <option value="Employee1">Employee1</option>
          <option value="Employee2">Employee2</option>
          <option value="Yogeetha">Yogeetha</option>
          <option value="Jai Sakthi">Jai Sakthi</option>
          <option value="Adhithya">Adhithya</option>
        </select>
        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Service Filter */}
      <div className="relative min-w-[145px]">
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
        >
          <option value="All">Service: All</option>
          <option value="Annual Compliance">Annual Compliance</option>
          <option value="Website">Website</option>
          <option value="Trademark">Trademark Filing</option>
          <option value="HR & Payroll">HR & Payroll</option>
          <option value="SEO">SEO Retainer</option>
        </select>
        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Payment Status Filter */}
      <div className="relative min-w-[170px]">
        <select
          value={selectedPaymentStatus}
          onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
        >
          <option value="All">Payment Status: All</option>
          <option value="Paid in full">Paid in full</option>
          <option value="Overdue">Overdue</option>
          <option value="Upcoming">Upcoming</option>
        </select>
        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="px-4 py-2.5 text-sm font-semibold text-[#0481A2] bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-[#0481A2]/40 rounded-2xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
      >
        <RotateCw size={14} className="text-[#0481A2]" />
        <span>Reset</span>
      </button>
    </div>
  );
}
