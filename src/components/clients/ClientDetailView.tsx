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
}

export function ClientDetailView({ client, isAdmin, canEdit }: ClientDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "payments" | "followups" | "activity">("overview");
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

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{client.companyName}</h1>
              <PaymentStatusBadge status={client.paymentStatus as any} />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {client.clientCode}
              </span>
              {isArchived && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {client.companyType} • Assigned Salesperson:{" "}
              <strong className="text-slate-700">{client.salesperson}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Reassign Quick Action */}
          {isAdmin && (
            <button
              onClick={() => setIsReassignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Reassign Salesperson"
            >
              <UserCheck size={14} className="text-[#0481A2]" />
              <span>Reassign</span>
            </button>
          )}

          {/* Admin Restore Action (if archived) */}
          {isAdmin && isArchived && (
            <button
              onClick={handleRestoreClient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Restore Client</span>
            </button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Edit3 size={14} className="text-[#0481A2]" />
              <span>Edit Details</span>
            </Link>
          )}

          {/* Admin Delete Action */}
          {isAdmin && (
            <button
              onClick={handleOpenDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Delete or Archive Client"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}

          <Link
            href="/invoices"
            className="px-3.5 py-1.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Contract Value</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatINR(client.contractValue)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Payments Received</span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatINR(client.paymentsReceived)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Balance Receivable</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatINR(client.balanceReceivable)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Next Due Date</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{client.nextPaymentDueDate}</p>
        </div>
      </div>

      {/* Client Overview Card & Tabs */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <div className="flex border-b border-[#E2E8F0] overflow-x-auto text-xs font-semibold text-slate-600 px-4 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "services" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Services ({client.servicesPurchased ? client.servicesPurchased.split(",").length : 0})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "payments" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Payments & Ledger
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "followups" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Follow-ups
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "activity" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Activity & Audit History
          </button>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Company Details
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Legal Name:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.companyName}</span>

                  <span className="text-slate-500">Entity Type:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.companyType}</span>

                  <span className="text-slate-500">PAN Number:</span>
                  <span className="col-span-2 font-mono font-medium text-slate-800">{client.panNumber || "-"}</span>

                  <span className="text-slate-500">GSTIN:</span>
                  <span className="col-span-2 font-mono font-medium text-slate-800">{client.gstNumber || "-"}</span>

                  <span className="text-slate-500">Address:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.address || "-"}</span>

                  <span className="text-slate-500">Location:</span>
                  <span className="col-span-2 font-medium text-slate-800">
                    {[client.city, client.state, client.country].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Primary Contact & Commercials
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.contactPerson}</span>

                  <span className="text-slate-500">Phone:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.phone}</span>

                  <span className="text-slate-500">Email:</span>
                  <span className="col-span-2 font-medium text-[#0481A2]">{client.email}</span>

                  <span className="text-slate-500">Sales Lead:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.salesperson}</span>

                  <span className="text-slate-500">Services:</span>
                  <span className="col-span-2 font-medium text-slate-800">{client.servicesPurchased}</span>

                  <span className="text-slate-500">Notes:</span>
                  <span className="col-span-2 font-medium text-slate-600 italic">{client.notes || "No notes"}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "services" && (
            <ClientServicesTab
              clientId={client.id}
              clientName={client.companyName}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === "payments" && (
            <ClientPaymentsTab
              clientId={client.id}
              clientName={client.companyName}
              contractValue={client.contractValue}
              paymentsReceived={client.paymentsReceived}
              balanceReceivable={client.balanceReceivable}
            />
          )}

          {activeTab === "followups" && (
            <ClientFollowupsTab
              clientId={client.id}
              clientName={client.companyName}
            />
          )}

          {activeTab === "activity" && (
            <ClientActivityTab clientId={client.id} />
          )}
        </div>
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
