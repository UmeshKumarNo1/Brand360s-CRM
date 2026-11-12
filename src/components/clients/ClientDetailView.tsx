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

  return (
      <div className="space-y-6 font-sans">
        {/* Back button & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clients"
              className="p-2 bg-white border border-[#E2E8F0] rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold font-serif font-heading text-[#1B3260]">
                  {client.companyName}
                </h1>
                {client.tradeName && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                    Trade: {client.tradeName}
                  </span>
                )}
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    client.clientStatus === "Inactive"
                      ? "bg-slate-100 text-slate-600 border-slate-300"
                      : client.clientStatus === "On Hold"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : client.clientStatus === "Pending Onboarding"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : client.clientStatus === "Completed"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {client.clientStatus || "Active"}
                </span>
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
                {client.companyType} • Brought in by:{" "}
                <strong className="text-slate-700">{client.salesperson}</strong>
                {client.clientSince && (
                  <> • Client Since: <strong className="text-slate-700">{client.clientSince}</strong></>
                )}
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
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

            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Contract Value</span>
            <p className="text-xl font-bold text-slate-900 mt-1 font-sans font-number">
              {formatINR(client.contractValue)}
            </p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Payments Received</span>
            <p className="text-xl font-bold text-emerald-600 mt-1 font-sans font-number">
              {formatINR(client.paymentsReceived)}
            </p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Balance Receivable</span>
            <p className="text-xl font-bold text-slate-900 mt-1 font-sans font-number">
              {formatINR(client.balanceReceivable)}
            </p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">Next Due Date</span>
            <p className="text-xl font-bold text-rose-600 mt-1 font-sans font-number">
              {client.nextPaymentDueDate}
            </p>
          </div>
        </div>

        {/* Client Overview Card & Tabs */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="flex border-b border-[#E2E8F0] overflow-x-auto text-xs font-semibold text-slate-600 px-4 bg-slate-50/50">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3.5 px-4 border-b-2 transition-colors cursor-pointer ${activeTab === "overview"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent hover:text-slate-900"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`py-3.5 px-4 border-b-2 transition-colors cursor-pointer ${activeTab === "services"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent hover:text-slate-900"
                }`}
            >
              Services ({client.servicesPurchased ? client.servicesPurchased.split(",").length : 0})
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`py-3.5 px-4 border-b-2 transition-colors cursor-pointer ${activeTab === "payments"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent hover:text-slate-900"
                }`}
            >
              Payments &amp; Ledger
            </button>
            <button
              onClick={() => setActiveTab("followups")}
              className={`py-3.5 px-4 border-b-2 transition-colors cursor-pointer ${activeTab === "followups"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent hover:text-slate-900"
                }`}
            >
              Follow-ups
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${activeTab === "activity" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
                }`}
            >
              Activity & Audit History
            </button>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Contact Details */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <User size={16} className="text-[#0481A2]" />
                      <h3 className="font-serif font-heading font-bold text-sm text-[#243E76]">
                        Primary Contact
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold text-slate-800">{client.contactPerson}</span>
                      </div>
                      {client.designation && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Designation</span>
                          <span className="font-medium text-slate-800">{client.designation}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Mobile</span>
                        <span className="font-medium text-slate-800 font-number">{client.phone}</span>
                      </div>
                      {client.alternatePhone && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Alternate Number</span>
                          <span className="font-medium text-slate-800 font-number">{client.alternatePhone}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-slate-800">{client.email || "Not provided"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Company Registered Address */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Building2 size={16} className="text-[#0481A2]" />
                      <h3 className="font-serif font-heading font-bold text-sm text-[#243E76]">
                        Company &amp; Address
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Legal Name</span>
                        <span className="font-semibold text-slate-800">{client.companyName}</span>
                      </div>
                      {client.tradeName && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Trade Name</span>
                          <span className="font-medium text-slate-800">{client.tradeName}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Registered Address</span>
                        <span className="font-medium text-slate-800 text-right max-w-[240px]">
                          {client.address || "Not Provided"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">City &amp; State</span>
                        <span className="font-medium text-slate-800">
                          {[client.city, client.state, client.pincode].filter(Boolean).join(", ") || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Country</span>
                        <span className="font-medium text-slate-800">{client.country || "India"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details & Tax */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Receipt size={16} className="text-[#0481A2]" />
                      <h3 className="font-serif font-heading font-bold text-sm text-[#243E76]">
                        Billing &amp; GST Details
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Billing Name</span>
                        <span className="font-medium text-slate-800">
                          {client.billingName || client.companyName}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Billing Contact</span>
                        <span className="font-medium text-slate-800">
                          {client.billingContact || client.contactPerson}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Billing Email</span>
                        <span className="font-medium text-slate-800">
                          {client.billingEmail || client.email || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">GSTIN</span>
                        <span className="font-mono font-medium text-slate-800">
                          {client.gst || "Not GST-registered"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Billing Address</span>
                        <span className="font-medium text-slate-800 text-right max-w-[240px]">
                          {client.billingAddress || client.address || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Timeline */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <UserCheck size={16} className="text-[#0481A2]" />
                      <h3 className="font-serif font-heading font-bold text-sm text-[#243E76]">
                        Ownership &amp; Timeline
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Salesperson</span>
                        <span className="font-semibold text-slate-800">{client.salesperson}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Client Status</span>
                        <span className="font-medium text-slate-800">{client.clientStatus || "Active"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Client Since</span>
                        <span className="font-medium text-slate-800 font-number">
                          {client.clientSince || client.createdAt}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Created On</span>
                        <span className="font-medium text-slate-800 font-number">{client.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Contacts List */}
                {client.additionalContacts && client.additionalContacts.length > 0 && (
                  <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Users size={16} className="text-[#0481A2]" />
                      <h3 className="font-serif font-heading font-bold text-sm text-[#243E76]">
                        Additional Contacts ({client.additionalContacts.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {client.additionalContacts.map((c: any, i: number) => (
                        <div
                          key={c.id || i}
                          className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs text-xs"
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

                {/* Internal Notes */}
                {client.notes && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <FileText size={14} className="text-[#0481A2]" />
                      <span>Company Notes:</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">{client.notes}</p>
                  </div>
                )}
              </div>
          )}

          {activeTab === "services" && (
            <ClientServicesTab
              clientId={client.id}
              clientName={client.companyName}
              isAdmin={isAdmin}
              initialAddService={initialAddService}
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
