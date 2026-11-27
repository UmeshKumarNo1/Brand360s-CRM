"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  FileText,
  Globe,
  MapPin,
  User,
  Users,
  Calendar,
  CreditCard,
  Edit3,
  Layers,
  CheckSquare,
  Trash2,
  Archive,
  RotateCcw,
  UserCheck,
  History,
  Receipt,
  ShieldCheck,
  Plus,
  Home,
  Wallet,
  Scale,
  MoreHorizontal,
  Flag,
  Hash,
  Zap,
  Clock,
  Briefcase,
  PhoneCall,
  Link2,
  FileCheck,
  Activity,
  RefreshCw,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/clients/PaymentStatusBadge";
import { ClientPaymentsTab } from "@/components/payments/ClientPaymentsTab";
import { ClientServicesTab } from "@/components/services/ClientServicesTab";
import { ClientFollowupsTab } from "@/components/followups/ClientFollowupsTab";
import { ClientActivityTab } from "@/components/clients/ClientActivityTab";
import { ReassignClientModal } from "@/components/clients/ReassignClientModal";
import { ClientDetailedServiceCard } from "@/components/clients/ClientDetailedServiceCard";
import {
  fetchClientDetailedServicesAction,
  DetailedServiceData,
} from "@/app/actions/client-detailed-services";
import { AssignServiceModal } from "@/components/services/AssignServiceModal";
import { UploadServiceDeliverableModal } from "@/components/services/UploadServiceDeliverableModal";
import { ServiceDocumentsModal } from "@/components/services/ServiceDocumentsModal";
import { ServiceStageModal } from "@/components/services/ServiceStageModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { ServiceFinancialHistoryModal } from "@/components/services/ServiceFinancialHistoryModal";
import { ServiceActivityHistoryModal } from "@/components/services/ServiceActivityHistoryModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import {
  deleteClientAction,
  archiveClientAction,
  restoreClientAction,
  checkClientDependenciesAction,
  voidInvoicesAndArchiveClientAction,
  DeleteClientCheckResult,
} from "@/app/actions/client-delete";
import {
  deleteClientServiceAction,
  checkServiceDeletionEligibilityAction,
  ServiceDeletionEligibility,
} from "@/app/actions/services";
import { DeleteServiceModal } from "@/components/services/DeleteServiceModal";
import { EditServiceModal } from "@/components/services/EditServiceModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { ErrorRetryState } from "@/components/common/ErrorRetryState";

interface ClientDetailViewProps {
  client: any;
  isAdmin: boolean;
  canEdit: boolean;
  initialTab?: "overview" | "payments" | "services" | "followups" | "activity";
  initialAddService?: boolean;
  initialServiceId?: string | null;
}

