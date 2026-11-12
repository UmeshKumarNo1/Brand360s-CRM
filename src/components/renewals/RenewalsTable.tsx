"use client";

import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { RenewalItem } from "@/app/actions/renewals";
import {
  RefreshCw,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  FileText,
} from "lucide-react";

interface RenewalsTableProps {
  renewals: RenewalItem[];
  onRenewClick: (renewal: RenewalItem) => void;
  onCreateFollowup: (renewal: RenewalItem) => void;
  onViewHistory: (renewal: RenewalItem) => void;
  onPreviewInvoice?: (invoiceId: string) => void;
}

export function RenewalsTable({
  renewals,
  onRenewClick,
  onCreateFollowup,
  onViewHistory,
  onPreviewInvoice,
}: RenewalsTableProps) {
  const getStatusBadge = (status: RenewalItem["status"]) => {
    switch (status) {
      case "Renewed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} />
            Renewed
          </span>
        );
      case "Due Soon":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            Due Soon
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={11} />
            Overdue
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Expired
          </span>
        );
      case "Upcoming":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Calendar size={11} />
            Upcoming
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: RenewalItem["paymentStatus"]) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paid
          </span>
        );
      case "Partially Paid":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Partial
          </span>
        );
      case "Unpaid":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[1080px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold">
              <th className="py-3 px-4 font-semibold text-xs tracking-wider">Client</th>
              <th className="py-3 px-4 font-semibold text-xs tracking-wider">Service</th>
              <th className="py-3 px-3 font-semibold text-xs tracking-wider whitespace-nowrap">Current Expiry</th>
              <th className="py-3 px-3 font-semibold text-xs tracking-wider whitespace-nowrap">Renewal Date</th>
              <th className="py-3 px-3 text-right font-semibold text-xs tracking-wider whitespace-nowrap">Renewal Amount</th>
              <th className="py-3 px-3 font-semibold text-xs tracking-wider whitespace-nowrap">Salesperson</th>
              <th className="py-3 px-3 text-center font-semibold text-xs tracking-wider whitespace-nowrap">Payment</th>
              <th className="py-3 px-3 text-center font-semibold text-xs tracking-wider whitespace-nowrap">Status</th>
              <th className="py-3 px-4 font-semibold text-xs tracking-wider text-right whitespace-nowrap min-w-[210px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {renewals.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <RefreshCw size={28} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="font-medium text-slate-600 text-xs">No service renewals found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Service contracts and subscriptions will appear here automatically.
                  </p>
                </td>
              </tr>
            ) : (
              renewals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors h-[64px]">
                  {/* Client */}
                  <td className="py-2.5 px-4 align-middle">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                      <span>{r.clientName}</span>
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="text-[#0481A2] hover:text-[#036c88] transition-colors"
                        title="Open client detail"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                      {r.clientCode}
                    </div>
                  </td>

                  {/* Service */}
                  <td className="py-2.5 px-4 align-middle">
                    <span className="font-semibold text-slate-800 block whitespace-nowrap">{r.serviceName}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{r.serviceCategory}</span>
                  </td>

                  {/* Expiry */}
                  <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap align-middle">
                    {r.currentExpiryDate}
                  </td>

                  {/* Renewal Date */}
                  <td className="py-2.5 px-3 font-semibold text-[#1B3260] whitespace-nowrap align-middle">
                    {r.renewalDate}
                  </td>

                  {/* Renewal Amount */}
                  <td className="py-2.5 px-3 font-bold font-number text-slate-900 text-right whitespace-nowrap align-middle">
                    {formatINR(r.renewalAmount)}
                  </td>

                  {/* Salesperson */}
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap align-middle">
                    {r.salesperson}
                  </td>

                  {/* Payment Status */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap align-middle">
                    <div className="flex flex-col items-center gap-1">
                      {getPaymentStatusBadge(r.paymentStatus)}
                      {r.invoiceId && (
                        <button
                          onClick={() => onPreviewInvoice && r.invoiceId && onPreviewInvoice(r.invoiceId)}
                          className="text-[10px] text-[#0481A2] hover:underline font-mono"
                          title="Preview invoice"
                        >
                          {r.invoiceNumber || "Invoice"}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Renewal Status */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap align-middle">
                    {getStatusBadge(r.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right whitespace-nowrap align-middle">
                    <div className="inline-flex items-center gap-1.5 justify-end flex-nowrap">
                      <button
                        onClick={() => onRenewClick(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0481A2] text-white hover:bg-[#036c88] transition-colors shadow-2xs cursor-pointer shrink-0"
                        title="Renew service for another period"
                      >
                        <RefreshCw size={12} />
                        <span>Renew</span>
                      </button>

                      <button
                        onClick={() => onCreateFollowup(r)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Schedule follow-up reminder"
                      >
                        Follow-up
                      </button>

                      <button
                        onClick={() => onViewHistory(r)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0481A2] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="View Renewal History"
                      >
                        <History size={13} />
                      </button>
                    </div>
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
