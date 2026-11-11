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
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "installments">("transactions");
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isCreateInstallmentModalOpen, setIsCreateInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<any | null>(null);
  const [allocatingPayment, setAllocatingPayment] = useState<any | null>(null);

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
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [payData, instData] = await Promise.all([
        fetchPaymentsAction(),
        fetchAllInstallmentsAction(),
      ]);
      if (currentReqId === requestIdRef.current) {
        setPayments(payData || []);
        setInstallments(instData || []);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load payment transactions.");
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

  const totalCollected = payments
    .filter((p) => p.status === "Verified")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalScheduled = installments.reduce((sum, i) => sum + i.amount, 0);
  const totalInstallmentRemaining = installments.reduce((sum, i) => sum + i.remaining, 0);
  const overdueCount = installments.filter((i) => i.status === "Overdue").length;

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

  const filteredInstallments = installments.filter((inst) => {
    if (statusFilter !== "All" && inst.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inst.companyName && inst.companyName.toLowerCase().includes(q)) ||
      (inst.clientCode && inst.clientCode.toLowerCase().includes(q)) ||
      (inst.title && inst.title.toLowerCase().includes(q))
    );
  });

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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Partially Paid":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Overdue":
        return "bg-rose-50 text-rose-700 border-rose-200";
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
            <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
          </button>

          <button
            onClick={() => setIsCreateInstallmentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar size={16} className="text-[#077EA1]" />
            <span>+ Create Installment</span>
          </button>

          <button
            onClick={() => {
              setPayForInstallment(null);
              setIsRecordPaymentModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#077EA1] hover:bg-[#066B89] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Verified Receipts</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{formatINR(totalCollected)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{payments.length} transactions</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Scheduled Milestones</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatINR(totalScheduled)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{installments.length} installments defined</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Outstanding to Collect</span>
          <p className="text-xl sm:text-2xl font-bold text-sky-700 mt-1">{formatINR(totalInstallmentRemaining)}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Pending & partial milestones</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Overdue Installments</span>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {overdueCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Past target due date</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("transactions");
            setStatusFilter("All");
          }}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "transactions"
              ? "border-[#077EA1] text-[#077EA1]"
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
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "installments"
              ? "border-[#077EA1] text-[#077EA1]"
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
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] text-slate-800 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {activeTab === "transactions" ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
          >
            <option value="All">All Verification Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Rejected">Rejected</option>
          </select>
        ) : (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] font-medium text-slate-700 shadow-xs cursor-pointer"
          >
            <option value="All">All Milestone Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid in full">Paid in full</option>
            <option value="Overdue">Overdue</option>
          </select>
        )}
      </div>

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* TAB CONTENT: TRANSACTIONS */}
      {!errorMessage && activeTab === "transactions" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
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
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Reference / UTR</th>
                    <th className="py-2.5 px-4">Recorded By</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/clients/${p.clientId}`}
                          className="font-semibold text-slate-900 hover:text-[#077EA1] hover:underline flex items-center gap-1 group"
                        >
                          <span>{p.companyName}</span>
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#077EA1]" />
                        </Link>
                        <span className="text-[10px] text-slate-400 font-mono">{p.clientCode}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
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
                      <td className="py-3 px-4 text-slate-600 font-medium">{p.paymentDate}</td>
                      <td className="py-3 px-4 text-slate-700">{p.paymentMethod}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.transactionRef}</td>
                      <td className="py-3 px-4 text-slate-600">{p.recordedBy}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            p.status === "Verified"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: INSTALLMENTS */}
      {!errorMessage && activeTab === "installments" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-[#077EA1]" />
              <span>Loading installments...</span>
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>No client installment schedules found.</p>
              <button
                onClick={() => setIsCreateInstallmentModalOpen(true)}
                className="text-[#077EA1] font-semibold hover:underline cursor-pointer"
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
                    <th className="py-2.5 px-4">Milestone</th>
                    <th className="py-2.5 px-4 text-right">Target Amount</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-right">Remaining</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInstallments.map((inst) => {
                    const isPaid = inst.status === "Paid in full";
                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/clients/${inst.clientId}`}
                            className="font-semibold text-slate-900 hover:text-[#077EA1] hover:underline flex items-center gap-1 group"
                          >
                            <span>{inst.companyName}</span>
                            <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#077EA1]" />
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">{inst.clientCode}</span>
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
                            className={`font-medium ${
                              inst.status === "Overdue" ? "text-rose-600 font-bold" : "text-slate-700"
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
                            {inst.status === "Paid in full" && <CheckCircle2 size={10} />}
                            {inst.status === "Overdue" && <AlertCircle size={10} />}
                            {inst.status === "Pending" && <Clock size={10} />}
                            {inst.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
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
                                Record Pay
                              </button>
                            )}
                            <button
                              onClick={() => setEditingInstallment(inst)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit milestone"
                            >
                              <Edit2 size={13} />
                            </button>
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

      <AllocatePaymentModal
        isOpen={!!allocatingPayment}
        payment={allocatingPayment}
        onClose={() => setAllocatingPayment(null)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
