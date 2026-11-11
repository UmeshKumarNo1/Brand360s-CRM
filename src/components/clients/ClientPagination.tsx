"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 pb-2">
      {/* Rows per page */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
        <span>Rows per page:</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="appearance-none pl-2.5 pr-7 py-1 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs sm:text-sm">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-[#E2E8F0] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className={`w-7 h-7 flex items-center justify-center rounded-md font-medium text-xs sm:text-sm transition-colors ${
                isActive
                  ? "bg-[#077EA1] text-white font-semibold shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-[#E2E8F0]"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-[#E2E8F0] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

