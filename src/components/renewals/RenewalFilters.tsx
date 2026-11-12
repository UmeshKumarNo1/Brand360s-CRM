"use client";

import { Search, RotateCcw } from "lucide-react";

interface RenewalFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  serviceFilter: string;
  onServiceChange: (service: string) => void;
  salespersonFilter: string;
  onSalespersonChange: (salesperson: string) => void;
  paymentStatusFilter?: string;
  onPaymentStatusChange?: (paymentStatus: string) => void;
  servicesList: string[];
  salespersonsList: string[];
  onReset: () => void;
}

export function RenewalFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  serviceFilter,
  onServiceChange,
  salespersonFilter,
  onSalespersonChange,
  paymentStatusFilter = "All",
  onPaymentStatusChange,
  servicesList,
  salespersonsList,
  onReset,
}: RenewalFiltersProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-2xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search client or company..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0481A2] transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0481A2] transition-colors text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Due Soon">Due Soon</option>
            <option value="Overdue">Overdue</option>
            <option value="Renewed">Renewed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <select
            value={paymentStatusFilter}
            onChange={(e) => onPaymentStatusChange && onPaymentStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0481A2] transition-colors text-slate-700"
          >
            <option value="All">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        {/* Service Filter */}
        <div>
          <select
            value={serviceFilter}
            onChange={(e) => onServiceChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0481A2] transition-colors text-slate-700"
          >
            <option value="All">All Services</option>
            {servicesList.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        {/* Salesperson Filter & Reset */}
        <div className="flex items-center gap-2">
          <select
            value={salespersonFilter}
            onChange={(e) => onSalespersonChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#0481A2] transition-colors text-slate-700"
          >
            <option value="All">All Salespersons</option>
            {salespersonsList.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>

          <button
            onClick={onReset}
            className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-medium shrink-0 flex items-center gap-1 cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