export function ClientDetailView({
  client,
  isAdmin,
  canEdit,
  initialTab = "services",
  initialAddService = false,
  initialServiceId = null,
}: ClientDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"services" | "overview" | "payments" | "followups" | "activity">(
    initialTab === "services" || initialTab === "overview" ? "services" : initialTab
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(initialServiceId);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(initialServiceId);
  const hasScrolledToServiceRef = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [depCheck, setDepCheck] = useState<DeleteClientCheckResult | null>(null);

  // Detailed Services State
  const [detailedServices, setDetailedServices] = useState<DetailedServiceData[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(Boolean(initialAddService));
  const [deliverableModalService, setDeliverableModalService] = useState<any | null>(null);
  const [documentsModalService, setDocumentsModalService] = useState<any | null>(null);
  const [stageModalServiceId, setStageModalServiceId] = useState<string | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<DetailedServiceData | null>(null);
  const [financialHistoryService, setFinancialHistoryService] = useState<DetailedServiceData | null>(null);
  const [activityHistoryService, setActivityHistoryService] = useState<DetailedServiceData | null>(null);
  const [createInvoiceService, setCreateInvoiceService] = useState<DetailedServiceData | null>(null);

  // Service Deletion State
  const [serviceToDelete, setServiceToDelete] = useState<DetailedServiceData | null>(null);
  const [serviceEligibility, setServiceEligibility] = useState<ServiceDeletionEligibility | null>(null);
  const [isLoadingServiceCheck, setIsLoadingServiceCheck] = useState(false);

  const { success, error: toastError } = useToast();
  const reqIdRef = useRef(0);

  const loadDetailedServices = useCallback(async (silent = false) => {
    const curId = ++reqIdRef.current;
    if (!silent) setIsLoadingServices(true);
    setServicesError(null);

    try {
      const data = await fetchClientDetailedServicesAction(client.id);
      if (curId === reqIdRef.current) {
        setDetailedServices(data || []);
      }
    } catch (err: any) {
      if (curId === reqIdRef.current) {
        setServicesError(err.message || "Failed to load detailed services.");
      }
    } finally {
      if (curId === reqIdRef.current && !silent) {
        setIsLoadingServices(false);
      }
    }
  }, [client.id]);

  useEffect(() => {
    loadDetailedServices();
  }, [loadDetailedServices]);

  // Sync initialServiceId or search params when prop changes
  useEffect(() => {
    if (initialServiceId) {
      setSelectedServiceId(initialServiceId);
      setHighlightedServiceId(initialServiceId);
    }
  }, [initialServiceId]);

  // Auto-scroll to selected service once services are loaded and rendered (only once per selectedServiceId)
  useEffect(() => {
    if (!selectedServiceId || isLoadingServices) return;

    // Check if target service exists in detailedServices
    const serviceExists = detailedServices.some((s) => s.id === selectedServiceId);
    if (!serviceExists) return;

    // Ensure we are on the services tab
    if (activeTab !== "services") {
      setActiveTab("services");
    }

    const timer = setTimeout(() => {
      const el = document.getElementById(`service-${selectedServiceId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);

    const highlightTimer = setTimeout(() => {
      setHighlightedServiceId(null);
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(highlightTimer);
    };
  }, [selectedServiceId, isLoadingServices, detailedServices, activeTab]);

  const handleTabChange = useCallback(
    (tab: "services" | "overview" | "payments" | "followups" | "activity") => {
      setActiveTab(tab);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        if (tab !== "services") {
          url.searchParams.delete("serviceId");
          setSelectedServiceId(null);
        }
        window.history.replaceState(null, "", url.toString());
      }
    },
    []
  );

  const isArchived = client.clientStatus === "Archived";

  const handleOpenDelete = async () => {
    setIsDeleteModalOpen(true);
    try {
      const check = await checkClientDependenciesAction(client.id);
      setDepCheck(check);
    } catch {
      setDepCheck(null);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    const res = await deleteClientAction(client.id);
    if (res.success) {
      success("Client Deleted", `${client.companyName} has been permanently deleted.`);
      router.push("/clients");
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to delete client.");
    }
  };

  const handleArchiveClient = async () => {
    const res = await archiveClientAction(client.id);
    if (res.success) {
      success("Client Archived", `${client.companyName} has been archived.`);
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to archive client.");
    }
  };

  const handleVoidAndArchiveClient = async () => {
    const res = await voidInvoicesAndArchiveClientAction(client.id, "Voided and archived from client details view");
    if (res.success) {
      success("Invoices Voided & Client Archived", `${client.companyName} invoices were marked as Cancelled and the client was archived.`);
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to void invoices and archive client.");
    }
  };

  const handleRestoreClient = async () => {
    const res = await restoreClientAction(client.id);
    if (res.success) {
      success("Client Restored", `${client.companyName} has been restored to Active.`);
      router.refresh();
    } else {
      toastError("Failed to restore", res.error || "Server error.");
    }
  };

  const handleOpenDeleteService = async (svc: DetailedServiceData) => {
    setServiceToDelete(svc);
    setIsLoadingServiceCheck(true);
    setServiceEligibility(null);
    try {
      const eligibility = await checkServiceDeletionEligibilityAction(svc.id);
      setServiceEligibility(eligibility);
    } catch (err: any) {
      toastError("Eligibility Check Failed", err.message || "Failed to audit service.");
    } finally {
      setIsLoadingServiceCheck(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    const res = await deleteClientServiceAction(serviceToDelete.id);
    if (res.success) {
      success("Service Deleted", `Service "${serviceToDelete.serviceName}" has been permanently deleted.`);
      setServiceToDelete(null);
      setServiceEligibility(null);
      loadDetailedServices();
      router.refresh();
    } else {
      throw new Error(res.error || "Failed to delete service.");
    }
  };

  const serviceCount = client.servicesPurchased
    ? client.servicesPurchased.split(",").filter(Boolean).length
    : 0;

  // Aggregated Header Metrics for Services Stack
  // Single source of truth:
  // - Contract Value = Sum of active service contract values
  // - Invoiced = Sum of issued invoices across services
  // - Collected = Verified payments collected
  // - Invoice Outstanding = Sum of unpaid balance_due of issued invoices (or Invoiced - Collected)
  // - Contract Receivable = Math.max(0, Contract Value - Collected)
  const totalContract = detailedServices.reduce((sum, s) => sum + (Number(s.contractValue) || 0), 0);
  const totalInvoiced = detailedServices.reduce((sum, s) => sum + (Number(s.invoicedAmount) || 0), 0);
  const totalCollected = detailedServices.reduce((sum, s) => sum + (Number(s.collectedAmount) || 0), 0);
  const totalOutstanding = detailedServices.reduce((sum, s) => sum + (Number(s.outstandingAmount) || 0), 0);
  const contractBalance = Math.max(0, totalContract - totalCollected);

  return (
    <div className="relative space-y-6 font-sans">
      {/* Ambient background atmosphere matching reference */}
      <div className="absolute -top-10 -right-8 w-96 h-96 bg-gradient-to-br from-sky-100/40 via-teal-50/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-sans text-slate-900 tracking-tight">
                {client.companyName}
              </h1>
              {client.clientStatus === "Completed" ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Pending
                </span>
              )}
              {isArchived && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {client.clientCode ? `${client.clientCode} • ` : ""}
              {client.companyType} • Brought in by:{" "}
              <strong className="text-slate-800 font-semibold">{client.salesperson}</strong>
              {client.clientSince && (
                <> • Client Since: <strong className="text-slate-800 font-semibold">{client.clientSince}</strong></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Reassign Quick Action */}
          {isAdmin && (
            <button
              onClick={() => setIsReassignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Reassign Salesperson"
            >
              <UserCheck size={14} className="text-slate-600" />
              <span>Reassign</span>
            </button>
          )}

          {/* Admin Restore Action (if archived) */}
          {isAdmin && isArchived && (
            <button
              onClick={handleRestoreClient}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Restore Client</span>
            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Edit3 size={14} className="text-slate-600" />
              <span>Edit Details</span>
            </Link>
          )}

          {/* Admin Delete Action */}
          {isAdmin && (
            <button
              onClick={handleOpenDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Delete or Archive Client"
            >
              <Trash2 size={14} className="text-[#DC2626]" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleTabChange("services");
              setIsAddServiceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Contract Value */}
        <div className="bg-gradient-to-r from-white via-white to-[#E0F2FE]/40 border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Contract Value</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 font-sans font-number">
              {formatINR(totalContract > 0 ? totalContract : client.contractValue)}
            </p>
          </div>
          {/* Decorative double waves */}
          <svg
            className="absolute -right-2 -bottom-2 w-32 h-24 text-[#BAE6FD]/40 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M0,80 C30,40 70,80 120,30 L120,80 Z" />
          </svg>
          <svg
            className="absolute right-0 -bottom-3 w-28 h-20 text-[#0284C7]/15 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M20,80 C50,50 80,75 120,45 L120,80 Z" />
          </svg>
        </div>

        {/* 2. Payments Received */}
        <div className="bg-gradient-to-r from-white via-white to-[#DCFCE7]/40 border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Payments Received</span>
            <p className="text-2xl font-bold text-[#16A34A] mt-0.5 font-sans font-number">
              {formatINR(totalCollected > 0 ? totalCollected : client.paymentsReceived)}
            </p>
          </div>
          <svg
            className="absolute -right-2 -bottom-2 w-32 h-24 text-[#BBF7D0]/40 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M0,80 C30,40 70,80 120,30 L120,80 Z" />
          </svg>
          <svg
            className="absolute right-0 -bottom-3 w-28 h-20 text-[#16A34A]/15 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M20,80 C50,50 80,75 120,45 L120,80 Z" />
          </svg>
        </div>

        {/* 3. Balance Receivable */}
        <div className="bg-gradient-to-r from-white via-white to-[#DBEAFE]/40 border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
            <Scale size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Balance Receivable</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 font-sans font-number">
              {formatINR(detailedServices.length > 0 ? totalOutstanding : client.balanceReceivable)}
            </p>
          </div>
          <svg
            className="absolute -right-2 -bottom-2 w-32 h-24 text-[#BFDBFE]/40 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M0,80 C30,40 70,80 120,30 L120,80 Z" />
          </svg>
          <svg
            className="absolute right-0 -bottom-3 w-28 h-20 text-[#2563EB]/15 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M20,80 C50,50 80,75 120,45 L120,80 Z" />
          </svg>
        </div>

        {/* 4. Next Due Date */}
        <div className="bg-gradient-to-r from-white via-white to-[#F3E8FF]/40 border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Next Due Date</span>
            <p className="text-2xl font-bold text-[#EF4444] mt-0.5 font-sans font-number">
              {client.nextPaymentDueDate && client.nextPaymentDueDate !== "-" ? client.nextPaymentDueDate : "—"}
            </p>
          </div>
          <svg
            className="absolute -right-2 -bottom-2 w-32 h-24 text-[#E9D5FF]/40 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M0,80 C30,40 70,80 120,30 L120,80 Z" />
          </svg>
          <svg
            className="absolute right-0 -bottom-3 w-28 h-20 text-[#9333EA]/15 pointer-events-none"
            viewBox="0 0 120 80"
            fill="currentColor"
          >
            <path d="M20,80 C50,50 80,75 120,45 L120,80 Z" />
          </svg>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xs overflow-x-auto">
        <button
          onClick={() => handleTabChange("services")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "services"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          <Layers size={15} />
          <span>Services ({detailedServices.length})</span>
        </button>

        <button
          onClick={() => handleTabChange("overview")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "overview"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          <Home size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => handleTabChange("payments")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "payments"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          <CreditCard size={15} />
          <span>Payments &amp; Invoices</span>
        </button>

        <button
          onClick={() => handleTabChange("followups")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "followups"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          <Calendar size={15} />
          <span>Follow-ups</span>
        </button>

        <button
          onClick={() => handleTabChange("activity")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "activity"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
        >
          <Activity size={15} />
          <span>Activity &amp; Audit History</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-1">
        {activeTab === "services" && (
          <div className="space-y-6 pt-1">
            {/* Header Bar matching Reference Image 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Client Services ({detailedServices.length})
                </h2>
                {/* View Switcher: Cards vs Table */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Detailed Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Expanded Table
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50/90 px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Contract:</span>
                  <strong className="text-slate-900 font-sans font-number font-semibold">
                    {formatINR(totalContract || client.contractValue)}
                  </strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Invoiced:</span>
                  <strong className="text-slate-900 font-sans font-number font-semibold">
                    {formatINR(totalInvoiced || client.contractValue)}
                  </strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Collected:</span>
                  <strong className="text-emerald-700 font-sans font-number font-bold">
                    {formatINR(totalCollected || client.paymentsReceived)}
                  </strong>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Outstanding:</span>
                  <strong className="text-rose-600 font-sans font-number font-bold">
                    {formatINR(totalOutstanding || client.balanceReceivable)}
                  </strong>
                </div>

                <div className="pl-2 flex items-center gap-1.5 border-l border-slate-200 ml-1">
                  <button
                    onClick={() => loadDetailedServices()}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition-colors cursor-pointer"
                    title="Refresh services"
                  >
                    <RefreshCw size={12} className={isLoadingServices ? "animate-spin text-[#0481A2]" : ""} />
                  </button>
                </div>
              </div>
            </div>

            {/* Stack of Individual Service Detailed Cards or Expanded Table */}
            {servicesError && (
              <ErrorRetryState message={servicesError} onRetry={() => loadDetailedServices()} />
            )}

            {!servicesError && (
              <div>
                {isLoadingServices ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#0481A2]" />
                      <span className="text-xs font-medium">Loading individual client services...</span>
                    </div>
                  </div>
                ) : detailedServices.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0481A2] flex items-center justify-center mx-auto">
                      <Layers size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">No Services Purchased Yet</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Assign a service deliverable to track milestones, invoices, and payment collections.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddServiceModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Assign First Service</span>
                    </button>
                  </div>
                ) : viewMode === "table" ? (
                  <ClientServicesTab
                    clientId={client.id}
                    clientName={client.companyName}
                    isAdmin={isAdmin}
                    canEdit={canEdit}
                  />
                ) : (
                  <div className="space-y-5">
                    {detailedServices.map((service, idx) => (
                      <ClientDetailedServiceCard
                        key={service.id}
                        service={service}
                        index={idx}
                        totalServices={detailedServices.length}
                        defaultExpanded={true}
                        isSelected={highlightedServiceId === service.id}
                        canEdit={canEdit}
                        isAdmin={isAdmin}
                        onRefresh={() => loadDetailedServices(true)}
                        onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
                        onAddDocument={(svcId) => {
                          const match = detailedServices.find((s) => s.id === svcId);
                          setDeliverableModalService(match || service);
                        }}
                        onManageService={(svc) => {
                          setDocumentsModalService(svc);
                        }}
                        onManageStage={(svcId) => {
                          setStageModalServiceId(svcId);
                        }}
                        onEditService={(svc) => {
                          setEditingService(svc);
                        }}
                        onDeleteService={(svc) => {
                          handleOpenDeleteService(svc);
                        }}
                        onCreateInvoice={(svc) => {
                          setCreateInvoiceService(svc);
                        }}
                        onViewAllInvoices={(svc) => {
                          setFinancialHistoryService(svc);
                        }}
                        onViewFullActivity={(svc) => {
                          setActivityHistoryService(svc);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Primary Contact Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User size={18} className="text-[#0481A2]" />
                    <h3 className="font-bold text-sm text-slate-900 font-sans">
                      Primary Contact
                    </h3>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <User size={15} className="text-slate-500" />
                      <span>Name</span>
                    </div>
                    <span className="font-medium text-slate-900">{client.contactPerson}</span>
                  </div>

                  {client.designation && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                        <Briefcase size={15} className="text-slate-500" />
                        <span>Designation</span>
                      </div>
                      <span className="font-medium text-slate-800">{client.designation}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Phone size={15} className="text-slate-500" />
                      <span>Mobile</span>
                    </div>
                    <span className="font-medium text-slate-900 font-number">{client.phone}</span>
                  </div>

                  {client.alternatePhone && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                        <PhoneCall size={15} className="text-slate-500" />
                        <span>Alternate Mobile</span>
                      </div>
                      <span className="font-medium text-slate-800 font-number">{client.alternatePhone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Mail size={15} className="text-slate-500" />
                      <span>Email</span>
                    </div>
                    <span className="font-medium text-slate-900">{client.email || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* 2. Company & Address Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 size={18} className="text-[#0481A2]" />
                    <h3 className="font-bold text-sm text-slate-900 font-sans">
                      Company &amp; Address
                    </h3>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <FileText size={15} className="text-slate-500" />
                      <span>Legal Name</span>
                    </div>
                    <span className="font-medium text-slate-900">{client.companyName}</span>
                  </div>

                  {client.tradeName && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                        <FileText size={15} className="text-slate-500" />
                        <span>Trade Name</span>
                      </div>
                      <span className="font-medium text-slate-800">{client.tradeName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <CreditCard size={15} className="text-slate-500" />
                      <span>Registered Address</span>
                    </div>
                    <span className="font-medium text-slate-900 text-right max-w-[260px] truncate">
                      {client.address || "Not Provided"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <MapPin size={15} className="text-slate-500" />
                      <span>City &amp; State</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {[client.city, client.state, client.pincode].filter(Boolean).join(", ") || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Flag size={15} className="text-slate-500" />
                      <span>Country</span>
                    </div>
                    <span className="font-medium text-slate-900">{client.country || "India"}</span>
                  </div>
                </div>
              </div>

              {/* 3. Billing & GST Details Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Receipt size={18} className="text-[#0481A2]" />
                    <h3 className="font-bold text-sm text-slate-900 font-sans">
                      Billing &amp; GST Details
                    </h3>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <User size={15} className="text-slate-500" />
                      <span>Billing Name</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {client.billingName || client.companyName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <User size={15} className="text-slate-500" />
                      <span>Billing Contact</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {client.billingContact || client.contactPerson}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Mail size={15} className="text-slate-500" />
                      <span>Billing Email</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {client.billingEmail || client.email || "Not provided"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Hash size={15} className="text-slate-500" />
                      <span>GSTIN</span>
                    </div>
                    {client.gst ? (
                      <span className="font-mono font-medium text-slate-900">{client.gst}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#D97706]">
                        Not GST-registered
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <MapPin size={15} className="text-slate-500" />
                      <span>Billing Address</span>
                    </div>
                    <span className="font-medium text-slate-900 text-right max-w-[260px] truncate">
                      {client.billingAddress || client.address || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Ownership & Timeline Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Link2 size={18} className="text-[#0481A2]" />
                    <h3 className="font-bold text-sm text-slate-900 font-sans">
                      Ownership &amp; Timeline
                    </h3>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <User size={15} className="text-slate-500" />
                      <span>Salesperson</span>
                    </div>
                    <span className="font-medium text-slate-900">{client.salesperson}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Zap size={15} className="text-slate-500" />
                      <span>Client Status</span>
                    </div>
                    {client.clientStatus === "Completed" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#DCFCE7] text-[#16A34A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0481A2]" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Calendar size={15} className="text-slate-500" />
                      <span>Client Since</span>
                    </div>
                    <span className="font-medium text-slate-900 font-number">
                      {client.clientSince || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500 font-normal">
                      <Calendar size={15} className="text-slate-500" />
                      <span>Created On</span>
                    </div>
                    <span className="font-medium text-slate-900 font-number">
                      {client.createdAt}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Contacts List (if present) */}
            {client.additionalContacts && client.additionalContacts.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Users size={18} className="text-[#0481A2]" />
                  <h3 className="font-bold text-sm text-slate-900 font-sans">
                    Additional Contacts ({client.additionalContacts.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {client.additionalContacts.map((c: any, i: number) => (
                    <div
                      key={c.id || i}
                      className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1 shadow-2xs text-xs"
                    >
                      <div className="font-semibold text-slate-900">{c.name || "Unnamed"}</div>
                      {c.designation && (
                        <div className="text-slate-500 text-[11px]">{c.designation}</div>
                      )}
                      {c.phone && (
                        <div className="text-slate-700 font-number pt-1">📞 {c.phone}</div>
                      )}
                      {c.email && (
                        <div className="text-slate-700 truncate">✉️ {c.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Notes (if present) */}
            {client.notes && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <FileText size={16} className="text-[#0481A2]" />
                  <span>Company Notes:</span>
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line pl-6">{client.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
            <ClientPaymentsTab
              clientId={client.id}
              clientName={client.companyName}
              contractValue={client.contractValue}
              paymentsReceived={client.paymentsReceived}
              balanceReceivable={client.balanceReceivable}
            />
          </div>
        )}

        {activeTab === "followups" && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
            <ClientFollowupsTab
              clientId={client.id}
              clientName={client.companyName}
            />
          </div>
        )}

        {activeTab === "activity" && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
            <ClientActivityTab clientId={client.id} />
          </div>
        )}
      </div>

      {/* Assign Service Modal */}
      {isAddServiceModalOpen && (
        <AssignServiceModal
          isOpen={isAddServiceModalOpen}
          onClose={() => setIsAddServiceModalOpen(false)}
          onSuccess={() => {
            loadDetailedServices();
            router.refresh();
          }}
          clientId={client.id}
          clientName={client.companyName}
        />
      )}

      {/* Upload Deliverable Modal */}
      {deliverableModalService && (
        <UploadServiceDeliverableModal
          isOpen={Boolean(deliverableModalService)}
          onClose={() => setDeliverableModalService(null)}
          onSuccess={() => {
            loadDetailedServices();
          }}
          clientId={client.id}
          clientServiceId={deliverableModalService.id}
          serviceName={deliverableModalService.serviceName}
          clientName={client.companyName}
        />
      )}

      {/* Service Documents Modal */}
      {documentsModalService && (
        <ServiceDocumentsModal
          isOpen={Boolean(documentsModalService)}
          onClose={() => setDocumentsModalService(null)}
          onRefreshParent={() => loadDetailedServices()}
          clientId={client.id}
          clientServiceId={documentsModalService.id}
          serviceName={documentsModalService.serviceName}
          clientName={client.companyName}
          serviceStatus={documentsModalService.serviceStatus}
        />
      )}

      {/* Invoice Preview Modal */}
      {previewInvoiceId && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoiceId)}
          onClose={() => setPreviewInvoiceId(null)}
          invoiceId={previewInvoiceId}
        />
      )}

      {/* Delete / Archive Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDepCheck(null);
          }}
          onConfirm={handleConfirmPermanentDelete}
          title={
            depCheck && !depCheck.canDelete
              ? "Financial Protection: Archive Client"
              : "Delete Client Record"
          }
          recordName={client.companyName}
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
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        onSuccess={(name) => {
          success("Reassigned Successfully", `${client.companyName} reassigned to ${name}.`);
          router.refresh();
        }}
        clientIds={[client.id]}
        clientNames={[client.companyName]}
        currentSalespersonName={client.salesperson}
      />

      {/* Service Fulfillment Stage Management Modal */}
      <ServiceStageModal
        isOpen={Boolean(stageModalServiceId)}
        onClose={() => setStageModalServiceId(null)}
        serviceId={stageModalServiceId}
        onSuccess={() => {
          loadDetailedServices(true);
          router.refresh();
        }}
      />

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          isOpen={Boolean(editingService)}
          onClose={() => setEditingService(null)}
          service={editingService}
          onSuccess={() => {
            setEditingService(null);
            loadDetailedServices(true);
            router.refresh();
          }}
        />
      )}

      {/* Service Deletion Modal */}
      {serviceToDelete && (
        <DeleteServiceModal
          isOpen={Boolean(serviceToDelete)}
          onClose={() => {
            setServiceToDelete(null);
            setServiceEligibility(null);
          }}
          onConfirm={handleConfirmDeleteService}
          serviceName={serviceToDelete.serviceName}
          eligibility={serviceEligibility}
          isLoadingCheck={isLoadingServiceCheck}
        />
      )}

      {/* Service Financial / Invoices Modal */}
      {financialHistoryService && (
        <ServiceFinancialHistoryModal
          isOpen={Boolean(financialHistoryService)}
          onClose={() => setFinancialHistoryService(null)}
          serviceName={financialHistoryService.serviceName}
          clientName={client.companyName}
          invoices={financialHistoryService.invoices}
          payments={financialHistoryService.payments}
          onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
        />
      )}

      {/* Service Activity Modal */}
      {activityHistoryService && (
        <ServiceActivityHistoryModal
          isOpen={Boolean(activityHistoryService)}
          onClose={() => setActivityHistoryService(null)}
          serviceName={activityHistoryService.serviceName}
          clientName={client.companyName}
          activities={activityHistoryService.activities}
        />
      )}

      {/* Create Invoice for Service Modal */}
      {createInvoiceService && (
        <CreateInvoiceModal
          isOpen={Boolean(createInvoiceService)}
          onClose={() => setCreateInvoiceService(null)}
          defaultClientId={createInvoiceService.clientId}
          defaultClientName={client.companyName}
          defaultServiceId={createInvoiceService.id}
          defaultDescription={`${createInvoiceService.serviceName} - Professional Deliverable`}
          defaultAmount={createInvoiceService.contractValue}
          onSuccess={() => {
            setCreateInvoiceService(null);
            loadDetailedServices(true);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
