"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { ClientStatsCards } from "@/components/clients/ClientStatsCards";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientPagination } from "@/components/clients/ClientPagination";
import { ClientRecord, MOCK_CLIENTS } from "@/data/mockClients";
import { fetchClientsAction } from "@/app/actions/clients";
import {
  deleteClientAction,
  archiveClientAction,
  checkClientDependenciesAction,
  DeleteClientCheckResult,
} from "@/app/actions/client-delete";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { RefreshCw } from "lucide-react";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function ClientsPage() {
  const [dbClients, setDbClients] = useState<ClientRecord[]>(MOCK_CLIENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Deletion and Archive Modal state
  const [selectedClientForDelete, setSelectedClientForDelete] = useState<ClientRecord | null>(null);
  const [depCheck, setDepCheck] = useState<DeleteClientCheckResult | null>(null);
  const [isCheckingDep, setIsCheckingDep] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { success, error: toastError } = useToast();
  const requestIdRef = useRef(0);

  // Check admin status on mount
  useEffect(() => {
    getCurrentUserProfileAction().then((p) => {
      if (p?.role === "admin") {
        setIsAdmin(true);
      }
    });
  }, []);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const records = await fetchClientsAction();
      if (currentReqId === requestIdRef.current) {
        if (records && records.length > 0) {
          const mapped: ClientRecord[] = records.map((r: any, idx: number) => ({
            id: r.id,
            no: idx + 1,
            companyName: r.company_name,
            salesperson: r.assigned_profile?.full_name || "Unassigned",
            servicesPurchased: r.services_purchased || "Company Registration",
            contractValue: Number(r.contract_value) || 0,
            paymentsReceived: Number(r.payments_received) || 0,
            balanceReceivable: Number(r.balance_receivable) || 0,
            nextPaymentDueAmount: Number(r.next_payment_due_amount) || 0,
            nextPaymentDueDate: r.next_payment_due_date || "-",
            paymentStatus: r.payment_status || "Upcoming",
          }));
          setDbClients(mapped);
        } else {
          setDbClients([]);
        }
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load clients. Please check your connection.");
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

  // Open delete / archive modal after running pre-flight dependency check
  const handleOpenDelete = async (client: ClientRecord) => {
    setSelectedClientForDelete(client);
    setIsCheckingDep(true);
    try {
      const check = await checkClientDependenciesAction(client.id);
      setDepCheck(check);
    } catch {
      setDepCheck(null);
    } finally {
      setIsCheckingDep(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!selectedClientForDelete) return;
    const res = await deleteClientAction(selectedClientForDelete.id);
    if (res.success) {
      success("Client Deleted", `${selectedClientForDelete.companyName} has been permanently deleted.`);
      loadData();
    } else {
      throw new Error(res.error || "Failed to delete client.");
    }
  };

  const handleArchiveClient = async () => {
    if (!selectedClientForDelete) return;
    const res = await archiveClientAction(selectedClientForDelete.id);
    if (res.success) {
      success("Client Archived", `${selectedClientForDelete.companyName} has been archived.`);
      loadData();
    } else {
      throw new Error(res.error || "Failed to archive client.");
    }
  };

  // Filter Logic
  const filteredClients = useMemo(() => {
    return dbClients.filter((client) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = client.companyName.toLowerCase().includes(query);
        const matchesSalesperson = client.salesperson.toLowerCase().includes(query);
        if (!matchesName && !matchesSalesperson) return false;
      }
      if (selectedSalesperson !== "All" && client.salesperson !== selectedSalesperson) {
        return false;
      }
      if (selectedService !== "All" && !client.servicesPurchased.includes(selectedService)) {
        return false;
      }
      if (selectedPaymentStatus !== "All" && client.paymentStatus !== selectedPaymentStatus) {
        return false;
      }
      return true;
    });
  }, [dbClients, searchQuery, selectedSalesperson, selectedService, selectedPaymentStatus]);

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredClients.slice(startIndex, startIndex + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedSalesperson("All");
    setSelectedService("All");
    setSelectedPaymentStatus("All");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <ClientsHeader />
      <ClientStatsCards
        totalClients={dbClients.length}
        activeClients={dbClients.filter((c) => c.paymentStatus !== "Paid in full").length}
        pendingFollowups={dbClients.filter((c) => c.paymentStatus === "Overdue").length}
        totalRevenue={`₹${(
          dbClients.reduce((acc, c) => acc + (c.paymentsReceived || 0), 0) / 100000
        ).toFixed(1)}L`}
      />

      <ClientFilters
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        selectedSalesperson={selectedSalesperson}
        setSelectedSalesperson={(s) => {
          setSelectedSalesperson(s);
          setCurrentPage(1);
        }}
        selectedService={selectedService}
        setSelectedService={(srv) => {
          setSelectedService(srv);
          setCurrentPage(1);
        }}
        selectedPaymentStatus={selectedPaymentStatus}
        setSelectedPaymentStatus={(st) => {
          setSelectedPaymentStatus(st);
          setCurrentPage(1);
        }}
        onReset={handleReset}
      />

      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {!errorMessage && (
        <>
          {isLoading ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#0481A2]" />
              <p className="text-xs text-slate-500 font-medium">Loading client portfolio...</p>
            </div>
          ) : (
            <ClientsTable
              clients={paginatedClients}
              isAdmin={isAdmin}
              onDeleteClient={handleOpenDelete}
            />
          )}

          {!isLoading && (
            <ClientPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {selectedClientForDelete && (
        <DeleteConfirmationModal
          isOpen={!!selectedClientForDelete}
          onClose={() => {
            setSelectedClientForDelete(null);
            setDepCheck(null);
          }}
          onConfirm={handleConfirmPermanentDelete}
          title={
            depCheck && !depCheck.canDelete
              ? "Financial Records Protected: Archive Required"
              : "Delete Client Record"
          }
          recordName={selectedClientForDelete.companyName}
          consequences={
            depCheck && !depCheck.canDelete
              ? depCheck.reason ||
                "This client has recorded invoices or payments. To preserve financial history, permanent deletion is blocked. Please archive instead."
              : "Permanently deleting this client will remove their profile and all associated non-financial records. This action is irreversible."
          }
          isArchivingOnly={depCheck ? !depCheck.canDelete : false}
          archiveOption={{
            label: "Archive Client Instead",
            onArchive: handleArchiveClient,
          }}
          requireMatchInput={depCheck ? depCheck.canDelete : false}
        />
      )}
    </div>
  );
}
