"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/clients/PaymentStatusBadge";
import { ClientPaymentsTab } from "@/components/payments/ClientPaymentsTab";
import { ClientServicesTab } from "@/components/services/ClientServicesTab";
import { ClientFollowupsTab } from "@/components/followups/ClientFollowupsTab";
import { ClientActivityTab } from "@/components/clients/ClientActivityTab";
import { ReassignClientModal } from "@/components/clients/ReassignClientModal";
import {
  deleteClientAction,
  archiveClientAction,
  restoreClientAction,
  checkClientDependenciesAction,
  DeleteClientCheckResult,
} from "@/app/actions/client-delete";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";

interface ClientDetailViewProps {
  client: any;
  isAdmin: boolean;
  canEdit: boolean;
  initialTab?: "overview" | "payments" | "services" | "followups";
  initialAddService?: boolean;
}

export function ClientDetailView({
  client,
  isAdmin,
  canEdit,
  initialTab = "overview",
  initialAddService = false,
}: ClientDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "payments" | "followups" | "activity">(initialTab);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [depCheck, setDepCheck] = useState<DeleteClientCheckResult | null>(null);

  const { success, error: toastError } = useToast();

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

  const handleRestoreClient = async () => {
    const res = await restoreClientAction(client.id);
    if (res.success) {
      success("Client Restored", `${client.companyName} has been restored to Active.`);
      router.refresh();
    } else {
      toastError("Failed to restore", res.error || "Server error.");
    }
  };

  const serviceCount = client.servicesPurchased
    ? client.servicesPurchased.split(",").filter(Boolean).length
    : 0;

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
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                {client.clientStatus || "Active"}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                {client.paymentStatus || "Upcoming"}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] font-mono">
                {client.clientCode}
              </span>
              {isArchived && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
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
            onClick={() => setActiveTab("services")}
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
              {formatINR(client.contractValue)}
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
              {formatINR(client.paymentsReceived)}
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
              {formatINR(client.balanceReceivable)}
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
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Home size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "services"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Layers size={15} />
          <span>Services ({serviceCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "payments"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <CreditCard size={15} />
          <span>Payments &amp; Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab("followups")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "followups"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Calendar size={15} />
          <span>Follow-ups</span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "activity"
              ? "bg-[#1B3260] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Activity size={15} />
          <span>Activity &amp; Audit History</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#DCFCE7] text-[#16A34A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      {client.clientStatus || "Active"}
                    </span>
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

        {activeTab === "services" && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
            <ClientServicesTab
              clientId={client.id}
              clientName={client.companyName}
              isAdmin={isAdmin}
              initialAddService={initialAddService}
            />
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
    </div>
  );
}
