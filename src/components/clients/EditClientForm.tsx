"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Building, Phone, Layers, CreditCard, Loader2, UserCheck } from "lucide-react";
import { updateClientAction } from "@/app/actions/client-edit";
import { fetchSalespeopleAction } from "@/app/actions/clients";

interface EditClientFormProps {
  client: any;
  isAdmin: boolean;
}

export function EditClientForm({ client, isAdmin }: EditClientFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateClientAction, null);
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchSalespeopleAction().then((data) => {
        setSalespeople(data || []);
      });
    }
  }, [isAdmin]);

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
            href={`/clients/${client.id}`}
            className="p-2 bg-white border border-[#E2E8F0] rounded-lg text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Edit Client: {client.company_name}</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {client.client_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify company information, contract terms, or reassign salesperson
            </p>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {/* Multi-Section Edit Form */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="client_id" value={client.id} />

        {/* Section 1: Company Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Building size={16} className="text-[#0481A2]" />
            <h3>Company Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
              <input 
                name="company_name" 
                required 
                type="text" 
                defaultValue={client.company_name}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Type</label>
              <select 
                name="company_type" 
                defaultValue={client.company_type || "Private Limited (Pvt Ltd)"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Public Limited">Public Limited</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PAN Number</label>
              <input 
                name="pan_number" 
                type="text" 
                defaultValue={client.pan_number || ""}
                placeholder="ABCDE1234F" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
              <input 
                name="gst_number" 
                type="text" 
                defaultValue={client.gst_number || ""}
                placeholder="27AAAAA0000A1Z5" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Registered Address</label>
              <input 
                name="address" 
                type="text" 
                defaultValue={client.address || ""}
                placeholder="Office Address" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <input 
                name="city" 
                type="text" 
                defaultValue={client.city || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">State</label>
              <input 
                name="state" 
                type="text" 
                defaultValue={client.state || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Client Status</label>
              <select 
                name="client_status" 
                defaultValue={client.client_status || "Active"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="Active">Active</option>
                <option value="Pending Onboarding">Pending Onboarding</option>
                <option value="On Hold">On Hold</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Website</label>
              <input 
                name="website" 
                type="text" 
                defaultValue={client.website || ""}
                placeholder="https://example.com" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Phone size={16} className="text-[#0481A2]" />
            <h3>Contact Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person *</label>
              <input 
                name="contact_person" 
                required 
                type="text" 
                defaultValue={client.contact_person}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone *</label>
              <input 
                name="phone" 
                required 
                type="tel" 
                defaultValue={client.phone}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email *</label>
              <input 
                name="email" 
                required 
                type="email" 
                defaultValue={client.email}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Alternate Phone</label>
              <input 
                name="alternate_phone" 
                type="tel" 
                defaultValue={client.alternate_phone || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
          </div>
        </div>

        {/* Section 3: Commercial Terms & Sales Assignment */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Layers size={16} className="text-[#0481A2]" />
            <h3>Commercial Terms & Sales Assignment</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Services Purchased *</label>
              <input 
                name="services_purchased" 
                required 
                type="text" 
                defaultValue={client.services_purchased || "Company Registration"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>

            {/* Salesperson Assignment */}
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Assigned Salesperson {isAdmin && "(Admin Reassignment)"}
              </label>
              {isAdmin ? (
                <select 
                  name="assigned_salesperson" 
                  defaultValue={client.assigned_salesperson || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                >
                  {salespeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                  {salespeople.length === 0 && (
                    <option value={client.assigned_salesperson}>
                      {client.assigned_profile?.full_name || "Current Assignee"}
                    </option>
                  )}
                </select>
              ) : (
                <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600">
                  {client.assigned_profile?.full_name || "You (Locked)"}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Contract Value (₹) *</label>
              <input 
                name="contract_value" 
                required 
                type="number" 
                defaultValue={client.contract_value}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payments Received (₹)</label>
              <input 
                name="payments_received" 
                type="number" 
                defaultValue={client.payments_received}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Status</label>
              <select 
                name="payment_status" 
                defaultValue={client.payment_status || "Upcoming"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="Paid in full">Paid in full</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Next Payment Due Date</label>
              <input 
                name="next_payment_due_date" 
                type="date" 
                defaultValue={client.next_payment_due_date || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
              <textarea 
                name="notes" 
                rows={3} 
                defaultValue={client.notes || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" 
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/clients/${client.id}`}
            className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Updating Client...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

