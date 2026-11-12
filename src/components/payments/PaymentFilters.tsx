"use client";

import { Search, ChevronDown, RotateCw } from "lucide-react";

interface PaymentFiltersProps {
  activeTab: "transactions" | "installments" | "allocations";
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  methodFilter: string;
  setMethodFilter: (val: string) => void;
  verificationFilter: string;
  setVerificationFilter: (val: string) => void;
  installmentClientFilter: string;
  setInstallmentClientFilter: (val: string) => void;
  installmentDueDateFilter: string;
  setInstallmentDueDateFilter: (val: string) => void;
  uniqueClients: { id: string; name: string }[];
  onReset: () => void;
}

export function PaymentFilters({
  activeTab,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  methodFilter,
  setMethodFilter,
  verificationFilter,
  setVerificationFilter,
  installmentClientFilter,
  setInstallmentClientFilter,
  installmentDueDateFilter,
  setInstallmentDueDateFilter,
  uniqueClients,
  onReset,
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input matching reference design */}
      <div className="relative flex-1 min-w-[280px]">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === "transactions"
              ? "Search by company name, UTR, or payment method..."
              : activeTab === "installments"
              ? "Search by client name, client code, or milestone title..."
              : "Search by client, invoice number, or allocated by..."
          }
          className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] focus:ring-2 focus:ring-[#0481A2]/15 text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
        />
      </div>

      {activeTab === "transactions" && (
        <>
          {/* Payment Method Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            >
              <option value="All">Payment Method: All</option>
              <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
              <option value="UPI / QR">UPI / QR</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Allocation Status Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            >
              <option value="All">Status: All</option>
              <option value="Fully Allocated">Fully Allocated</option>
              <option value="Partially Allocated">Partially Allocated</option>
              <option value="Unallocated">Unallocated</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Verification Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            >
              <option value="All">Verification: All</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Rejected">Rejected</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </>
      )}

      {activeTab === "installments" && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Milestone Status Filter */}
          <div className="relative min-w-[155px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            >
              <option value="All">Status: All</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Due">Due</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid in full">Paid in full</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Client Filter */}
          <div className="relative min-w-[170px] max-w-[220px]">
            <select
              value={installmentClientFilter}
              onChange={(e) => setInstallmentClientFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors truncate"
            >
              <option value="All">Client: All</option>
              {uniqueClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          {/* Due Date Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={installmentDueDateFilter}
              onChange={(e) => setInstallmentDueDateFilter(e.target.value)}
              className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors"
            >
              <option value="All">Due: All Dates</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Today">Due Today</option>
              <option value="This Month">This Month</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      )}

      {activeTab === "allocations" && (
        <div className="relative min-w-[180px]">
          <select
            value={installmentClientFilter}
            onChange={(e) => setInstallmentClientFilter(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] text-slate-700 shadow-2xs cursor-pointer font-medium hover:border-slate-300 transition-colors truncate"
          >
            <option value="All">Client: All</option>
            {uniqueClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        title="Reset all filters"
      >
        <RotateCw size={14} />
        <span>Reset</span>
      </button>
    </div>
  );
}

