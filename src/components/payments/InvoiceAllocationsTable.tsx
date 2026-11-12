"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface InvoiceAllocationsTableProps {
  allocations: {
    id: string;
    clientId: string;
    companyName: string;
    clientCode: string;
    paymentId: string;
    paymentAmount: number;
    paymentMethod: string;
    transactionRef: string;
    paymentDate: string;
    invoiceId: string;
    invoiceNumber: string;
    invoiceTotal: number;
    allocatedAmount: number;
    allocatedDate: string;
    allocatedBy: string;
  }[];
  onPreviewInvoice: (invoiceId: string) => void;
}

export function InvoiceAllocationsTable({
  allocations,
  onPreviewInvoice,
}: InvoiceAllocationsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto xl:overflow-x-visible">
        <table className="w-full min-w-[920px] xl:min-w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3.5 px-3.5 w-12 text-center font-semibold">No.</th>
              <th className="py-3.5 px-3.5 font-semibold">Client</th>
              <th className="py-3.5 px-3 font-semibold">Invoice Number</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Allocated Amount</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Payment Reference</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Payment Date</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Allocation Date</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Allocated By</th>
              <th className="py-3.5 px-3 text-center w-20 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {allocations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                  No invoice allocations found.
                </td>
              </tr>
            ) : (
              allocations.map((alloc, idx) => (
                <tr
                  key={alloc.id}
                  className="hover:bg-slate-50/70 transition-colors duration-150"
                >
                  <td className="py-4 px-3.5 text-center font-semibold text-slate-600">
                    {idx + 1}
                  </td>

                  <td className="py-4 px-3.5 font-bold">
                    <div className="flex flex-col">
                      <Link
                        href={`/clients/${alloc.clientId}`}
                        className="text-[#1B3260] hover:text-[#0481A2] hover:underline flex items-center gap-1 group font-semibold text-sm"
                      >
                        <span>{alloc.companyName}</span>
                        <ArrowUpRight
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2]"
                        />
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {alloc.clientCode}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    <button
                      onClick={() => onPreviewInvoice(alloc.invoiceId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0481A2] hover:bg-[#0481A2] hover:text-white font-mono text-[11px] font-semibold border border-sky-100 transition-colors cursor-pointer"
                      title="Preview Tax Invoice"
                    >
                      <span>{alloc.invoiceNumber}</span>
                    </button>
                  </td>

                  <td className="py-4 px-3 text-right font-extrabold text-slate-900 font-sans font-number whitespace-nowrap">
                    {formatINR(alloc.allocatedAmount)}
                  </td>

                  <td className="py-4 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {alloc.transactionRef || alloc.paymentMethod}
                  </td>

                  <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                    {alloc.paymentDate}
                  </td>

                  <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                    {alloc.allocatedDate}
                  </td>

                  <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                    {alloc.allocatedBy || "Staff"}
                  </td>

                  <td className="py-4 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => onPreviewInvoice(alloc.invoiceId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0481A2] hover:bg-sky-50 transition-colors cursor-pointer"
                      title="Preview Invoice"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

