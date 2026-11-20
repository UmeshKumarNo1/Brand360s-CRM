"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { ClientStatsCards } from "@/components/clients/ClientStatsCards";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientPagination } from "@/components/clients/ClientPagination";
import { ClientRecord, ClientServiceItem, MOCK_CLIENTS } from "@/data/mockClients";
import { fetchClientsAction, fetchSalespeopleAction, fetchClientsKpiSummaryAction } from "@/app/actions/clients";
import { fetchPendingClientFollowupsAction, fetchPendingFollowupsCountAction } from "@/app/actions/followups";
import { fetchActiveServicesCountAction } from "@/app/actions/services";
import {
  deleteClientAction,
  archiveClientAction,
  restoreClientAction,
  checkClientDependenciesAction,
  voidInvoicesAndArchiveClientAction,
  bulkArchiveClientsAction,
  bulkRestoreClientsAction,
  DeleteClientCheckResult,
} from "@/app/actions/client-delete";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { ReassignClientModal } from "@/components/clients/ReassignClientModal";
import { ScanDuplicatesModal } from "@/components/clients/ScanDuplicatesModal";
import { ClientsTableSkeleton } from "@/components/clients/ClientsTableSkeleton";
import { useToast } from "@/components/common/ToastProvider";
import { RefreshCw, Users, Archive, RotateCcw, Trash2, UserCheck, Layers } from "lucide-react";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";

