"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchRenewalsAction, RenewalItem } from "@/app/actions/renewals";
import { RenewalsHeader } from "@/components/renewals/RenewalsHeader";
import { RenewalStatsCards } from "@/components/renewals/RenewalStatsCards";
import { RenewalFilters } from "@/components/renewals/RenewalFilters";
import { RenewalsTable } from "@/components/renewals/RenewalsTable";
import { RenewServiceModal } from "@/components/renewals/RenewServiceModal";
import { CreateRenewalModal } from "@/components/renewals/CreateRenewalModal";
import { RenewalHistoryModal } from "@/components/renewals/RenewalHistoryModal";
import { CreateFollowupModal } from "@/components/followups/CreateFollowupModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { ClientPagination } from "@/components/clients/ClientPagination";
import { useToast } from "@/components/common/ToastProvider";

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<RenewalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error: toastError } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [salespersonFilter, setSalespersonFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [selectedRenewalForRenew, setSelectedRenewalForRenew] = useState<RenewalItem | null>(null);
  const [isCreateRenewalModalOpen, setIsCreateRenewalModalOpen] = useState(false);
  const [historyRenewal, setHistoryRenewal] = useState<RenewalItem | null>(null);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [followupClientId, setFollowupClientId] = useState<string | undefined>(undefined);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRenewalsAction();
      setRenewals(data || []);
    } catch {
      toastError("Error", "Failed to load renewals data.");
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived unique clients and services for modal creation
  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    renewals.forEach((r) => {
      if (r.clientId && r.clientName) map.set(r.clientId, r.clientName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [renewals]);

  const servicesForModal = useMemo(() => {
    return renewals.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      name: r.serviceName,
      amount: r.renewalAmount,
      expiry: r.currentExpiryDate,
    }));
  }, [renewals]);

  // Derived unique lists for dropdown filters
  const servicesList = useMemo(() => {
    return Array.from(new Set(renewals.map((r) => r.serviceName))).sort();
  }, [renewals]);

  const salespersonsList = useMemo(() => {
    return Array.from(new Set(renewals.map((r) => r.salesperson).filter((s) => s !== "Unassigned"))).sort();
  }, [renewals]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = renewals.length;
    const upcoming = renewals.filter((r) => r.status === "Upcoming").length;
    const dueSoon = renewals.filter((r) => r.status === "Due Soon").length;
    const overdue = renewals.filter((r) => r.status === "Overdue").length;

    // Check if renewed in current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const renewedThisMonth = renewals.filter((r) => {
      if (!r.lastRenewedAt) return false;
      const d = new Date(r.lastRenewedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return { total, upcoming, dueSoon, overdue, renewedThisMonth };
  }, [renewals]);

  // Filtering
  const filteredRenewals = useMemo(() => {
    return renewals.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = r.clientName.toLowerCase().includes(q);
        const matchesCode = r.clientCode.toLowerCase().includes(q);
        const matchesService = r.serviceName.toLowerCase().includes(q);
        if (!matchesClient && !matchesCode && !matchesService) return false;
      }

      // Status
      if (statusFilter !== "All" && r.status !== statusFilter) {
        return false;
      }

      // Service
      if (serviceFilter !== "All" && r.serviceName !== serviceFilter) {
        return false;
      }

      // Salesperson
      if (salespersonFilter !== "All" && r.salesperson !== salespersonFilter) {
        return false;
      }

      return true;
    });
  }, [renewals, searchQuery, statusFilter, serviceFilter, salespersonFilter]);

  // Pagination slice
  const paginatedRenewals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRenewals.slice(start, start + pageSize);
  }, [filteredRenewals, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setServiceFilter("All");
    setSalespersonFilter("All");
    setCurrentPage(1);
  };

  const handleOpenFollowup = (r: RenewalItem) => {
    setFollowupClientId(r.clientId);
    setIsFollowupModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Refresh and Create Renewal */}
      <RenewalsHeader
        onRefresh={loadData}
        isLoading={isLoading}
        onCreateRenewal={() => setIsCreateRenewalModalOpen(true)}
      />

      {/* 2. Top Summary KPI Cards */}
      <RenewalStatsCards stats={stats} />

      {/* 3. Filter Bar */}
      <RenewalFilters
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        serviceFilter={serviceFilter}
        onServiceChange={(val) => {
          setServiceFilter(val);
          setCurrentPage(1);
        }}
        salespersonFilter={salespersonFilter}
        onSalespersonChange={(val) => {
          setSalespersonFilter(val);
          setCurrentPage(1);
        }}
        servicesList={servicesList}
        salespersonsList={salespersonsList}
        onReset={handleResetFilters}
      />

      {/* 4. Renewals Table */}
      <RenewalsTable
        renewals={paginatedRenewals}
        onRenewClick={(r) => setSelectedRenewalForRenew(r)}
        onCreateFollowup={handleOpenFollowup}
        onViewHistory={(r) => setHistoryRenewal(r)}
        onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
      />

      {/* 5. Pagination */}
      {!isLoading && filteredRenewals.length > 0 && (
        <ClientPagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredRenewals.length / pageSize) || 1}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Modals */}
      <RenewServiceModal
        isOpen={!!selectedRenewalForRenew}
        renewal={selectedRenewalForRenew}
        onClose={() => setSelectedRenewalForRenew(null)}
        onSuccess={() => loadData()}
      />

      <CreateRenewalModal
        isOpen={isCreateRenewalModalOpen}
        onClose={() => setIsCreateRenewalModalOpen(false)}
        onSuccess={() => loadData()}
        clients={uniqueClients}
        services={servicesForModal}
      />

      <RenewalHistoryModal
        isOpen={!!historyRenewal}
        serviceId={historyRenewal?.id}
        serviceName={historyRenewal?.serviceName}
        clientName={historyRenewal?.clientName}
        onClose={() => setHistoryRenewal(null)}
        onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
      />

      <CreateFollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSuccess={() => loadData()}
        defaultClientId={followupClientId}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoiceId}
        invoiceId={previewInvoiceId || undefined}
        onClose={() => setPreviewInvoiceId(null)}
      />
    </div>
  );
}
