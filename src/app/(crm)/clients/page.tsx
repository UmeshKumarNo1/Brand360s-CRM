"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { ClientStatsCards } from "@/components/clients/ClientStatsCards";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientPagination } from "@/components/clients/ClientPagination";
import { ClientRecord, MOCK_CLIENTS } from "@/data/mockClients";
import { fetchClientsAction, fetchSalespeopleAction } from "@/app/actions/clients";
import { fetchFollowupsAction } from "@/app/actions/followups";
import {
  deleteClientAction,
  archiveClientAction,
  restoreClientAction,
  checkClientDependenciesAction,
  bulkArchiveClientsAction,
  bulkRestoreClientsAction,
  DeleteClientCheckResult,
} from "@/app/actions/client-delete";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { ReassignClientModal } from "@/components/clients/ReassignClientModal";
import { ScanDuplicatesModal } from "@/components/clients/ScanDuplicatesModal";
import { useToast } from "@/components/common/ToastProvider";
import { RefreshCw, Users, Archive, RotateCcw, Trash2, UserCheck, Layers } from "lucide-react";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function ClientsPage() {
  const router = useRouter();
  const [dbClients, setDbClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab: Active Clients vs Archived Clients
  const [clientTab, setClientTab] = useState<"active" | "archived">("active");

  // Selection state for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Deletion and Archive Modal state
  const [selectedClientForDelete, setSelectedClientForDelete] = useState<ClientRecord | null>(null);
  const [depCheck, setDepCheck] = useState<DeleteClientCheckResult | null>(null);

  // Reassignment Modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTargetClients, setReassignTargetClients] = useState<{ ids: string[]; names: string[]; currentSalesperson?: string }>({
    ids: [],
    names: [],
  });

  // Duplicate Scanner Modal state
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");
  const [selectedClientStatus, setSelectedClientStatus] = useState("All");
  const [salespeopleList, setSalespeopleList] = useState<{ id: string; full_name: string }[]>([]);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState<number>(0);

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
      const [records, spList, followups] = await Promise.all([
        fetchClientsAction(),
        fetchSalespeopleAction(),
        fetchFollowupsAction(),
      ]);

      if (currentReqId === requestIdRef.current) {
        if (spList && Array.isArray(spList)) {
          setSalespeopleList(spList.map((s: any) => ({ id: s.id, full_name: s.full_name })));
        }

        if (followups && Array.isArray(followups)) {
          const pending = followups.filter((f: any) => f.status === "Pending" && f.clientStatus !== "Archived").length;
          setPendingFollowupsCount(pending);
        }

        if (records && records.length > 0) {
          const mapped: ClientRecord[] = records.map((r: any, idx: number) => ({
            id: r.id,
            no: idx + 1,
            companyName: r.company_name,
            tradeName: r.trade_name || undefined,
            clientCode: r.client_code || undefined,
            contactPerson: r.contact_person || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            dateOfCreation: r.created_at
              ? new Date(r.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-",
            createdAt: r.created_at || "-",
            salesperson: r.assigned_profile?.full_name || "Unassigned",
            servicesPurchased: r.services_purchased || "Company Registration",
            contractValue: Number(r.contract_value) || 0,
            paymentsReceived: Number(r.payments_received) || 0,
            balanceReceivable: Number(r.balance_receivable) || 0,
            nextPaymentDueAmount: Number(r.next_payment_due_amount) || 0,
            nextPaymentDueDate: r.next_payment_due_date || "-",
            paymentStatus: r.payment_status || "Upcoming",
            clientStatus: r.client_status || "Active",
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
    try {
      const check = await checkClientDependenciesAction(client.id);
      setDepCheck(check);
    } catch {
      setDepCheck(null);
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

  const handleRestoreClient = async (client: ClientRecord) => {
    const res = await restoreClientAction(client.id);
    if (res.success) {
      success("Client Restored", `${client.companyName} has been restored to Active.`);
      loadData();
    } else {
      toastError("Failed to restore", res.error || "Server error.");
    }
  };

  // Reassign single client
  const handleOpenReassign = (client: ClientRecord) => {
    setReassignTargetClients({
      ids: [client.id],
      names: [client.companyName],
      currentSalesperson: client.salesperson,
    });
    setReassignModalOpen(true);
  };

  // Bulk Reassign selected clients
  const handleOpenBulkReassign = () => {
    if (selectedIds.length === 0) return;
    const selectedClients = dbClients.filter((c) => selectedIds.includes(c.id));
    setReassignTargetClients({
      ids: selectedIds,
      names: selectedClients.map((c) => c.companyName),
    });
    setReassignModalOpen(true);
  };

  // Bulk Archive
  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to archive ${selectedIds.length} selected client(s)?`)) return;
    const res = await bulkArchiveClientsAction(selectedIds);
    if (res.success) {
      success("Bulk Archived", `${res.archivedCount} clients have been archived.`);
      setSelectedIds([]);
      loadData();
    } else {
      toastError("Bulk Archive Failed", res.error || "Server error.");
    }
  };

  // Bulk Restore
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    const res = await bulkRestoreClientsAction(selectedIds);
    if (res.success) {
      success("Bulk Restored", `${res.restoredCount} clients restored to Active.`);
      setSelectedIds([]);
      loadData();
    } else {
      toastError("Bulk Restore Failed", res.error || "Server error.");
    }
  };

  // Distinct Services dynamically extracted from loaded clients
  const distinctServices = useMemo(() => {
    const s = new Set<string>();
    dbClients.forEach((c) => {
      if (c.servicesPurchased) {
        c.servicesPurchased.split(",").forEach((item) => {
          const trimmed = item.trim();
          if (trimmed) s.add(trimmed);
        });
      }
    });
    return Array.from(s).sort();
  }, [dbClients]);

  // Filter Logic: separate active vs archived clients
  const filteredClients = useMemo(() => {
    return dbClients.filter((client) => {
      // Tab filter
      const isArchived = client.clientStatus === "Archived";
      if (clientTab === "active" && isArchived) return false;
      if (clientTab === "archived" && !isArchived) return false;

      // Search across company, trade name, contact, phone, email, client code, salesperson
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = client.companyName?.toLowerCase().includes(query);
        const matchesTrade = client.tradeName?.toLowerCase().includes(query);
        const matchesContact = client.contactPerson?.toLowerCase().includes(query);
        const matchesEmail = client.email?.toLowerCase().includes(query);
        const matchesPhone = client.phone?.includes(query);
        const matchesCode = client.clientCode?.toLowerCase().includes(query);
        const matchesSalesperson = client.salesperson?.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesTrade &&
          !matchesContact &&
          !matchesEmail &&
          !matchesPhone &&
          !matchesCode &&
          !matchesSalesperson
        ) {
          return false;
        }
      }

      if (selectedSalesperson !== "All" && client.salesperson !== selectedSalesperson) {
        return false;
      }
      if (selectedService !== "All" && !client.servicesPurchased?.toLowerCase().includes(selectedService.toLowerCase())) {
        return false;
      }
      if (selectedPaymentStatus !== "All" && client.paymentStatus !== selectedPaymentStatus) {
        return false;
      }
      if (selectedClientStatus !== "All" && client.clientStatus !== selectedClientStatus) {
        return false;
      }
      return true;
    });
  }, [dbClients, clientTab, searchQuery, selectedSalesperson, selectedService, selectedPaymentStatus, selectedClientStatus]);

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredClients.slice(startIndex, startIndex + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Bulk selection helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = paginatedClients.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const isAllSelected =
    paginatedClients.length > 0 &&
    paginatedClients.every((c) => selectedIds.includes(c.id));

  const handleReset = () => {
    setSearchQuery("");
    setSelectedSalesperson("All");
    setSelectedService("All");
    setSelectedPaymentStatus("All");
    setSelectedClientStatus("All");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const totalNonArchived = dbClients.filter((c) => c.clientStatus !== "Archived").length;
  const activeOperationalCount = dbClients.filter((c) => c.clientStatus === "Active").length;
  const archivedCount = dbClients.filter((c) => c.clientStatus === "Archived").length;

  const totalRevenueNumber = dbClients
    .filter((c) => c.clientStatus !== "Archived")
    .reduce((acc, c) => acc + (c.paymentsReceived || 0), 0);

  const totalOutstandingNumber = dbClients
    .filter((c) => c.clientStatus !== "Archived")
    .reduce((acc, c) => acc + (c.balanceReceivable || 0), 0);

  return (
    <div className="space-y-6 w-full">
      <ClientsHeader
        isAdmin={isAdmin}
        onOpenScanDuplicates={() => setScanModalOpen(true)}
      />

      <ClientStatsCards
        totalClients={totalNonArchived}
        activeClients={activeOperationalCount}
        pendingFollowups={pendingFollowupsCount}
        totalRevenue={`₹${(totalRevenueNumber / 100000).toFixed(1)}L`}
        totalOutstanding={`₹${(totalOutstandingNumber / 100000).toFixed(1)}L`}
      />

      {/* Tabs: Active vs Archived Portfolio */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setClientTab("active");
              setCurrentPage(1);
              setSelectedIds([]);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              clientTab === "active"
                ? "bg-[#243E76] text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Active Clients ({totalNonArchived})
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setClientTab("archived");
                setCurrentPage(1);
                setSelectedIds([]);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                clientTab === "archived"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Archive size={13} />
              <span>Archived Clients ({archivedCount})</span>
            </button>
          )}
        </div>

        {/* Bulk Action Toolbar for Admin */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-[#F0F8FA] border border-[#D5EBF1] px-3 py-1.5 rounded-xl text-xs animate-in fade-in duration-150">
            <span className="font-semibold text-slate-800">
              {selectedIds.length} Selected
            </span>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              onClick={handleOpenBulkReassign}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-[#0481A2] font-semibold border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <UserCheck size={12} />
              <span>Reassign</span>
            </button>
            {clientTab === "active" ? (
              <button
                onClick={handleBulkArchive}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold border border-amber-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Archive size={12} />
                <span>Archive</span>
              </button>
            ) : (
              <button
                onClick={handleBulkRestore}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold border border-teal-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Restore</span>
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

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
        selectedClientStatus={selectedClientStatus}
        setSelectedClientStatus={(cs) => {
          setSelectedClientStatus(cs);
          setCurrentPage(1);
        }}
        salespeople={salespeopleList}
        services={distinctServices}
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
              onArchiveClient={handleOpenDelete}
              onRestoreClient={handleRestoreClient}
              onReassignClient={handleOpenReassign}
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
              ? "Financial Protection: Archive Client"
              : "Delete Client Record"
          }
          recordName={selectedClientForDelete.companyName}
          consequences={
            depCheck && !depCheck.canDelete
              ? depCheck.reason ||
                "This client has invoices or payments recorded. To preserve financial history, deletion is blocked. Please archive the client instead."
              : "Permanently deleting this client will remove their record from the CRM. This action cannot be undone."
          }
          isArchivingOnly={depCheck ? !depCheck.canDelete : false}
          archiveOption={{
            label: "Archive Client",
            onArchive: handleArchiveClient,
          }}
          requireMatchInput={depCheck ? depCheck.canDelete : false}
        />
      )}

      {/* Reassign Salesperson Modal */}
      <ReassignClientModal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onSuccess={(name) => {
          success("Reassigned Successfully", `Client(s) reassigned to ${name}.`);
          setSelectedIds([]);
          loadData();
        }}
        clientIds={reassignTargetClients.ids}
        clientNames={reassignTargetClients.names}
        currentSalespersonName={reassignTargetClients.currentSalesperson}
      />

      {/* Duplicate Scan Modal (Admin Only) */}
      {isAdmin && (
        <ScanDuplicatesModal
          isOpen={scanModalOpen}
          onClose={() => setScanModalOpen(false)}
        />
      )}
    </div>
  );
}
