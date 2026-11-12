"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ArrowUpRight, Coins } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface PaymentTransactionsTableProps {
  payments: any[];
  onAllocatePayment: (payment: any) => void;
  onPreviewInvoice: (invoiceId: string) => void;
}

export function PaymentTransactionsTable({
  payments,
  onAllocatePayment,
  onPreviewInvoice,
}: PaymentTransactionsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto xl:overflow-x-visible">
        <table className="w-full min-w-[980px] xl:min-w-full text-left border-collapse text-xs sm:text-sm">
          {/* Navy Blue Table Header matching ClientsTable and reference UI */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3.5 px-3.5 w-12 text-center font-semibold">No.</th>
              <th className="py-3.5 px-3.5 font-semibold">Client</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Amount</th>
              <th className="py-3.5 px-3 text-center font-semibold whitespace-nowrap">Allocation</th>
              <th className="py-3.5 px-3.5 font-semibold">Linked Invoice(s)</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Date</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Method</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Reference / UTR</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Recorded By</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Status</th>
              <th className="py-3.5 px-3 text-center w-28 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                  No payment transactions found matching your filters.
                </td>
              </tr>
            ) : (
              payments.map((p, index) => {
                const linkedAllocations = p.allocations || [];
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Index Number */}
                    <td className="py-4 px-3.5 text-center font-semibold text-slate-600">
                      {index + 1}
                    </td>

                    {/* Client */}
                    <td className="py-4 px-3.5 font-bold">
                      <div className="flex flex-col">
                        <Link
                          href={`/clients/${p.clientId}`}
                          className="text-[#1B3260] hover:text-[#0481A2] hover:underline flex items-center gap-1 group font-semibold text-sm"
                        >
                          <span>{p.companyName}</span>
                          <ArrowUpRight
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2]"
                          />
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          {p.clientCode}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-3 text-right font-extrabold text-slate-900 font-sans font-number whitespace-nowrap">
                      {formatINR(p.amount)}
                    </td>

                    {/* Allocation */}
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          p.allocationStatus === "Fully Allocated"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.allocationStatus === "Partially Allocated"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {p.allocationStatus || "Unallocated"}
                      </span>
                    </td>

                    {/* Linked Invoices */}
                    <td className="py-4 px-3.5">
                      {linkedAllocations.length === 0 ? (
                        <span className="text-slate-400 text-xs">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedAllocations.map((alloc: any) => {
                            const invNumber =
                              alloc.invoice?.invoice_number ||
                              alloc.invoice_number ||
                              "Invoice";
                            const invId = alloc.invoice?.id || alloc.invoice_id;
                            const allocAmount = Number(alloc.allocated_amount) || 0;
                            return (
                              <button
                                key={alloc.id}
                                onClick={() => onPreviewInvoice(invId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0481A2] hover:bg-[#0481A2] hover:text-white font-mono text-[11px] font-semibold border border-sky-100 transition-colors cursor-pointer"
                                title={`Allocated: ${formatINR(allocAmount)} - Click to preview invoice`}
                              >
                                <span>{invNumber}</span>
                                <span className="opacity-80 font-normal">
                                  ({formatINR(allocAmount)})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {p.paymentDate}
                    </td>

                    {/* Method */}
                    <td className="py-4 px-3 text-slate-700 whitespace-nowrap">
                      {p.paymentMethod}
                    </td>

                    {/* Reference / UTR */}
                    <td className="py-4 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {p.transactionRef || "-"}
                    </td>

                    {/* Recorded By */}
                    <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                      {p.recordedBy || "Staff"}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          p.status === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "Pending Verification"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {p.status === "Verified" ? (
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        ) : (
                          <Clock size={12} className="text-amber-600" />
                        )}
                        <span>{p.status}</span>
                      </span>
                    </td>

                    {/* Actions matching reference UI */}
                    <td className="py-4 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/clients/${p.clientId}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0481A2] hover:bg-sky-50 transition-colors"
                          title="View Client Details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>

                        <button
                          onClick={() => onAllocatePayment(p)}
                          className="p-1.5 rounded-lg text-[#0481A2] hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Allocate to Invoice"
                        >
                          <Coins size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
