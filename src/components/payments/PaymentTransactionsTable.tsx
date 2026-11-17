"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ArrowUpRight, Link2, ArrowRightLeft, CheckCircle, Edit3, RotateCcw, Receipt, FileText, XCircle } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface PaymentTransactionsTableProps {
  payments: any[];
  onAllocatePayment: (payment: any) => void;
  onPreviewInvoice: (invoiceId: string) => void;
  onEditPayment?: (payment: any) => void;
  onReversePayment?: (payment: any) => void;
  onViewReceipt?: (payment: any) => void;
  isAdmin?: boolean;
}

export function PaymentTransactionsTable({
  payments,
  onAllocatePayment,
  onPreviewInvoice,
  onEditPayment,
  onReversePayment,
  onViewReceipt,
  isAdmin = false,
}: PaymentTransactionsTableProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
          {/* Navy Blue Table Header matching ClientsTable and reference UI */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3 px-2 w-10 text-center font-semibold">No.</th>
              <th className="py-3 px-2.5 min-w-[130px] font-semibold">Client</th>
              <th className="py-3 px-2 text-right font-semibold whitespace-nowrap">Amount</th>
              <th className="py-3 px-2 text-center font-semibold whitespace-nowrap">Allocation</th>
              <th className="py-3 px-2.5 min-w-[140px] font-semibold whitespace-nowrap">Linked Invoice(s)</th>
              <th className="py-3 px-2 font-semibold whitespace-nowrap">Date</th>
              <th className="py-3 px-2 font-semibold whitespace-nowrap">Method</th>
              <th className="py-3 px-2 font-semibold whitespace-nowrap">Reference / UTR</th>
              <th className="py-3 px-2.5 font-semibold leading-tight">
                <span className="block whitespace-nowrap">Recorded By /</span>
                <span className="block whitespace-nowrap">Verification</span>
              </th>
              <th className="py-3 px-2 text-center min-w-[150px] font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-400 text-xs sm:text-sm">
                  No payment transactions found matching your filters.
                </td>
              </tr>
            ) : (
              payments.map((p, index) => {
                const linkedAllocations = p.allocations || [];
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150 min-h-[58px]"
                  >
                    {/* Index Number */}
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-600 align-middle">
                      {index + 1}
                    </td>

                    {/* Client */}
                    <td className="py-2.5 px-2.5 font-bold align-middle">
                      <div className="flex flex-col justify-center leading-tight">
                        <Link
                          href={`/clients/${p.clientId}`}
                          className="text-[#1B3260] hover:text-[#0481A2] hover:underline flex items-center gap-1 group font-semibold text-xs sm:text-[13px] whitespace-nowrap"
                        >
                          <span>{p.companyName}</span>
                          <ArrowUpRight
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2] shrink-0"
                          />
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                          {p.clientCode}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 font-sans font-number whitespace-nowrap align-middle">
                      {formatINR(p.amount)}
                    </td>

                    {/* Allocation */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
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

                    {/* Linked Invoices (Column layout: stacked vertically one by one, increased card height without widening column) */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap align-middle">
                      {linkedAllocations.length === 0 ? (
                        <span className="text-slate-400 text-xs">None</span>
                      ) : (
                        <div className="flex flex-col items-stretch gap-2 py-1 max-w-[136px]">
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
                                className="w-full inline-flex flex-col items-center justify-center px-2.5 py-2.5 min-h-[46px] rounded-lg bg-[#EEF2F6] hover:bg-[#E2E8F0] text-slate-700 font-mono text-[11px] border border-slate-200 transition-all cursor-pointer leading-tight shadow-2xs group"
                                title={`Allocated: ${formatINR(allocAmount)} - Click to preview ${invNumber}`}
                              >
                                <span className="font-bold text-[#1B3260] tracking-tight group-hover:text-[#0481A2]">
                                  {invNumber}
                                </span>
                                <span className="text-slate-500 font-semibold text-[10px] mt-1 font-sans">
                                  ({formatINR(allocAmount)})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-2 text-slate-600 font-medium whitespace-nowrap align-middle">
                      {p.paymentDate}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-2 text-slate-700 whitespace-nowrap align-middle">
                      {p.paymentMethod}
                    </td>

                    {/* Reference / UTR */}
                    <td className="py-2.5 px-2 font-mono text-xs text-slate-500 whitespace-nowrap align-middle">
                      {p.transactionRef || "-"}
                    </td>

                    {/* Recorded By / Verification (Combined horizontally: User Name on left, Verification status badge on right) */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-semibold text-xs sm:text-[13px] truncate max-w-[110px]" title={p.recordedBy || "Staff"}>
                          {p.recordedBy || "Staff"}
                        </span>
                        <span className="text-slate-300 select-none">|</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                            p.status === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.status === "Pending Verification" || p.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : p.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : p.status === "Reversed"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {p.status === "Verified" ? (
                            <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                          ) : p.status === "Rejected" ? (
                            <XCircle size={11} className="text-rose-600 shrink-0" />
                          ) : p.status === "Reversed" ? (
                            <RotateCcw size={11} className="text-rose-600 shrink-0" />
                          ) : (
                            <Clock size={11} className="text-amber-600 shrink-0" />
                          )}
                          <span>
                            {p.status === "Pending Verification" ? "Pending" : p.status}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Actions matching reference UI: Button on row 1, icons on row 2 (eye icon removed) */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {/* Row 1: Dynamic Allocation Status Button based on exact payment allocation state */}
                        {p.status !== "Reversed" && (() => {
                          const paymentAmount = Math.round((Number(p.amount) || 0) * 100) / 100;
                          const totalAllocated = Math.round((Number(p.totalAllocated) || 0) * 100) / 100;
                          const availableAmount = Math.max(0, Math.round((paymentAmount - totalAllocated) * 100) / 100);

                          // State C: Fully Allocated
                          if (paymentAmount > 0 && availableAmount <= 0.009) {
                            return (
                              <span
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 shadow-2xs select-none cursor-default w-full max-w-[136px]"
                                title="Payment is fully allocated to client invoices"
                              >
                                <CheckCircle size={12} className="shrink-0 text-[#059669]" />
                                <span>Allocated</span>
                              </span>
                            );
                          }

                          // State B: Partially Allocated
                          if (totalAllocated > 0.009 && availableAmount > 0.009) {
                            return (
                              <button
                                onClick={() => onAllocatePayment(p)}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white border border-[#D97706] transition-all shadow-2xs cursor-pointer w-full max-w-[136px]"
                                title={`Partially allocated (₹${totalAllocated.toLocaleString("en-IN")}). Click to allocate remaining ₹${availableAmount.toLocaleString("en-IN")}`}
                              >
                                <ArrowRightLeft size={12} className="shrink-0" />
                                <span>Allocate Remaining</span>
                              </button>
                            );
                          }

                          // State A: Unallocated
                          return (
                            <button
                              onClick={() => onAllocatePayment(p)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0786A5] hover:bg-[#066e88] text-white border border-[#0786A5] transition-all shadow-2xs cursor-pointer w-full max-w-[136px]"
                              title="Allocate unallocated payment to client invoices"
                            >
                              <Link2 size={12} className="shrink-0" />
                              <span>Allocate</span>
                            </button>
                          );
                        })()}

                        {/* Row 2: Action Icons with consistent colors and tooltips */}
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. View Payment Receipt — Blue icon (#077EA1 / #0481A2) */}
                          {onViewReceipt && (
                            <button
                              onClick={() => onViewReceipt(p)}
                              className="p-1 rounded-md text-[#077EA1] hover:text-[#046582] hover:bg-sky-50 transition-colors cursor-pointer"
                              title="View / Download Payment Receipt"
                              aria-label="View Payment Receipt"
                            >
                              <Receipt size={14} />
                            </button>
                          )}

                          {/* 2. View Linked Invoice — Green icon (#059669) */}
                          {linkedAllocations.length > 0 ? (
                            <button
                              onClick={() => {
                                const firstInv = linkedAllocations[0];
                                const invId = firstInv.invoice?.id || firstInv.invoice_id;
                                if (invId) onPreviewInvoice(invId);
                              }}
                              className="p-1 rounded-md text-[#059669] hover:text-[#047857] hover:bg-emerald-50 transition-colors cursor-pointer"
                              title={
                                linkedAllocations.length === 1
                                  ? `View Linked Invoice (${linkedAllocations[0].invoice?.invoice_number || linkedAllocations[0].invoice_number || "Invoice"})`
                                  : `View Linked Invoice (1 of ${linkedAllocations.length} linked invoices)`
                              }
                              aria-label="View Linked Invoice"
                            >
                              <FileText size={14} />
                            </button>
                          ) : (
                            <span
                              className="p-1 rounded-md text-slate-300 cursor-not-allowed inline-flex items-center"
                              title="No linked invoice for this payment"
                              aria-label="No linked invoice"
                            >
                              <FileText size={14} />
                            </span>
                          )}

                          {/* 3. Edit Payment — Amber icon (#D97706) */}
                          {p.status !== "Reversed" && onEditPayment && (
                            p.totalAllocated > 0 ? (
                              <span
                                className="p-1 rounded-md text-slate-300 cursor-not-allowed inline-flex items-center"
                                title="Cannot edit financial fields: payment is already allocated to invoices. To modify, reverse the payment."
                                aria-label="Edit restricted: allocated payment"
                              >
                                <Edit3 size={14} />
                              </span>
                            ) : (
                              <button
                                onClick={() => onEditPayment(p)}
                                className="p-1 rounded-md text-[#D97706] hover:text-[#B45309] hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Edit Unallocated Payment"
                                aria-label="Edit Unallocated Payment"
                              >
                                <Edit3 size={14} />
                              </button>
                            )
                          )}

                          {/* 4. Reverse Payment — Red icon (#E11D48 / #DC2626) - Restricted to Admins */}
                          {p.status !== "Reversed" && onReversePayment && (
                            isAdmin ? (
                              <button
                                onClick={() => onReversePayment(p)}
                                className="p-1 rounded-md text-[#E11D48] hover:text-[#BE123C] hover:bg-rose-50 transition-colors cursor-pointer"
                                title={
                                  p.totalAllocated > 0
                                    ? "Reverse Payment & Rollback Linked Invoice Allocations (Admin Only)"
                                    : "Reverse Payment (Admin Only)"
                                }
                                aria-label="Reverse Payment"
                              >
                                <RotateCcw size={14} />
                              </button>
                            ) : (
                              <span
                                className="p-1 rounded-md text-slate-300 cursor-not-allowed inline-flex items-center"
                                title="Payment reversal is strictly restricted to authorized administrators"
                                aria-label="Reversal restricted to Administrators"
                              >
                                <RotateCcw size={14} />
                              </span>
                            )
                          )}
                        </div>
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
