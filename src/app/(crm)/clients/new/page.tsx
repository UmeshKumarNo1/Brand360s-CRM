"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  User,
  Users,
  Receipt,
  UserCheck,
  FileText,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Save,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { createClientAction, fetchSalespeopleAction, CreateClientState } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";

interface AdditionalContact {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [state, formAction, isPending] = useActionState(createClientAction, null);
  const handledStateRef = useRef<CreateClientState | null>(null);

  // Form Fields State
  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");

  // Primary Contact
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");

  // Additional Contacts
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);

  // Billing Details & GST
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isNotGstRegistered, setIsNotGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");

  // Ownership & Status
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedSalesperson, setAssignedSalesperson] = useState("");
  const [clientSince, setClientSince] = useState(new Date().toISOString().split("T")[0]);
  const [clientStatus, setClientStatus] = useState<"Active" | "Inactive">("Active");

  // Notes
  const [notes, setNotes] = useState("");

  // Which submit action was clicked: "save" or "save_and_add_service"
  const [submitIntent, setSubmitIntent] = useState<"save" | "save_and_add_service">("save");

  // Load Salespeople
  useEffect(() => {
    fetchSalespeopleAction().then((data) => {
      setSalespeople(data || []);
      if (data && data.length > 0 && !assignedSalesperson) {
        setAssignedSalesperson(data[0].id);
      }
    });
  }, []);

  // Handle Response State
  useEffect(() => {
    if (!state || handledStateRef.current === state) return;
    handledStateRef.current = state;

    if (state.success && state.clientId) {
      success("Client created", "Client details successfully saved.");
      if (submitIntent === "save_and_add_service") {
        router.push(`/clients/${state.clientId}?addService=true`);
      } else {
        router.push(`/clients/${state.clientId}`);
      }
    } else if (state.error) {
      toastError("Failed to create client", state.error);
    }
  }, [state, submitIntent, router, success, toastError]);

  // Add Contact Handler
  const handleAddContact = () => {
    setAdditionalContacts((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: "",
        designation: "",
        phone: "",
        email: "",
      },
    ]);
  };

  const handleUpdateContact = (id: string, field: keyof AdditionalContact, value: string) => {
    setAdditionalContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveContact = (id: string) => {
    setAdditionalContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Copy Primary Details to Billing
  const handleCopyFromPrimary = () => {
    setBillingName(companyName);
    setBillingAddress(
      [address, city, stateName, pincode, country].filter(Boolean).join(", ")
    );
    setBillingContact(contactPerson);
    setBillingEmail(email);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Link
            href="/clients"
            className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif font-heading text-[#1B3260]">
              Add New Client
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
              Record company details, primary and secondary contacts, billing info &amp; ownership
            </p>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
          {state.error}
        </div>
      )}

      {/* Multi-Section Form */}
      <form action={formAction} className="space-y-6 text-xs text-slate-700">
        {/* Hidden inputs */}
        <input
          type="hidden"
          name="additional_contacts"
          value={JSON.stringify(
            additionalContacts.filter((c) => c.name || c.phone || c.email)
          )}
        />
        <input
          type="hidden"
          name="is_not_gst_registered"
          value={isNotGstRegistered ? "true" : "false"}
        />
        <input type="hidden" name="client_status" value={clientStatus} />

        {/* SECTION 1: Company Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
            <Building2 size={16} className="text-[#0481A2]" />
            <h3 className="font-serif font-heading text-[#243E76]">1. Company Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Company Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                name="company_name"
                required
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Technologies Private Limited"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Trade Name, if different
              </label>
              <input
                name="trade_name"
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Acme Labs"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
              <input
                name="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Floor, Building, Street, Landmark"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 md:col-span-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  name="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
                <input
                  name="state"
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                <input
                  name="pincode"
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="560001"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country</label>
              <input
                name="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entity Structure</label>
              <select
                name="company_type"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              >
                <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Public Limited Company">Public Limited Company</option>
                <option value="Section 8 Company (NGO)">Section 8 Company (NGO)</option>
                <option value="Individual / Freelancer">Individual / Freelancer</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Primary Contact */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
            <User size={16} className="text-[#0481A2]" />
            <h3 className="font-serif font-heading text-[#243E76]">2. Primary Contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="contact_person"
                required
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designation</label>
              <input
                name="designation"
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Managing Director / Founder"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                name="phone"
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alternate Number</label>
              <input
                name="alternate_phone"
                type="tel"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh@acme.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Additional Contacts */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Users size={16} className="text-[#0481A2]" />
              <h3 className="font-serif font-heading text-[#243E76]">3. Additional Contacts</h3>
            </div>
            <button
              type="button"
              onClick={handleAddContact}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#0481A2] text-[#0481A2] hover:bg-[#0481A2]/10 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Contact</span>
            </button>
          </div>

          {additionalContacts.length === 0 ? (
            <p className="text-slate-400 italic text-[11px] py-1">
              No additional contacts added yet. Click &quot;Add Contact&quot; to record secondary directors, finance managers, or coordinators.
            </p>
          ) : (
            <div className="space-y-3">
              {additionalContacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 text-[11px]">
                      Contact #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Remove contact"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={contact.name}
                        onChange={(e) => handleUpdateContact(contact.id, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Designation"
                        value={contact.designation}
                        onChange={(e) => handleUpdateContact(contact.id, "designation", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone / Mobile"
                        value={contact.phone}
                        onChange={(e) => handleUpdateContact(contact.id, "phone", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-[#0481A2] font-number"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={contact.email}
                        onChange={(e) => handleUpdateContact(contact.id, "email", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: Billing Details & GST */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Receipt size={16} className="text-[#0481A2]" />
              <h3 className="font-serif font-heading text-[#243E76]">4. Billing Details &amp; GST</h3>
            </div>
            <button
              type="button"
              onClick={handleCopyFromPrimary}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Copy size={12} />
              <span>Copy from Company</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Name</label>
              <input
                name="billing_name"
                type="text"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Entity name on invoice"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Contact Person</label>
              <input
                name="billing_contact"
                type="text"
                value={billingContact}
                onChange={(e) => setBillingContact(e.target.value)}
                placeholder="Person to receive invoices"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
              <input
                name="billing_address"
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Full billing address for invoices"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Email</label>
              <input
                name="billing_email"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="accounts@acme.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              />
            </div>

            {/* GSTIN & Not Registered Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">GST Details</label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={isNotGstRegistered}
                    onChange={(e) => {
                      setIsNotGstRegistered(e.target.checked);
                      if (e.target.checked) setGstin("");
                    }}
                    className="rounded border-slate-300 text-[#0481A2] focus:ring-[#0481A2] cursor-pointer"
                  />
                  <span>Not GST-registered</span>
                </label>
              </div>
              <input
                name="gst_number"
                type="text"
                disabled={isNotGstRegistered}
                value={isNotGstRegistered ? "Not GST-registered" : gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder={isNotGstRegistered ? "Exempt / Unregistered" : "29AAAAA0000A1Z5"}
                maxLength={15}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono uppercase focus:outline-none ${
                  isNotGstRegistered
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-white border-slate-300 focus:border-[#0481A2]"
                }`}
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Client Ownership & Client Since */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
            <UserCheck size={16} className="text-[#0481A2]" />
            <h3 className="font-serif font-heading text-[#243E76]">5. Client Ownership</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Salesperson Who Brought In the Client <span className="text-red-500">*</span>
              </label>
              <select
                name="assigned_salesperson"
                required
                value={assignedSalesperson}
                onChange={(e) => setAssignedSalesperson(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
              >
                <option value="">Select Salesperson...</option>
                {salespeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Since Date</label>
              <input
                name="client_since"
                type="date"
                value={clientSince}
                onChange={(e) => setClientSince(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Client Status */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
            <ShieldCheck size={16} className="text-[#0481A2]" />
            <h3 className="font-serif font-heading text-[#243E76]">6. Client Status</h3>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status_radio"
                value="Active"
                checked={clientStatus === "Active"}
                onChange={() => setClientStatus("Active")}
                className="text-[#0481A2] focus:ring-[#0481A2]"
              />
              <span className="font-semibold text-slate-800">Active</span>
              <span className="text-[11px] text-slate-500">(Default: ongoing operations and services)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status_radio"
                value="Inactive"
                checked={clientStatus === "Inactive"}
                onChange={() => setClientStatus("Inactive")}
                className="text-[#0481A2] focus:ring-[#0481A2]"
              />
              <span className="font-semibold text-slate-800">Inactive</span>
              <span className="text-[11px] text-slate-500">(Dormant or archived)</span>
            </label>
          </div>
        </div>

        {/* SECTION 7: Notes */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-800 font-bold text-sm">
            <FileText size={16} className="text-[#0481A2]" />
            <h3 className="font-serif font-heading text-[#243E76]">7. Introductory Notes</h3>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Notes about the Company (Optional)
            </label>
            <textarea
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add introductory notes, industry domain, special business instructions, or referral context..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <Link
            href="/clients"
            className="px-5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-2xs"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="submit"
              disabled={isPending}
              onClick={() => setSubmitIntent("save")}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#243E76] text-[#243E76] hover:bg-[#243E76]/10 text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isPending && submitIntent === "save" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>Save Client</span>
            </button>

            <button
              type="submit"
              disabled={isPending}
              onClick={() => setSubmitIntent("save_and_add_service")}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isPending && submitIntent === "save_and_add_service" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Save &amp; Add Service</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
