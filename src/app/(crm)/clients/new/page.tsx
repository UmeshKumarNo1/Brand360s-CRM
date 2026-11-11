"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Building,
  Phone as PhoneIcon,
  Layers,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { createClientAction, fetchSalespeopleAction } from "@/app/actions/clients";
import { PhoneInput } from "@/components/clients/PhoneInput";

interface SalespersonOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active?: boolean;
}

export default function NewClientPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createClientAction, null);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("");

  useEffect(() => {
    fetchSalespeopleAction().then((data) => {
      setSalespeople(data || []);
      if (data && data.length > 0) {
        setSelectedSalesperson(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (state?.success && state?.clientId) {
      router.push(`/clients/${state.clientId}`);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Add New Client</h1>
            <p className="text-xs text-slate-500">
              Onboard client, company details, services, and billing schedules
            </p>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2 shadow-2xs">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Multi-Section Form */}
      <form action={formAction} className="space-y-6">
        {/* Section 1: Company Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Building size={16} className="text-[#0481A2]" />
            <h3>Company Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                name="company_name"
                required
                type="text"
                placeholder="e.g. Acme Innovations Pvt Ltd"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.company_name ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.company_name && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.company_name}</p>
              )}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Type</label>
              <select
                name="company_type"
                defaultValue="Private Limited (Pvt Ltd)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Public Limited">Public Limited</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">CIN / PAN</label>
              <input
                name="pan_number"
                type="text"
                placeholder="ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
              <input
                name="gst_number"
                type="text"
                placeholder="29AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Registered Address</label>
              <input
                name="address"
                type="text"
                placeholder="Street address, Office no, Building"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <input
                name="city"
                type="text"
                placeholder="Mumbai / Bangalore"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State</label>
              <input
                name="state"
                type="text"
                placeholder="Maharashtra / Karnataka"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <PhoneIcon size={16} className="text-[#0481A2]" />
            <h3>Primary Contact Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person *</label>
              <input
                name="contact_person"
                required
                type="text"
                placeholder="e.g. Rahul Sharma"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.contact_person ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.contact_person && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.contact_person}</p>
              )}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email *</label>
              <input
                name="email"
                required
                type="email"
                placeholder="contact@example.com"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.email ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.email && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.email}</p>
              )}
            </div>

            {/* International Phone Input for Primary Phone */}
            <div>
              <PhoneInput
                label="Primary Phone"
                name="phone"
                required
                defaultValue=""
                error={state?.fieldErrors?.phone}
              />
            </div>

            {/* International Phone Input for Alternate Phone */}
            <div>
              <PhoneInput
                label="Alternate Phone"
                name="alternate_phone"
                required={false}
                defaultValue=""
                error={state?.fieldErrors?.alternate_phone}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Services & Financials */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Layers size={16} className="text-[#0481A2]" />
            <h3>Services & Commercial Terms</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Services Purchased *</label>
              <input
                name="services_purchased"
                required
                type="text"
                defaultValue="Annual Compliance, Website"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Assigned Salesperson</label>
              <select
                name="assigned_salesperson"
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
              >
                {salespeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role === "admin" ? "Admin" : "Sales"})
                  </option>
                ))}
                {salespeople.length === 0 && <option value="">Auto-assign Current User</option>}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Contract Value (₹) *</label>
              <input
                name="contract_value"
                required
                type="number"
                min="0"
                step="any"
                defaultValue="150000"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.contract_value ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.contract_value && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.contract_value}</p>
              )}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payments Received (₹)</label>
              <input
                name="payments_received"
                type="number"
                min="0"
                step="any"
                defaultValue="0"
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.payments_received ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.payments_received && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.payments_received}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Add any special requirements, timelines, or compliance notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/clients"
            className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-2xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Client...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Create Client</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
