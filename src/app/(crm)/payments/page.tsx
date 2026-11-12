"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { CreditCard, Calendar } from "lucide-react";
import {
  fetchPaymentsAction,
  fetchAllInstallmentsAction,
  deleteInstallmentAction,
} from "@/app/actions/payments";
import { PaymentsHeader } from "@/components/payments/PaymentsHeader";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentTransactionsTable } from "@/components/payments/PaymentTransactionsTable";
import { InstallmentSchedulesTable } from "@/components/payments/InstallmentSchedulesTable";
import { ClientPagination } from "@/components/clients/ClientPagination";
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

  // Pagination for Transactions & Installments
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(10);
  const [installmentPage, setInstallmentPage] = useState(1);
  const [installmentPageSize, setInstallmentPageSize] = useState(10);

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
      .then((data) => {
        if (currentReqId === requestIdRef.current) {
          setPayments(data || []);
        }
      })
      .catch((err) => {
        if (currentReqId === requestIdRef.current) {
          console.error("Error loading payments:", err);
          setErrorMessage(err?.message || "Failed to load payment transactions.");
        }
      })
      .finally(() => {
        if (currentReqId === requestIdRef.current) {
          setIsPaymentsLoading(false);
        }
      });

    fetchAllInstallmentsAction()
      .then((data) => {
        if (currentReqId === requestIdRef.current) {
          setInstallments(data || []);
        }
      })
      .catch((err) => {
        if (currentReqId === requestIdRef.current) {
          console.error("Error loading installments:", err);
        }
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

  // Financial Metrics
  const verifiedPayments = payments.filter((p) => p.status === "Verified");
  const totalVerifiedPayments = verifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalAllocated = verifiedPayments.reduce((acc, p) => acc + (p.totalAllocated || 0), 0);
  const totalUnallocated = Math.max(0, totalVerifiedPayments - totalAllocated);

  const activeInstallments = installments.filter((i) => i.status !== "Cancelled");
  const totalScheduled = activeInstallments.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalInstallmentPaid = activeInstallments.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
  const totalInstallmentRemaining = Math.max(0, totalScheduled - totalInstallmentPaid);
  const overdueCount = activeInstallments.filter((i) => i.status === "Overdue").length;
  const upcomingCount = activeInstallments.filter((i) => i.status === "Upcoming" || i.status === "Due").length;

  // Unique clients for filtering
  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    installments.forEach((inst) => {
      if (inst.clientId && inst.companyName) {
        map.set(inst.clientId, inst.companyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [installments]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
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
  }, [payments, statusFilter, searchQuery]);

  const totalTransactionPages = Math.ceil(filteredPayments.length / transactionPageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (transactionPage - 1) * transactionPageSize;
    return filteredPayments.slice(start, start + transactionPageSize);
  }, [filteredPayments, transactionPage, transactionPageSize]);

  // Filtered Installments
  const todayStr = new Date().toISOString().split("T")[0];
  const filteredInstallments = useMemo(() => {
    return installments.filter((inst) => {
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
  }, [installments, statusFilter, installmentClientFilter, installmentDueDateFilter, searchQuery, todayStr]);

  const totalInstallmentPages = Math.ceil(filteredInstallments.length / installmentPageSize) || 1;
  const paginatedInstallments = useMemo(() => {
    const start = (installmentPage - 1) * installmentPageSize;
    return filteredInstallments.slice(start, start + installmentPageSize);
  }, [filteredInstallments, installmentPage, installmentPageSize]);

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

  const handleReset = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setInstallmentClientFilter("All");
    setInstallmentDueDateFilter("All");
    setTransactionPage(1);
    setInstallmentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header matching Clients page */}
      <PaymentsHeader
        onRefresh={loadData}
        isLoading={isPaymentsLoading || isInstallmentsLoading}
        onCreateInstallment={() => setIsCreateInstallmentModalOpen(true)}
        onRecordPayment={() => {
          setPayForInstallment(null);
          setIsRecordPaymentModalOpen(true);
        }}
      />

      {/* 2. Summary KPI Cards matching Clients page style */}
      <PaymentStatsCards
        totalVerifiedPayments={totalVerifiedPayments}
        paymentsCount={payments.length}
        totalAllocated={totalAllocated}
        totalUnallocated={totalUnallocated}
        totalScheduled={totalScheduled}
        activeMilestonesCount={activeInstallments.length}
        upcomingCount={upcomingCount}
        overdueCount={overdueCount}
        totalInstallmentRemaining={totalInstallmentRemaining}
      />

      {/* 3. Navigation Tabs matching Active / Archived Clients style */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("transactions");
              setStatusFilter("All");
              setTransactionPage(1);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "transactions"
                ? "bg-[#243E76] text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <CreditCard size={14} />
            <span>Transactions ({payments.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("installments");
              setStatusFilter("All");
              setInstallmentPage(1);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "installments"
                ? "bg-[#243E76] text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Calendar size={14} />
            <span>Installment Schedules ({installments.length})</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                {overdueCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 4. Filter Toolbar matching ClientFilters */}
      <PaymentFilters
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={(val) => {
          setSearchQuery(val);
          setTransactionPage(1);
          setInstallmentPage(1);
        }}
        statusFilter={statusFilter}
        setStatusFilter={(val) => {
          setStatusFilter(val);
          setTransactionPage(1);
          setInstallmentPage(1);
        }}
        installmentClientFilter={installmentClientFilter}
        setInstallmentClientFilter={(val) => {
          setInstallmentClientFilter(val);
          setInstallmentPage(1);
        }}
        installmentDueDateFilter={installmentDueDateFilter}
        setInstallmentDueDateFilter={(val) => {
          setInstallmentDueDateFilter(val);
          setInstallmentPage(1);
        }}
        uniqueClients={uniqueClients}
        onReset={handleReset}
      />

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* 5. Transactions Table */}
      {!errorMessage && activeTab === "transactions" && (
        <>
          <PaymentTransactionsTable
            payments={paginatedPayments}
            onAllocatePayment={(p) => setAllocatingPayment(p)}
            onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
          />

          {!isPaymentsLoading && filteredPayments.length > 0 && (
            <ClientPagination
              currentPage={transactionPage}
              totalPages={totalTransactionPages}
              pageSize={transactionPageSize}
              onPageChange={setTransactionPage}
              onPageSizeChange={(size) => {
                setTransactionPageSize(size);
                setTransactionPage(1);
              }}
            />
          )}
        </>
      )}

      {/* 6. Installments Table */}
      {!errorMessage && activeTab === "installments" && (
        <>
          <InstallmentSchedulesTable
            installments={paginatedInstallments}
            onViewInstallment={(inst) => setViewingInstallment(inst)}
            onPayInstallment={(inst) => {
              setPayForInstallment({
                clientId: inst.clientId,
                clientName: inst.companyName,
                installmentId: inst.id,
                remaining: inst.remaining,
              });
              setIsRecordPaymentModalOpen(true);
            }}
            onEditInstallment={(inst) => setEditingInstallment(inst)}
            onCancelInstallment={(inst) => setCancellingInstallment(inst)}
            onDeleteInstallment={handleDeleteInstallment}
            onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
          />

          {!isInstallmentsLoading && filteredInstallments.length > 0 && (
            <ClientPagination
              currentPage={installmentPage}
              totalPages={totalInstallmentPages}
              pageSize={installmentPageSize}
              onPageChange={setInstallmentPage}
              onPageSizeChange={(size) => {
                setInstallmentPageSize(size);
                setInstallmentPage(1);
              }}
            />
          )}
        </>
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
