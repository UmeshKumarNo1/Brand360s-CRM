"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { FileText, Search, Plus, Mail, Download, CheckCircle2, Clock, AlertCircle, RefreshCw, Eye, XCircle } from "lucide-react";
import { fetchInvoicesAction, sendInvoiceEmailAction, cancelInvoiceAction } from "@/app/actions/invoices";
import { formatINR } from "@/lib/utils";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dueDateFilter, setDueDateFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchInvoicesAction();
      if (currentReqId === requestIdRef.current) {
        setInvoices(data || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load invoices.");
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendEmail = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const res = await sendInvoiceEmailAction(invoiceId);
      if (res.success) {
        success("Invoice dispatched", "Invoice email sent to client billing contact.");
        loadData();
      } else if (res.error) {
        toastError("Email delivery failed", res.error);
      }
    } catch {
      toastError("Delivery failed", "Server connection error.");
    } finally {
      setSendingId(null);
    }
  };

  const handleCancelInvoice = async (invoiceId: string, invoiceNumber: string) => {
    const reason = prompt(`Enter cancellation reason for invoice ${invoiceNumber}:`);
    if (!reason || !reason.trim()) return;

    setCancellingId(invoiceId);
    try {
      const res = await cancelInvoiceAction(invoiceId, reason.trim());
      if (res.success) {
        success("Invoice Cancelled", `Invoice ${invoiceNumber} marked as cancelled.`);
        loadData();
      } else {
        toastError("Cancellation Failed", res.error || "Unable to cancel invoice.");
      }
    } catch {
      toastError("Cancellation Failed", "Server connection error.");
    } finally {
      setCancellingId(null);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const totalInvoiced = invoices.filter((i) => i.status !== "Cancelled").reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status !== "Cancelled").reduce((sum, i) => sum + i.amountPaid, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "Cancelled").reduce((sum, i) => sum + i.balanceDue, 0);
  const totalOverdue = invoices.filter((i) => i.status !== "Cancelled" && i.dueDate < todayStr && i.balanceDue > 0).reduce((sum, i) => sum + i.balanceDue, 0);
  const activeInvoiceCount = invoices.filter((i) => i.status !== "Cancelled").length;

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "All" && inv.status !== statusFilter) return false;
    if (dueDateFilter === "overdue" && !(inv.dueDate < todayStr && inv.balanceDue > 0)) return false;
    if (dueDateFilter === "today" && inv.dueDate !== todayStr) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.companyName && inv.companyName.toLowerCase().includes(q)) ||
      (inv.contactPerson && inv.contactPerson.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Tax Invoices & Billing</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate GST-compliant tax invoices, track payment status, and dispatch bills via Resend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh invoices"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Generate Invoice</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Invoiced</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatINR(totalInvoiced)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Paid</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalPaid)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Outstanding</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{formatINR(totalOutstanding)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Overdue Amount</span>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${totalOverdue > 0 ? "text-rose-600" : "text-slate-900"}`}>{formatINR(totalOverdue)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-500 font-medium">Active Invoices</span>
          <p className="text-xl sm:text-2xl font-bold text-[#077EA1] mt-1">{activeInvoiceCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, client, or contact person..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">Status: All</option>
          <option value="Issued">Issued</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Overdue">Overdue</option>
          <option value="Draft">Draft</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={dueDateFilter}
          onChange={(e) => setDueDateFilter(e.target.value)}
          className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
        >
          <option value="All">Due Date: All</option>
          <option value="overdue">Overdue Only</option>
          <option value="today">Due Today</option>
        </select>
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Invoices Table */}
      {!errorMessage && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#1E293B] border-b border-[#E2E8F0] font-semibold text-[13px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
                        <span>Loading invoices...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                      No invoices found. Click &quot;Generate Invoice&quot; to issue a bill.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/clients/${inv.clientId}`} className="font-semibold text-slate-900 hover:text-[#077EA1] hover:underline">
                          {inv.companyName}
                        </Link>
                        <span className="block text-[11px] text-slate-400">{inv.contactPerson}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.issueDate}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatINR(inv.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {formatINR(inv.taxAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#077EA1]">
                        {formatINR(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        {formatINR(inv.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {formatINR(inv.balanceDue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.status === "Overdue"
                            ? "bg-rose-50 text-rose-700"
                            : inv.status === "Cancelled"
                            ? "bg-slate-100 text-slate-500 line-through"
                            : inv.status === "Partially Paid"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-sky-50 text-sky-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              console.log("[InvoicesPage] Eye icon clicked for invoice:", inv.invoiceNumber, inv.id);
                              setPreviewInvoice(inv);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#077EA1] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Preview & Download PDF"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleSendEmail(inv.id)}
                            disabled={sendingId === inv.id}
                            className="p-1.5 text-slate-500 hover:text-[#077EA1] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title={inv.emailSentAt ? `Sent to ${inv.emailSentTo}` : "Dispatch via Resend Email"}
                          >
                            <Mail size={14} className={sendingId === inv.id ? "animate-pulse text-[#077EA1]" : inv.emailSentAt ? "text-emerald-600" : ""} />
                          </button>
                          {inv.status !== "Cancelled" && inv.amountPaid === 0 && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                              disabled={cancellingId === inv.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Cancel Invoice"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          invoiceId={previewInvoice.id}
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}