export default function ClientsPage() {
  const router = useRouter();
  const [dbClients, setDbClients] = useState<ClientRecord[]>(MOCK_CLIENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");
  const [selectedClientStatus, setSelectedClientStatus] = useState("All");
  const [salespeopleList, setSalespeopleList] = useState<{ id: string; full_name: string }[]>([]);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState<number>(0);
  const [activeServicesCount, setActiveServicesCount] = useState<number>(0);

  // Server stats state for instant KPI card loading
  const [kpiStats, setKpiStats] = useState({
    totalNonArchived: 0,
    activeOperationalCount: 0,
    archivedCount: 0,
    totalContractValue: 0,
    amountCollected: 0,
    totalOutstanding: 0,
  });

  // Debounce search input by 250ms to eliminate recalculations on rapid typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  // Fast independent fetch for top KPI cards & counts
  const loadKpiStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const [kpis, pendingCount, servicesCount] = await Promise.all([
        fetchClientsKpiSummaryAction(),
        fetchPendingFollowupsCountAction(),
        fetchActiveServicesCountAction(),
      ]);

      if (kpis) {
        setKpiStats(kpis);
      }
      if (typeof pendingCount === "number") {
        setPendingFollowupsCount(pendingCount);
      }
      if (typeof servicesCount === "number") {
        setActiveServicesCount(servicesCount);
      }
    } catch (e) {
      console.error("Error loading KPI summary:", e);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [records, spList, pendingFollowupsMap] = await Promise.all([
        fetchClientsAction(),
        fetchSalespeopleAction(),
        fetchPendingClientFollowupsAction(),
      ]);

      if (currentReqId === requestIdRef.current) {
        if (spList && Array.isArray(spList)) {
          setSalespeopleList(spList.map((s: any) => ({ id: s.id, full_name: s.full_name })));
        }

        if (records && records.length > 0) {
          const mapped: ClientRecord[] = records.map((r: any, idx: number) => {
            // Process services for expandable row
            const dbServices: any[] = r.services || r.client_services || [];
            let servicesList: ClientServiceItem[] = [];

            if (dbServices.length > 0) {
              servicesList = dbServices.map((s: any) => {
                const totalAmt =
                  Number(s.total_amount) ||
                  (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);
                const status = s.service_status || "Pending";
                
                // Compute true fulfillment progress from persistent stages
                const fulfillment = computeServiceFulfillment(s);
                const progress = fulfillment.progressPercentage;
                const stageText = fulfillment.currentStageName;

                return {
                  id: s.id,
                  service_name: s.service_name || "General Service",
                  service_category: s.service_category || "General",
                  service_fee: Number(s.service_fee) || 0,
                  govt_fee: Number(s.govt_fee) || 0,
                  total_amount: totalAmt,
                  service_status: status,
                  start_date: s.start_date || null,
                  expected_completion_date: s.expected_completion_date || null,
                  assigned_employee_id: s.assigned_employee_id || null,
                  assigned_employee_name: s.assigned_profile?.full_name || null,
                  stage: stageText,
                  progressPercent: progress,
                  fulfillment_stages: s.fulfillment_stages || fulfillment.stages,
                  current_stage_name: s.current_stage_name || fulfillment.currentStageName,
                  current_stage_description: s.current_stage_description || fulfillment.currentStageDescription,
                  paymentStatus: s.paymentStatus || (status === "Completed" ? "Paid" : "Unpaid"),
                  amountPaid: s.amountPaid || 0,
                };
              });
            }

            const completedCount = servicesList.filter(
              (s) => s.service_status === "Completed"
            ).length;
            const totalCount = servicesList.length;
            const avgProgress =
              totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : r.client_status === "Completed"
                  ? 100
                  : 0;

// Direct O(1) next follow-up lookup
const nextFollowup = pendingFollowupsMap
  ? pendingFollowupsMap[r.id]
  : undefined;

const nextActionTitle = nextFollowup
  ? nextFollowup.title || "Follow-up required"
  : undefined;

const nextActionDueDate = nextFollowup?.dueDate || undefined;
            return {
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
              servicesPurchased:
                servicesList.length > 0
                  ? servicesList.map((s) => s.service_name).join(", ")
                  : (r.services_purchased || "-"),
              contractValue: Number(r.contractValue ?? r.contract_value) || 0,
              invoicedAmount: Number(r.invoicedAmount) || 0,
              paymentsReceived: Number(r.paymentsReceived ?? r.payments_received) || 0,
              balanceReceivable: Number(r.balanceReceivable ?? r.balance_receivable) || 0,
              nextPaymentDueAmount: Number(r.next_payment_due_amount) || 0,
              nextPaymentDueDate: r.next_payment_due_date || "-",
              paymentStatus: r.payment_status || "Upcoming",
              clientStatus: r.client_status || "Active",
              gstin:
                r.gst_number && r.gst_number !== "Not GST-registered"
                  ? r.gst_number
                  : undefined,
              services: servicesList,
              servicesCompletedCount: completedCount,
              servicesTotalCount: totalCount,
              servicesProgressPercent: avgProgress,
              nextActionTitle,
              nextActionDueDate,
            };
          });
          setDbClients(mapped);
        } else {
          setDbClients(MOCK_CLIENTS);
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
    loadKpiStats();
    loadData();
  }, [loadKpiStats, loadData]);

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

  const handleVoidAndArchiveClient = async () => {
    if (!selectedClientForDelete) return;
    const res = await voidInvoicesAndArchiveClientAction(selectedClientForDelete.id, "Voided and archived from clients list");
    if (res.success) {
      success("Invoices Voided & Client Archived", `${selectedClientForDelete.companyName} invoices were marked as Cancelled and client was archived.`);
      loadData();
    } else {
      throw new Error(res.error || "Failed to void invoices and archive client.");
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
    const query = debouncedSearchQuery.toLowerCase().trim();
    return dbClients.filter((client) => {
      // Tab filter
      const isArchived = client.clientStatus === "Archived";
      if (clientTab === "active" && isArchived) return false;
      if (clientTab === "archived" && !isArchived) return false;

      // Search across company, trade name, contact, phone, email, client code, salesperson
      if (query !== "") {
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
  }, [dbClients, clientTab, debouncedSearchQuery, selectedSalesperson, selectedService, selectedPaymentStatus, selectedClientStatus]);

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

  // Use real-time kpiStats (fast loaded) or compute from loaded dbClients if available
  const totalNonArchived = dbClients.length > 0 
    ? dbClients.filter((c) => c.clientStatus !== "Archived").length 
    : kpiStats.totalNonArchived;
  const activeOperationalCount = dbClients.length > 0
    ? dbClients.filter((c) => c.clientStatus === "Active").length
    : kpiStats.activeOperationalCount;
  const archivedCount = dbClients.length > 0
    ? dbClients.filter((c) => c.clientStatus === "Archived").length
    : kpiStats.archivedCount;

  const totalContractValueNumber = dbClients.length > 0
    ? dbClients
        .filter((c) => c.clientStatus !== "Archived")
        .reduce((acc, c) => acc + (c.contractValue || 0), 0)
    : kpiStats.totalContractValue;

  const amountCollectedNumber = dbClients.length > 0
    ? dbClients
        .filter((c) => c.clientStatus !== "Archived")
        .reduce((acc, c) => acc + (c.paymentsReceived || 0), 0)
    : kpiStats.amountCollected;

  const totalOutstandingNumber = dbClients.length > 0
    ? dbClients
        .filter((c) => c.clientStatus !== "Archived")
        .reduce((acc, c) => acc + (c.balanceReceivable || 0), 0)
    : kpiStats.totalOutstanding;

  const formatCompactINR = (amount: number) => {
    if (amount >= 10000000) {
      const val = amount / 10000000;
      return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Cr`;
    }
    if (amount >= 100000) {
      const val = amount / 100000;
      return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}L`;
    }
    if (amount >= 1000) {
      const val = amount / 1000;
      return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6 w-full">
      <ClientsHeader
        isAdmin={isAdmin}
        onOpenScanDuplicates={() => setScanModalOpen(true)}
      />

      <ClientStatsCards
        totalClients={totalNonArchived}
        activeClients={activeOperationalCount}
        activeServices={activeServicesCount}
        totalContractValue={formatCompactINR(totalContractValueNumber)}
        amountCollected={formatCompactINR(amountCollectedNumber)}
        totalOutstanding={formatCompactINR(totalOutstandingNumber)}
        pendingFollowups={pendingFollowupsCount}
        isLoading={isStatsLoading && dbClients.length === 0}
      />

      {/* Tabs: Active vs Archived Portfolio */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setClientTab("active");
              setCurrentPage(1);
              setSelectedIds([]);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${clientTab === "active"
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${clientTab === "archived"
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
            <ClientsTableSkeleton rows={pageSize > 10 ? 10 : pageSize} />
          ) : (
            <ClientsTable
              clients={paginatedClients}
              isAdmin={isAdmin}
              onDeleteClient={handleOpenDelete}
              onArchiveClient={handleOpenDelete}
              onRestoreClient={handleRestoreClient}
              onReassignClient={handleOpenReassign}
              onRefresh={loadData}
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
              : depCheck?.reason ||
              "Permanently deleting this client will remove their record from the CRM. This action cannot be undone."
          }
          isArchivingOnly={depCheck ? !depCheck.canDelete : false}
          archiveOption={{
            label: "Archive Client",
            onArchive: handleArchiveClient,
          }}
          requireMatchInput={depCheck ? depCheck.canDelete : false}
          depCheck={depCheck}
          onVoidAndArchive={handleVoidAndArchiveClient}
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
