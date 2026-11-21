"use client";

import { X, FileText, CreditCard, ExternalLink, Calendar, CheckCircle2, Clock } from "lucide-react";
import { formatINR, cn } from "@/lib/utils";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
}

interface PaymentItem {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  allocatedAmount: number;
  status?: string;
}

interface ServiceFinancialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  clientName: string;
  invoices: InvoiceItem[];
  payments: PaymentItem[];
  onPreviewInvoice?: (invoiceId: string) => void;
}

export function ServiceFinancialHistoryModal({
  isOpen,
  onClose,
  serviceName,
  clientName,
  invoices,
  payments,
  onPreviewInvoice,
}: ServiceFinancialHistoryModalProps) {
  if (!isOpen) return null;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.allocatedAmount) || 0), 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0481A2] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invoice &amp; Payment History</h3>
              <p className="text-[11px] text-slate-500">
                {serviceName} • <span className="font-semibold text-slate-700">{clientName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary Mini Bar */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Invoiced</span>
            <strong className="text-slate-900 font-bold font-sans font-number">{formatINR(totalInvoiced)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Collected</span>
            <strong className="text-emerald-700 font-bold font-sans font-number">{formatINR(totalPaid)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outstanding</span>
            <strong className="text-rose-600 font-bold font-sans font-number">{formatINR(totalOutstanding)}</strong>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto text-xs">
          {/* 1. Invoices Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <FileText size={14} className="text-[#0481A2]" />
              <span>Invoices ({invoices.length})</span>
            </h4>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No invoices issued for this service yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold">{inv.invoiceNumber}</strong>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            inv.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          )}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Issued: {inv.issueDate} • Due: {inv.dueDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-slate-900 font-bold text-sm font-sans font-number block">
                          {formatINR(inv.totalAmount)}
                        </span>
                        {inv.balanceDue > 0 && (
                          <span className="text-[10px] text-rose-600 block">
                            Due: {formatINR(inv.balanceDue)}
                          </span>
                        )}
                      </div>
                      {onPreviewInvoice && (
                        <button
                          type="button"
                          onClick={() => onPreviewInvoice(inv.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Payments Allocated Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <CreditCard size={14} className="text-emerald-600" />
              <span>Payments Received ({payments.length})</span>
            </h4>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No payments allocated to this service yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold">{p.paymentNumber}</strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Received
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Date: {p.paymentDate} • Method: {p.paymentMethod}
                      </p>
                    </div>

                    <div className="text-right">
                      <strong className="text-emerald-700 font-bold text-sm font-sans font-number">
                        {formatINR(p.allocatedAmount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
