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
          {/* Navy Blue Table Header matching ClientsTable */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3.5 px-3.5 font-semibold">Client</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Amount</th>
              <th className="py-3.5 px-3 text-center font-semibold whitespace-nowrap">Allocation</th>
              <th className="py-3.5 px-3.5 font-semibold">Linked Invoices</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Date</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Method</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Reference / UTR</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Recorded By</th>
              <th className="py-3.5 px-3 font-semibold whitespace-nowrap">Status</th>
              <th className="py-3.5 px-3 text-center w-24 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                  No payment transactions found matching your filters.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const linkedAllocations = p.allocations || [];
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Client */}
                    <td className="py-4 px-3.5 font-bold">
                      <div className="flex flex-col">
                        <Link
                          href={`/clients/${p.clientId}`}
                          className="text-[#0481A2] hover:underline flex items-center gap-1 group font-semibold"
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
                    <td className="py-4 px-3 text-right font-bold text-slate-900 font-sans font-number whitespace-nowrap">
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
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {p.allocationStatus || "Unallocated"}
                      </span>
                      {p.totalAllocated > 0 && p.totalAllocated < p.amount && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatINR(p.totalAllocated)} / {formatINR(p.amount)}
                        </span>
                      )}
                    </td>

                    {/* Linked Invoices */}
                    <td className="py-4 px-3.5">
                      {linkedAllocations.length === 0 ? (
                        <span className="text-slate-400 text-xs italic">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedAllocations.map((alloc: any) => {
                            const invNumber =
                              alloc.invoice?.invoice_number ||
                              alloc.invoice_number ||
                              "Invoice";
                            const invId = alloc.invoice?.id || alloc.invoice_id;
                            return (
                              <button
                                key={alloc.id}
                                onClick={() => onPreviewInvoice(invId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#243E76]/10 text-[#243E76] hover:bg-[#243E76]/20 font-mono text-[11px] font-semibold border border-[#243E76]/20 transition-colors cursor-pointer"
                                title={`Allocated: ${formatINR(
                                  Number(alloc.allocated_amount) || 0
                                )} - Click to preview invoice`}
                              >
                                <span>{invNumber}</span>
                                <span className="text-slate-500 font-normal">
                                  ({formatINR(Number(alloc.allocated_amount) || 0)})
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
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          p.status === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {p.status === "Verified" ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        <span>{p.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => onAllocatePayment(p)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-sky-50 text-[#0481A2] hover:bg-[#0481A2] hover:text-white border border-[#0481A2]/30 transition-all shadow-2xs cursor-pointer"
                        title="Allocate payment to client invoices"
                      >
                        <Coins size={13} />
                        <span>Allocate</span>
                      </button>
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

