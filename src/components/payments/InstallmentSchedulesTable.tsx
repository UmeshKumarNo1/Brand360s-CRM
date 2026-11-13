"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Eye,
  IndianRupee,
  Pencil,
  XCircle,
  Trash2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";

interface InstallmentSchedulesTableProps {
  installments: any[];
  onViewInstallment: (inst: any) => void;
  onPayInstallment: (inst: any) => void;
  onEditInstallment: (inst: any) => void;
  onCancelInstallment: (inst: any) => void;
  onDeleteInstallment: (inst: any) => void;
  onPreviewInvoice: (invoiceId: string) => void;
}

export function InstallmentSchedulesTable({
  installments,
  onViewInstallment,
  onPayInstallment,
  onEditInstallment,
  onCancelInstallment,
  onDeleteInstallment,
  onPreviewInvoice,
}: InstallmentSchedulesTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid in full":
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Overdue":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-300";
      case "Due":
        return "bg-amber-50 text-amber-800 border-amber-300";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto xl:overflow-x-visible">
        <table className="w-full min-w-[980px] xl:min-w-full text-left border-collapse text-xs sm:text-sm">
          {/* Navy Blue Table Header matching ClientsTable */}
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold text-xs sm:text-[13px] tracking-wide">
              <th className="py-3.5 px-3.5 font-semibold text-left">Client</th>
              <th className="py-3.5 px-3 font-semibold text-left whitespace-nowrap">Linked Invoice</th>
              <th className="py-3.5 px-3.5 font-semibold text-left">Milestone</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Expected Amount</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Received Amount</th>
              <th className="py-3.5 px-3 text-right font-semibold whitespace-nowrap">Outstanding Balance</th>
              <th className="py-3.5 px-3.5 font-semibold text-left whitespace-nowrap">Due Date</th>
              <th className="py-3.5 px-3 font-semibold text-center whitespace-nowrap">Status</th>
              <th className="py-3.5 px-3 text-center w-32 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {installments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                  No installment schedules found matching your filters.
                </td>
              </tr>
            ) : (
              installments.map((inst) => {
                const isPaid = inst.status === "Paid in full" || inst.status === "Paid";
                const isCancelled = inst.status === "Cancelled";

                return (
                  <tr
                    key={inst.id}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {/* Client */}
                    <td className="py-4 px-3.5 font-bold">
                      <div className="flex flex-col">
                        <Link
                          href={`/clients/${inst.clientId}`}
                          className="text-[#0481A2] hover:underline flex items-center gap-1 group font-semibold"
                        >
                          <span>{inst.companyName}</span>
                          <ArrowUpRight
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2]"
                          />
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          {inst.clientCode}
                        </span>
                      </div>
                    </td>

                    {/* Linked Invoice */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      {inst.invoiceNumber ? (
                        <button
                          onClick={() => onPreviewInvoice(inst.invoiceId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#243E76]/10 text-[#243E76] hover:bg-[#243E76]/20 font-mono text-[11px] font-semibold border border-[#243E76]/20 transition-colors cursor-pointer"
                          title="Click to preview invoice"
                        >
                          <span>{inst.invoiceNumber}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not linked</span>
                      )}
                    </td>

                    {/* Milestone */}
                    <td className="py-4 px-3.5">
                      <div className="font-semibold text-slate-800">{inst.title}</div>
                      {inst.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {inst.notes}
                        </div>
                      )}
                    </td>

                    {/* Expected Amount */}
                    <td className="py-4 px-3 text-right font-bold text-slate-900 font-sans font-number whitespace-nowrap">
                      {formatINR(inst.amount)}
                    </td>

                    {/* Received Amount */}
                    <td className="py-4 px-3 text-right font-medium text-emerald-600 font-sans font-number whitespace-nowrap">
                      {formatINR(inst.amountPaid)}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-4 px-3 text-right font-bold text-rose-600 font-sans font-number whitespace-nowrap">
                      {formatINR(inst.remaining)}
                    </td>

                    {/* Due Date */}
                    <td className="py-4 px-3.5 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          inst.status === "Overdue"
                            ? "text-rose-600 font-bold"
                            : "text-slate-700"
                        }`}
                      >
                        {inst.dueDate}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                          inst.status
                        )}`}
                      >
                        {(inst.status === "Paid in full" || inst.status === "Paid") && (
                          <CheckCircle2 size={11} />
                        )}
                        {inst.status === "Overdue" && <AlertCircle size={11} />}
                        {inst.status === "Partially Paid" && <Clock size={11} />}
                        <span>{inst.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Details Button */}
                        <button
                          onClick={() => onViewInstallment(inst)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0481A2] border border-sky-200 transition-all shadow-2xs cursor-pointer"
                          title="View installment and payment allocation history"
                        >
                          <Eye size={13} strokeWidth={2} />
                        </button>

                        {/* Pay Button */}
                        {!isPaid && !isCancelled && (
                          <button
                            onClick={() => onPayInstallment(inst)}
                            className="inline-flex items-center justify-center px-2 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Record payment for this installment"
                          >
                            <IndianRupee size={12} className="mr-0.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        {!isCancelled && (
                          <button
                            onClick={() => onEditInstallment(inst)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                            title="Edit milestone"
                          >
                            <Pencil size={12} />
                          </button>
                        )}

                        {/* Cancel Button */}
                        {!isCancelled && !isPaid && (
                          <button
                            onClick={() => onCancelInstallment(inst)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition-all shadow-2xs cursor-pointer"
                            title="Cancel installment schedule"
                          >
                            <XCircle size={12} />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteInstallment(inst)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-2xs cursor-pointer"
                          title="Delete milestone"
                        >
                          <Trash2 size={12} />
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

