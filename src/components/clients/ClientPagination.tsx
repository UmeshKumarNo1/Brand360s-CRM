"use client";

import { ChevronDown } from "lucide-react";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ClientPagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ClientPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-6">
      {/* Rows per page selector matching design */}
      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
        <span>Rows per page:</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:border-[#0481A2] font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Page Navigation matching design */}
      <div className="flex items-center gap-2 self-end sm:self-auto text-xs sm:text-sm">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200/90 rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-2xs cursor-pointer"
        >
          Previous
        </button>

        {[...Array(totalPages)].map((_, idx) => {
          const pageNum = idx + 1;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 flex items-center justify-center rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0481A2] text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200/90 rounded-2xl bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-2xs cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
