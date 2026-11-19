import React from "react";

export function ClientsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-150">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFBFD] border-b border-[#E2E8F0] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <div className="w-4 h-4 rounded bg-slate-200/80 animate-pulse mx-auto" />
              </th>
              <th className="py-3 px-3 w-12 text-center">#</th>
              <th className="py-3 px-4 min-w-[200px]">Client / Company</th>
              <th className="py-3 px-4 min-w-[140px]">Contact Person</th>
              <th className="py-3 px-4 min-w-[140px]">Phone & Email</th>
              <th className="py-3 px-4 min-w-[140px]">Salesperson</th>
              <th className="py-3 px-4 min-w-[140px]">Services</th>
              <th className="py-3 px-4 min-w-[130px] text-right">Contract</th>
              <th className="py-3 px-4 min-w-[120px] text-right">Collected</th>
              <th className="py-3 px-4 min-w-[120px] text-right">Outstanding</th>
              <th className="py-3 px-4 min-w-[130px] text-center">Status</th>
              <th className="py-3 px-4 min-w-[110px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="bg-white">
                <td className="py-3.5 px-3 text-center">
                  <div className="w-4 h-4 rounded bg-slate-100 animate-pulse mx-auto" />
                </td>
                <td className="py-3.5 px-3 text-center">
                  <div className="w-4 h-3 rounded bg-slate-100 animate-pulse mx-auto" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200/80 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    <div className="h-3.5 w-24 bg-slate-200/60 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-28 bg-slate-200/70 rounded animate-pulse" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="h-3.5 w-16 bg-slate-200/80 rounded animate-pulse ml-auto" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="h-3.5 w-16 bg-emerald-100/70 rounded animate-pulse ml-auto" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="h-3.5 w-16 bg-amber-100/70 rounded animate-pulse ml-auto" />
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="h-6 w-14 bg-slate-100 rounded-md animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
