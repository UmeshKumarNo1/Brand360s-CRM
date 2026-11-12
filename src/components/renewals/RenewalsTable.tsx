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
  onOpenDetails?: (renewal: RenewalItem) => void;
  onCompleteRenewal?: (renewal: RenewalItem) => void;
  onCancelRenewal?: (renewal: RenewalItem) => void;
  onGenerateInvoice?: (renewal: RenewalItem) => void;
}

export function RenewalsTable({
  renewals,
  onRenewClick,
  onCreateFollowup,
  onViewHistory,
  onPreviewInvoice,
  onOpenDetails,
  onCompleteRenewal,
  onCancelRenewal,
  onGenerateInvoice,
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
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            Pending
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Cancelled
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
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#243E76] text-white font-semibold">
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider">Client</th>
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider">Service</th>
              <th className="py-2.5 px-2 font-semibold text-xs tracking-wider whitespace-nowrap">Previous Expiry</th>
              <th className="py-2.5 px-2 font-semibold text-xs tracking-wider whitespace-nowrap">Renewal Start</th>
              <th className="py-2.5 px-2 font-semibold text-xs tracking-wider whitespace-nowrap">Renewal End</th>
              <th className="py-2.5 px-2 text-right font-semibold text-xs tracking-wider whitespace-nowrap">Amount</th>
              <th className="py-2.5 px-2 text-center font-semibold text-xs tracking-wider whitespace-nowrap">Payment</th>
              <th className="py-2.5 px-2 text-center font-semibold text-xs tracking-wider whitespace-nowrap">Status</th>
              <th className="py-2.5 px-3 font-semibold text-xs tracking-wider text-right whitespace-nowrap">Actions</th>
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
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors h-[62px]">
                  {/* Client */}
                  <td className="py-2 px-3 align-middle">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onOpenDetails && onOpenDetails(r)}
                        className="hover:text-[#0481A2] hover:underline text-left cursor-pointer"
                        title="View Renewal Details"
                      >
                        {r.clientName}
                      </button>
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="text-[#0481A2] hover:text-[#036c88] transition-colors"
                        title="Open client detail"
                      >
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                      {r.clientCode} &bull; {r.salesperson}
                    </div>
                  </td>

                  {/* Service */}
                  <td className="py-2 px-3 align-middle">
                    <span className="font-semibold text-slate-800 block whitespace-nowrap">{r.serviceName}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{r.serviceCategory}</span>
                  </td>

                  {/* Previous Expiry */}
                  <td className="py-2 px-2 text-slate-600 font-medium whitespace-nowrap align-middle">
                    {r.previousExpiryDate || r.currentExpiryDate || "-"}
                  </td>

                  {/* Renewal Start */}
                  <td className="py-2 px-2 text-slate-600 whitespace-nowrap align-middle">
                    {r.renewalStartDate || r.currentExpiryDate || "-"}
                  </td>

                  {/* Renewal End */}
                  <td className="py-2 px-2 font-semibold text-[#1B3260] whitespace-nowrap align-middle">
                    {r.renewalEndDate || r.renewalDate || "-"}
                  </td>

                  {/* Renewal Amount */}
                  <td className="py-2 px-2 font-bold font-number text-slate-900 text-right whitespace-nowrap align-middle">
                    {formatINR(r.renewalAmount)}
                  </td>

                  {/* Payment Status */}
                  <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                    <div className="flex flex-col items-center gap-0.5">
                      {getPaymentStatusBadge(r.paymentStatus)}
                      {r.invoiceId ? (
                        <button
                          onClick={() => onPreviewInvoice && r.invoiceId && onPreviewInvoice(r.invoiceId)}
                          className="text-[9px] text-[#0481A2] hover:underline font-mono"
                          title="Preview invoice"
                        >
                          {r.invoiceNumber || "Invoice"}
                        </button>
                      ) : (
                        r.renewalStatus === "Pending" && onGenerateInvoice && (
                          <button
                            onClick={() => onGenerateInvoice(r)}
                            className="text-[9px] text-sky-600 hover:underline"
                            title="Generate invoice"
                          >
                            + Invoice
                          </button>
                        )
                      )}
                    </div>
                  </td>

                  {/* Renewal Status */}
                  <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                    {getStatusBadge(r.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-right whitespace-nowrap align-middle">
                    <div className="inline-flex items-center gap-1.5 justify-end flex-nowrap">
                      {/* View Details */}
                      {onOpenDetails && (
                        <button
                          onClick={() => onOpenDetails(r)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                          title="View Details"
                        >
                          View
                        </button>
                      )}

                      {/* Complete Renewal if pending */}
                      {r.renewalStatus === "Pending" && onCompleteRenewal && (
                        <button
                          onClick={() => onCompleteRenewal(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer shrink-0"
                          title="Complete and update service expiry"
                        >
                          <CheckCircle2 size={11} />
                          <span>Complete</span>
                        </button>
                      )}

                      {/* Regular Renew action for active services */}
                      {r.renewalStatus !== "Pending" && (
                        <button
                          onClick={() => onRenewClick(r)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#0481A2] text-white hover:bg-[#036c88] transition-colors shadow-2xs cursor-pointer shrink-0"
                          title="Renew service"
                        >
                          <RefreshCw size={11} />
                          <span>Renew</span>
                        </button>
                      )}

                      {/* Cancel if pending */}
                      {r.renewalStatus === "Pending" && onCancelRenewal && (
                        <button
                          onClick={() => onCancelRenewal(r)}
                          className="px-1.5 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
                          title="Cancel renewal"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => onViewHistory(r)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0481A2] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="View Renewal History"
                      >
                        <History size={12} />
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
