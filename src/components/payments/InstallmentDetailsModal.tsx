"use client";

import React, { useState } from "react";
import {
  Calendar,
  X,
  IndianRupee,
  Building,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Receipt,
  ArrowUpRight,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";

interface InstallmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: any;
  onQuickPay?: (installment: any) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

export function InstallmentDetailsModal({
  isOpen,
  onClose,
  installment,
  onQuickPay,
  onViewInvoice,
}: InstallmentDetailsModalProps) {
  if (!isOpen || !installment) return null;

  const expectedAmount = Number(installment.amount) || 0;
  const receivedAmount = Number(installment.amountPaid) || 0;
  const remaining = Math.max(0, expectedAmount - receivedAmount);
  const percentPaid = expectedAmount > 0 ? Math.min(100, Math.round((receivedAmount / expectedAmount) * 100)) : 0;
  const allocations = installment.allocations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#077EA1] flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">{installment.title}</h3>
                <span className="text-[10px] font-mono text-slate-400">#{installment.installmentNumber}</span>
              </div>
              <p className="text-xs text-slate-500">{installment.companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Milestone Status</span>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    installment.status === "Paid in full" || installment.status === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : installment.status === "Overdue"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : installment.status === "Partially Paid"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : installment.status === "Cancelled"
                      ? "bg-slate-100 text-slate-600 border-slate-300"
                      : "bg-sky-50 text-sky-700 border-sky-200"
                  }`}
                >
                  {(installment.status === "Paid in full" || installment.status === "Paid") && <CheckCircle2 size={12} />}
                  {installment.status === "Overdue" && <AlertCircle size={12} />}
                  {installment.status === "Partially Paid" && <Clock size={12} />}
                  {installment.status === "Cancelled" && <XCircle size={12} />}
                  <span>{installment.status}</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">Target Due Date</span>
              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{installment.dueDate}</span>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-medium block">Expected Amount</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 block">
                {formatINR(expectedAmount)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-medium block">Received to Date</span>
              <span className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5 block">
                {formatINR(receivedAmount)}
              </span>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl">
              <span className="text-[10px] text-rose-700 font-medium block">Outstanding Balance</span>
              <span className="text-sm sm:text-base font-bold text-rose-700 mt-0.5 block">
                {formatINR(remaining)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Collection Progress</span>
              <span className="font-bold text-[#077EA1]">{percentPaid}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#077EA1] to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentPaid}%` }}
              />
            </div>
          </div>

          {/* Linked Invoice Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <FileText size={12} className="text-[#077EA1]" />
                <span>Linked Tax Invoice</span>
              </span>
              {installment.invoiceId && onViewInvoice && (
                <button
                  type="button"
                  onClick={() => onViewInvoice(installment.invoiceId)}
                  className="text-[11px] text-[#077EA1] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View Tax Invoice</span>
                  <ArrowUpRight size={11} />
                </button>
              )}
            </div>

            {installment.invoiceNumber ? (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <div>
                  <span className="font-mono font-bold text-slate-900">{installment.invoiceNumber}</span>
                  {installment.invoiceTotal && (
                    <span className="text-slate-500 text-[11px] ml-2">
                      (Total: {formatINR(installment.invoiceTotal)})
                    </span>
                  )}
                </div>
                {installment.invoiceBalance !== null && (
                  <span className="text-[11px] text-slate-600">
                    Invoice Balance: <strong className="text-rose-600">{formatINR(installment.invoiceBalance)}</strong>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">
                No specific tax invoice is currently tied to this milestone. Payments can be reconciled across invoices.
              </p>
            )}
          </div>

          {/* Cancellation Notice if Cancelled */}
          {installment.status === "Cancelled" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <XCircle size={14} className="text-rose-600" />
                <span>Installment Cancelled</span>
              </div>
              <p className="text-[11px]">
                <strong>Reason:</strong> {installment.cancelReason || "No explanation provided"}
              </p>
              {installment.cancelledAt && (
                <p className="text-[10px] text-rose-600">Cancelled on: {new Date(installment.cancelledAt).toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Payment & Allocation History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Receipt size={14} className="text-emerald-600" />
                <span>Reconciled Payment Allocations ({allocations.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Total Credited: <strong className="text-emerald-700">{formatINR(receivedAmount)}</strong>
              </span>
            </div>

            {allocations.length === 0 ? (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No payment allocations recorded yet for this installment.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Ref / UTR</th>
                      <th className="py-2 px-3">Recorded By</th>
                      <th className="py-2 px-3 text-right">Credited Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((alloc: any, idx: number) => (
                      <tr key={alloc.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium text-slate-800">{alloc.paymentDate || "-"}</td>
                        <td className="py-2 px-3 text-slate-600">{alloc.paymentMethod || "Transfer"}</td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{alloc.transactionRef || "-"}</td>
                        <td className="py-2 px-3 text-slate-600">{alloc.recordedBy || "System"}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 font-mono">
                          +{formatINR(alloc.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes if present */}
          {installment.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
              <span className="font-semibold text-slate-700 block mb-0.5">Notes & Milestones Info:</span>
              <p className="leading-relaxed whitespace-pre-wrap">{installment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Link
            href={`/clients/${installment.clientId}`}
            className="text-slate-600 hover:text-[#077EA1] font-semibold flex items-center gap-1 hover:underline"
          >
            <Building size={13} />
            <span>Open Client Account</span>
          </Link>

          <div className="flex items-center gap-2">
            {remaining > 0 && installment.status !== "Cancelled" && onQuickPay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onQuickPay(installment);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <IndianRupee size={13} />
                <span>Record Payment</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

