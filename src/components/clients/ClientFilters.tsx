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
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[260px]">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company, trade, contact, phone, email, or code..."
          className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] focus:ring-2 focus:ring-[#0481A2]/15 text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
        />
      </div>

      {/* Salesperson Filter */}
      <div className="relative min-w-[155px]">
        <select
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
          className="w-full appearance-none pl-4 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
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

      {/* Service Filter */}
      <div className="relative min-w-[145px]">
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

      {/* Payment Status Filter */}
      <div className="relative min-w-[160px]">
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

      {/* Client Lifecycle Status Filter */}
      {setSelectedClientStatus && (
        <div className="relative min-w-[150px]">
          <select
            value={selectedClientStatus}
            onChange={(e) => setSelectedClientStatus(e.target.value)}
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
      )}

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0481A2] bg-white hover:bg-slate-50 border border-[#E2E8F0] hover:border-[#0481A2]/40 rounded-2xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
        title="Reset all filters"
      >
        <RotateCw size={14} className="text-[#0481A2]" />
        <span>Reset</span>
      </button>
    </div>
  );
}
