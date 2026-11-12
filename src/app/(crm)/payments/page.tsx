"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  fetchPaymentsAction,
  fetchAllInstallmentsAction,
  deleteInstallmentAction,
} from "@/app/actions/payments";
import { formatINR } from "@/lib/utils";
import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { CreateInstallmentModal } from "@/components/payments/CreateInstallmentModal";
import { EditInstallmentModal } from "@/components/payments/EditInstallmentModal";
import { AllocatePaymentModal } from "@/components/payments/AllocatePaymentModal";
import { InstallmentDetailsModal } from "@/components/payments/InstallmentDetailsModal";
import { CancelInstallmentModal } from "@/components/payments/CancelInstallmentModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "installments">("transactions");
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(true);
  const [isInstallmentsLoading, setIsInstallmentsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isCreateInstallmentModalOpen, setIsCreateInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<any | null>(null);
  const [viewingInstallment, setViewingInstallment] = useState<any | null>(null);
  const [cancellingInstallment, setCancellingInstallment] = useState<any | null>(null);
  const [allocatingPayment, setAllocatingPayment] = useState<any | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  // Installment Table Filters
  const [installmentClientFilter, setInstallmentClientFilter] = useState("All");
  const [installmentDueDateFilter, setInstallmentDueDateFilter] = useState("All");
  const [installmentPage, setInstallmentPage] = useState(1);
  const INSTALLMENTS_PER_PAGE = 10;

  // Quick pay from installment
  const [payForInstallment, setPayForInstallment] = useState<{
    clientId: string;
    clientName: string;
    installmentId: string;
    remaining: number;
  } | null>(null);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsPaymentsLoading(true);
    setIsInstallmentsLoading(true);
    setErrorMessage(null);

    // Fetch payments and installments with separate error boundaries
    fetchPaymentsAction()
      .then((payData) => {
        if (currentReqId === requestIdRef.current) {
          setPayments(payData || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load payments:", err);
      })
      .finally(() => {
        if (currentReqId === requestIdRef.current) {
          setIsPaymentsLoading(false);
        }
      });

    fetchAllInstallmentsAction()
      .then((instData) => {
        if (currentReqId === requestIdRef.current) {
          setInstallments(instData || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load installments:", err);
      })
      .finally(() => {
        if (currentReqId === requestIdRef.current) {
          setIsInstallmentsLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalVerifiedPayments = payments
    .filter((p) => p.status === "Verified")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAllocated = payments.reduce((sum, p) => sum + (p.totalAllocated || 0), 0);
  const totalUnallocated = Math.max(0, totalVerifiedPayments - totalAllocated);

  const activeInstallments = installments.filter((i) => i.status !== "Cancelled");
  const totalScheduled = activeInstallments.reduce((sum, i) => sum + i.amount, 0);
  const totalInstallmentRemaining = activeInstallments.reduce((sum, i) => sum + i.remaining, 0);
  const overdueCount = activeInstallments.filter((i) => i.status === "Overdue").length;
  const upcomingCount = activeInstallments.filter((i) => i.status === "Upcoming" || i.status === "Due").length;

  // Unique clients for filter dropdown
  const uniqueClients = Array.from(
    new Map(installments.map((i) => [i.clientId, { id: i.clientId, name: i.companyName }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.clientCode && p.clientCode.toLowerCase().includes(q)) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q)) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(q))
    );
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredInstallments = installments.filter((inst) => {
    if (statusFilter !== "All" && inst.status !== statusFilter) return false;
    if (installmentClientFilter !== "All" && inst.clientId !== installmentClientFilter) return false;

    if (installmentDueDateFilter === "Overdue" && inst.status !== "Overdue") return false;
    if (installmentDueDateFilter === "Due Today" && inst.dueDate !== todayStr) return false;
    if (installmentDueDateFilter === "This Month") {
      const currentMonth = todayStr.slice(0, 7);
      if (!inst.dueDate?.startsWith(currentMonth)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inst.companyName && inst.companyName.toLowerCase().includes(q)) ||
      (inst.clientCode && inst.clientCode.toLowerCase().includes(q)) ||
      (inst.title && inst.title.toLowerCase().includes(q)) ||
      (inst.invoiceNumber && inst.invoiceNumber.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredInstallments.length / INSTALLMENTS_PER_PAGE) || 1;
  const paginatedInstallments = filteredInstallments.slice(
    (installmentPage - 1) * INSTALLMENTS_PER_PAGE,
    installmentPage * INSTALLMENTS_PER_PAGE
  );

  const handleDeleteInstallment = async (inst: any) => {
    if (!confirm(`Delete installment "${inst.title}" for ${inst.companyName}?`)) return;

    setInstallments((prev) => prev.filter((i) => i.id !== inst.id));

    try {
      await deleteInstallmentAction(inst.id, inst.clientId);
      success("Installment deleted", "Schedule milestone removed.");
      loadData();
    } catch {
      toastError("Failed to delete installment", "Server connection error.");
      loadData();
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Payments & Installments
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track client transaction receipts, milestone schedules, and collection settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Refresh payments"
          >
            <RefreshCw size={15} className={(isPaymentsLoading || isInstallmentsLoading) ? "animate-spin text-[#0481A2]" : ""} />
          </button>

          <button
            onClick={() => setIsCreateInstallmentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={16} className="text-[#0481A2]" />
            <span>+ Create Installment</span>
          </button>

          <button
            onClick={() => {
              setPayForInstallment(null);
              setIsRecordPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Dashboard KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Verified Receipts</span>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">{formatINR(totalVerifiedPayments)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{payments.length} transactions</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Allocated to Invoices</span>
          <p className="text-base sm:text-lg font-bold text-[#077EA1] mt-0.5">{formatINR(totalAllocated)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Reconciled funds</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Unallocated Pool</span>
          <p className={`text-base sm:text-lg font-bold mt-0.5 ${totalUnallocated > 0 ? "text-amber-600" : "text-slate-700"}`}>
            {formatINR(totalUnallocated)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Available to allocate</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Installments</span>
          <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{formatINR(totalScheduled)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{activeInstallments.length} active milestones</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Upcoming / Due</span>
          <p className="text-base sm:text-lg font-bold text-sky-700 mt-0.5">{upcomingCount}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Pending collection</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium">Overdue Milestones</span>
          <p className={`text-base sm:text-lg font-bold mt-0.5 ${overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {overdueCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Past due date</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium">Outstanding Bal</span>
          <p className="text-base sm:text-lg font-bold text-rose-600 mt-0.5">{formatINR(totalInstallmentRemaining)}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Remaining to receive</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("transactions");
            setStatusFilter("All");
          }}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${activeTab === "transactions"
              ? "border-[#0481A2] text-[#0481A2]"
              : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <CreditCard size={15} />
          <span>Transactions ({payments.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("installments");
            setStatusFilter("All");
          }}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${activeTab === "installments"
              ? "border-[#0481A2] text-[#0481A2]"
              : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <Calendar size={15} />
          <span>Installment Schedules ({installments.length})</span>
          {overdueCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "transactions"
                ? "Search by company name, UTR, or payment method..."
                : "Search by client name, client code, or milestone title..."
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0481A2] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {activeTab === "transactions" ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0481A2] font-medium text-slate-700 shadow-xs cursor-pointer"
          >
            <option value="All">All Verification Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        ) : (

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setInstallmentPage(1);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Due">Due</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid in full">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={installmentClientFilter}
              onChange={(e) => {
                setInstallmentClientFilter(e.target.value);
                setInstallmentPage(1);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer max-w-[180px] truncate"
            >
              <option value="All">All Clients</option>
              {uniqueClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={installmentDueDateFilter}
              onChange={(e) => {
                setInstallmentDueDateFilter(e.target.value);
                setInstallmentPage(1);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
            >
              <option value="All">All Due Dates</option>
              <option value="Overdue">Overdue Only</option>
              <option value="Due Today">Due Today</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

        )}
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* TAB CONTENT: TRANSACTIONS */}
      {!errorMessage && activeTab === "transactions" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {isPaymentsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-[#0481A2]" />
              <span>Loading payment receipts...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No payment transactions found matching filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Allocation</th>
                    <th className="py-2.5 px-4">Linked Invoices</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Reference / UTR</th>
                    <th className="py-2.5 px-4">Recorded By</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => {
                    const linkedAllocations = p.allocations || [];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/clients/${p.clientId}`}
                            className="font-semibold text-slate-900 hover:text-[#0481A2] hover:underline flex items-center gap-1 group"
                          >
                            <span>{p.companyName}</span>
                            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2]" />
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">{p.clientCode}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${p.allocationStatus === "Fully Allocated"
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
                        <td className="py-3 px-4">
                          {linkedAllocations.length === 0 ? (
                            <span className="text-slate-400 text-[11px] italic">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {linkedAllocations.map((alloc: any) => {
                                const invNumber =
                                  alloc.invoice?.invoice_number ||
                                  alloc.invoice_number ||
                                  "Invoice";
                                const invId = alloc.invoice?.id || alloc.invoice_id;
                                return (
                                  <button
                                    key={alloc.id}
                                    onClick={() => setPreviewInvoiceId(invId)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#243E76]/10 text-[#243E76] hover:bg-[#243E76]/20 font-mono text-[10px] font-semibold border border-[#243E76]/20 transition-colors cursor-pointer"
                                    title={`Allocated: ${formatINR(Number(alloc.allocated_amount) || 0)} - Click to view invoice`}
                                  >
                                    <span>{invNumber}</span>
                                    <span className="text-slate-500 font-normal">({formatINR(Number(alloc.allocated_amount) || 0)})</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{p.paymentDate}</td>
                        <td className="py-3 px-4 text-slate-700">{p.paymentMethod}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.transactionRef}</td>
                        <td className="py-3 px-4 text-slate-600">{p.recordedBy}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === "Verified"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                          >
                            {p.status === "Verified" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setAllocatingPayment(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#077EA1]/30 text-[#077EA1] hover:bg-[#077EA1]/10 transition-colors cursor-pointer"
                            title="Allocate payment to client invoices"
                          >
                            <span>Allocate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: INSTALLMENTS */}
      {!errorMessage && activeTab === "installments" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {isInstallmentsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-[#0481A2]" />
              <span>Loading installments...</span>
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>No client installment schedules found matching filters.</p>
              <button
                onClick={() => setIsCreateInstallmentModalOpen(true)}
                className="text-[#0481A2] font-semibold hover:underline cursor-pointer"
              >
                + Create First Installment Milestone
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Client</th>
                    <th className="py-2.5 px-4">Linked Invoice</th>
                    <th className="py-2.5 px-4">Milestone</th>
                    <th className="py-2.5 px-4 text-right">Expected Amount</th>
                    <th className="py-2.5 px-4 text-right">Received Amount</th>
                    <th className="py-2.5 px-4 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInstallments.map((inst) => {
                    const isPaid = inst.status === "Paid in full" || inst.status === "Paid";
                    const isCancelled = inst.status === "Cancelled";
                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/clients/${inst.clientId}`}
                            className="font-semibold text-slate-900 hover:text-[#0481A2] hover:underline flex items-center gap-1 group"
                          >
                            <span>{inst.companyName}</span>
                            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0481A2]" />
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">{inst.clientCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          {inst.invoiceNumber ? (
                            <button
                              onClick={() => setPreviewInvoiceId(inst.invoiceId)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#243E76]/10 text-[#243E76] hover:bg-[#243E76]/20 font-mono text-[10px] font-semibold border border-[#243E76]/20 transition-colors cursor-pointer"
                              title="Click to preview invoice"
                            >
                              <span>{inst.invoiceNumber}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Not linked</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{inst.title}</div>
                          {inst.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{inst.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatINR(inst.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">
                          {formatINR(inst.amountPaid)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          {formatINR(inst.remaining)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-medium ${inst.status === "Overdue" ? "text-rose-600 font-bold" : "text-slate-700"
                              }`}
                          >
                            {inst.dueDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                              inst.status
                            )}`}
                          >
                            {(inst.status === "Paid in full" || inst.status === "Paid") && <CheckCircle2 size={10} />}
                            {inst.status === "Overdue" && <AlertCircle size={10} />}
                            {inst.status === "Partially Paid" && <Clock size={10} />}
                            {inst.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingInstallment(inst)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="View installment and payment allocation history"
                            >
                              Details
                            </button>

                            {!isPaid && !isCancelled && (
                              <button
                                onClick={() => {
                                  setPayForInstallment({
                                    clientId: inst.clientId,
                                    clientName: inst.companyName,
                                    installmentId: inst.id,
                                    remaining: inst.remaining,
                                  });
                                  setIsRecordPaymentModalOpen(true);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Pay
                              </button>
                            )}

                            {!isCancelled && (
                              <button
                                onClick={() => setEditingInstallment(inst)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Edit milestone"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {!isCancelled && (
                              <button
                                onClick={() => setCancellingInstallment(inst)}
                                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                title="Cancel installment schedule"
                              >
                                <AlertCircle size={13} />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteInstallment(inst)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete milestone"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Showing {(installmentPage - 1) * INSTALLMENTS_PER_PAGE + 1} to{" "}
                    {Math.min(installmentPage * INSTALLMENTS_PER_PAGE, filteredInstallments.length)} of{" "}
                    {filteredInstallments.length} installments
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={installmentPage <= 1}
                      onClick={() => setInstallmentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold">
                      {installmentPage} / {totalPages}
                    </span>
                    <button
                      disabled={installmentPage >= totalPages}
                      onClick={() => setInstallmentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setPayForInstallment(null);
        }}
        onSuccess={() => loadData()}
        defaultClientId={payForInstallment?.clientId}
        defaultClientName={payForInstallment?.clientName}
        defaultInstallmentId={payForInstallment?.installmentId}
        defaultAmount={payForInstallment?.remaining}
        availableInstallments={
          payForInstallment
            ? installments
              .filter((i) => i.clientId === payForInstallment.clientId)
              .map((i) => ({
                id: i.id,
                title: i.title,
                amount: i.amount,
                amount_paid: i.amountPaid,
                remaining: i.remaining,
                due_date: i.dueDate,
                status: i.status,
              }))
            : []
        }
      />

      <CreateInstallmentModal
        isOpen={isCreateInstallmentModalOpen}
        onClose={() => setIsCreateInstallmentModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <EditInstallmentModal
        isOpen={!!editingInstallment}
        installment={editingInstallment}
        onClose={() => setEditingInstallment(null)}
        onSuccess={() => loadData()}
      />

      <InstallmentDetailsModal
        isOpen={!!viewingInstallment}
        installment={viewingInstallment}
        onClose={() => setViewingInstallment(null)}
        onQuickPay={(inst) => {
          setPayForInstallment({
            clientId: inst.clientId,
            clientName: inst.companyName,
            installmentId: inst.id,
            remaining: inst.remaining,
          });
          setIsRecordPaymentModalOpen(true);
        }}
        onViewInvoice={(invId) => setPreviewInvoiceId(invId)}
      />

      <CancelInstallmentModal
        isOpen={!!cancellingInstallment}
        installment={cancellingInstallment}
        onClose={() => setCancellingInstallment(null)}
        onSuccess={() => loadData()}
      />

      <AllocatePaymentModal
        isOpen={!!allocatingPayment}
        payment={allocatingPayment}
        onClose={() => setAllocatingPayment(null)}
        onSuccess={() => loadData()}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoiceId}
        invoiceId={previewInvoiceId || undefined}
        onClose={() => setPreviewInvoiceId(null)}
      />
    </div>
  );
}
