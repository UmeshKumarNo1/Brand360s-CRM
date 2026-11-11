"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ClientsHeader } from "@/components/clients/ClientsHeader";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { ClientPagination } from "@/components/clients/ClientPagination";
import { ClientRecord } from "@/data/mockClients";
import { fetchClientsAction } from "@/app/actions/clients";
import { RefreshCw } from "lucide-react";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

export default function ClientsPage() {
  const [dbClients, setDbClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const records = await fetchClientsAction();
      if (currentReqId === requestIdRef.current) {
        const mapped: ClientRecord[] = (records || []).map((r: any, idx: number) => ({
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
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setErrorMessage(err.message || "Failed to load clients portfolio.");
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

  const handleReset = () => {
    setSearchQuery("");
    setSelectedSalesperson("All");
    setSelectedService("All");
    setSelectedPaymentStatus("All");
    setCurrentPage(1);
  };

  // Multi-Filter Engine
  const filteredClients = useMemo(() => {
    return dbClients.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCompany = c.companyName.toLowerCase().includes(q);
        const matchesSales = c.salesperson.toLowerCase().includes(q);
        const matchesService = c.servicesPurchased.toLowerCase().includes(q);
        if (!matchesCompany && !matchesSales && !matchesService) return false;
      }

      if (selectedSalesperson !== "All" && c.salesperson !== selectedSalesperson) {
        return false;
      }

      if (selectedService !== "All" && !c.servicesPurchased.toLowerCase().includes(selectedService.toLowerCase())) {
        return false;
      }

      if (selectedPaymentStatus !== "All" && c.paymentStatus !== selectedPaymentStatus) {
        return false;
      }

      return true;
    });
  }, [dbClients, searchQuery, selectedSalesperson, selectedService, selectedPaymentStatus]);

  // Pagination Engine
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <ClientsHeader />
        <button
          onClick={() => loadData()}
          className="self-start sm:self-auto p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title="Refresh client list"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin text-[#077EA1]" : ""} />
        </button>
      </div>

      {/* Filter Toolbar */}
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

      {/* Error state */}
      {errorMessage && (
        <ErrorRetryState message={errorMessage} onRetry={loadData} />
      )}

      {/* Loading state or Clients Table */}
      {!errorMessage && (
        <>
          {isLoading ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#077EA1]" />
              <p className="text-xs text-slate-500 font-medium">Loading client portfolio from Supabase...</p>
            </div>
          ) : (
            <ClientsTable clients={paginatedClients} />
          )}

          {/* Pagination Controls */}
          {!isLoading && totalItems > 0 && (
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
    </div>
  );
}
