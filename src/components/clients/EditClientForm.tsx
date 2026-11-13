"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
  UserCheck,
} from "lucide-react";
import { updateClientAction, ClientFormState } from "@/app/actions/client-edit";
import { fetchSalespeopleAction } from "@/app/actions/clients";
import { PhoneInput } from "@/components/clients/PhoneInput";

interface SalespersonOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active?: boolean;
}

interface EditClientFormProps {
  client: any;
  isAdmin: boolean;
}

export function EditClientForm({ client, isAdmin }: EditClientFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateClientAction, null);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [loadingSalespeople, setLoadingSalespeople] = useState<boolean>(isAdmin);

  // Controlled salesperson selection to preserve assignment reliably
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(
    client.assigned_salesperson || ""
  );

  // Load salespeople for Admins
  useEffect(() => {
    if (isAdmin) {
      setLoadingSalespeople(true);
      fetchSalespeopleAction()
        .then((data) => {
          setSalespeople(data || []);
        })
        .finally(() => {
          setLoadingSalespeople(false);
        });
    }
  }, [isAdmin]);

  // Keep state in sync if client changes
  useEffect(() => {
    if (client.assigned_salesperson) {
      setSelectedSalesperson(client.assigned_salesperson);
    }
  }, [client.assigned_salesperson]);

  // Success redirect and refresh
  useEffect(() => {
    if (state?.success && state?.clientId) {
      router.push(`/clients/${state.clientId}`);
      router.refresh();
    }
  }, [state, router]);

  // Check if assigned salesperson is currently in the active salespeople list
  const currentSalespersonOption = salespeople.find((s) => s.id === client.assigned_salesperson);
  const isAssigneeInactive =
    currentSalespersonOption && currentSalespersonOption.is_active === false;

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

      {/* Global Form Error Banner */}
      {state?.error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2 shadow-2xs">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <span>{state.error}</span>
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
              <label className="block font-medium text-slate-700 mb-1">Company Legal Name *</label>
              <input
                name="company_name"
                required
                type="text"
                defaultValue={client.company_name}
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.company_name ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.company_name && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.company_name}</p>
              )}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Trade Name (Optional)</label>
              <input
                name="trade_name"
                type="text"
                defaultValue={client.trade_name || ""}
                placeholder="Brand / DBA name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Type</label>
              <select
                name="company_type"
                defaultValue={client.company_type || "Private Limited (Pvt Ltd)"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Public Limited Company">Public Limited Company</option>
                <option value="Section 8 Company (NGO)">Section 8 Company (NGO)</option>
                <option value="One Person Company (OPC)">One Person Company (OPC)</option>
                <option value="Individual / Freelancer">Individual / Freelancer</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PAN Number</label>
              <input
                name="pan_number"
                type="text"
                defaultValue={client.pan_number || ""}
                placeholder="ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
              <input
                name="gst_number"
                type="text"
                defaultValue={client.gst_number || ""}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Client Lifecycle Status</label>
              <select
                name="client_status"
                defaultValue={client.client_status || "Active"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="Active">Active</option>
                <option value="Pending Onboarding">Pending Onboarding</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Inactive">Inactive</option>
                {isAdmin && <option value="Archived">Archived</option>}
              </select>
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
              <label className="block font-medium text-slate-700 mb-1">PIN Code</label>
              <input
                name="pincode"
                type="text"
                maxLength={6}
                defaultValue={client.pincode || ""}
                placeholder="6-digit PIN"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Country</label>
              <input
                name="country"
                type="text"
                defaultValue={client.country || "India"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
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
            <PhoneIcon size={16} className="text-[#0481A2]" />
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
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.contact_person ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.contact_person && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.contact_person}</p>
              )}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Designation</label>
              <input
                name="designation"
                type="text"
                defaultValue={client.designation || ""}
                placeholder="e.g. Managing Director, CFO"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email (Optional)</label>
              <input
                name="email"
                type="email"
                defaultValue={client.email || ""}
                placeholder="client@company.com"
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
                defaultValue={client.phone}
                error={state?.fieldErrors?.phone}
              />
            </div>

            {/* International Phone Input for Alternate Phone */}
            <div className="md:col-span-2">
              <PhoneInput
                label="Alternate Phone (Optional)"
                name="alternate_phone"
                required={false}
                defaultValue={client.alternate_phone}
                error={state?.fieldErrors?.alternate_phone}
              />
            </div>
          </div>
        </div>

        {/* Section: Billing Details & Tax */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Building size={16} className="text-[#0481A2]" />
            <h3>Billing & Tax Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Entity Name</label>
              <input
                name="billing_name"
                type="text"
                defaultValue={client.billing_name || ""}
                placeholder="Entity name on invoices"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Contact Person</label>
              <input
                name="billing_contact"
                type="text"
                defaultValue={client.billing_contact || ""}
                placeholder="Accounts Department / Finance Head"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Billing Address</label>
              <input
                name="billing_address"
                type="text"
                defaultValue={client.billing_address || ""}
                placeholder="Full address for tax invoices"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Email</label>
              <input
                name="billing_email"
                type="email"
                defaultValue={client.billing_email || ""}
                placeholder="invoices@company.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Registration Status</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  name="is_not_gst_registered"
                  value="true"
                  defaultChecked={client.is_not_gst_registered || false}
                  className="rounded text-[#0481A2] focus:ring-[#0481A2]"
                />
                <span>Client is not GST-registered</span>
              </label>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            {/* Salesperson Assignment */}
            <div>
              <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>Assigned Salesperson</span>
                {isAdmin && (
                  <span className="text-[10px] text-slate-400 font-normal">Admin Reassignment</span>
                )}
              </label>

              {isAdmin ? (
                <div className="space-y-1.5">
                  <select
                    name="assigned_salesperson"
                    value={selectedSalesperson}
                    onChange={(e) => setSelectedSalesperson(e.target.value)}
                    disabled={loadingSalespeople}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] cursor-pointer"
                  >
                    {/* Always keep existing assignee as top priority option if not yet in salespeople list */}
                    {client.assigned_salesperson &&
                      !salespeople.some((p) => p.id === client.assigned_salesperson) && (
                        <option value={client.assigned_salesperson}>
                          {client.assigned_profile?.full_name || "Existing Assigned Employee"}
                        </option>
                      )}

                    {salespeople.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role === "admin" ? "Admin" : "Sales"})
                        {p.is_active === false ? " - Inactive" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Warning if assigned salesperson is inactive or not found */}
                  {isAssigneeInactive && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      <span>The assigned salesperson is marked inactive. You may reassign to an active employee.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-medium">
                  <UserCheck size={14} className="text-[#0481A2]" />
                  <span>
                    {client.assigned_profile?.full_name || "Assigned Employee"}
                  </span>
                  <span className="ml-auto text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-600">
                    Locked
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Contract Value (₹) *</label>
              <input
                name="contract_value"
                required
                type="number"
                min="0"
                step="any"
                defaultValue={client.contract_value}
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
                defaultValue={client.payments_received}
                className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-[#0481A2] ${
                  state?.fieldErrors?.payments_received ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
              />
              {state?.fieldErrors?.payments_received && (
                <p className="text-[11px] text-red-600 mt-1">{state.fieldErrors.payments_received}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Status</label>
              <select
                name="payment_status"
                defaultValue={client.payment_status || "Upcoming"}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={client.notes || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/clients/${client.id}`}
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
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
