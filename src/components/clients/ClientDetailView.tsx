"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Phone, Mail, FileText, Globe, MapPin, User, Calendar, CreditCard, Edit3, Layers, CheckSquare } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/clients/PaymentStatusBadge";
import { ClientPaymentsTab } from "@/components/payments/ClientPaymentsTab";
import { ClientServicesTab } from "@/components/services/ClientServicesTab";
import { ClientFollowupsTab } from "@/components/followups/ClientFollowupsTab";

interface ClientDetailViewProps {
  client: any;
  isAdmin: boolean;
  canEdit: boolean;
}

export function ClientDetailView({ client, isAdmin, canEdit }: ClientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "services" | "followups">("overview");

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
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {client.companyType} • Assigned Salesperson: <strong className="text-slate-700">{client.salesperson}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <p className="text-xl font-bold text-slate-900 mt-1 font-sans font-number">{formatINR(client.contractValue)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Payments Received</span>
          <p className="text-xl font-bold text-emerald-600 mt-1 font-sans font-number">{formatINR(client.paymentsReceived)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Balance Receivable</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-sans font-number">{formatINR(client.balanceReceivable)}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Next Due Date</span>
          <p className="text-xl font-bold text-rose-600 mt-1 font-sans">{client.nextPaymentDueDate}</p>
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
            Services & Billing
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "payments" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Payments & Installments
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === "followups" ? "border-[#0481A2] text-[#0481A2]" : "border-transparent hover:text-slate-900"
            }`}
          >
            Follow-ups
          </button>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b">
                    Contact Information
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-700">
                      <User size={15} className="text-[#0481A2] shrink-0" />
                      <span className="font-semibold text-slate-900">{client.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <Phone size={15} className="text-[#0481A2] shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <Mail size={15} className="text-[#0481A2] shrink-0" />
                      <span>{client.email}</span>
                    </div>
                    {client.city && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <MapPin size={15} className="text-[#0481A2] shrink-0" />
                        <span>{client.city}, {client.state}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tax & Identifiers */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b">
                    Commercial & Tax Identifiers
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">GSTIN</span>
                      <span className="font-mono font-medium text-slate-800">{client.gst || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">PAN</span>
                      <span className="font-mono font-medium text-slate-800">{client.pan || "Not Provided"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Onboarding Date</span>
                      <span className="text-slate-800">{client.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {client.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-800 block">Internal Notes:</span>
                  <p className="text-slate-600 leading-relaxed">{client.notes}</p>
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}
