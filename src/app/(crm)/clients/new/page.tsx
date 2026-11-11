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
  ShieldCheck,
  FileText,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Save,
  ArrowRight,
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi (NCT)",
  "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh", "Other"
];

const ENTITY_STRUCTURES = [
  "Private Limited (Pvt Ltd)",
  "Limited Liability Partnership (LLP)",
  "Sole Proprietorship",
  "Partnership Firm",
  "Public Limited Company",
  "Section 8 Company (NGO)",
  "One Person Company (OPC)",
  "Individual / Freelancer"
];

export default function NewClientPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [state, formAction, isPending] = useActionState(createClientAction, null);
  const handledStateRef = useRef<CreateClientState | null>(null);

  // Form Fields State
  // 1. Company Details
  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [companyType, setCompanyType] = useState("Private Limited (Pvt Ltd)");

  // 2. Primary Contact
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");

  // 3. Additional Contacts
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);

  // 4. Billing Details & GST
  const [billingName, setBillingName] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isNotGstRegistered, setIsNotGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");

  // 5. Salesperson & Client Ownership
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedSalesperson, setAssignedSalesperson] = useState("");
  const [clientSince, setClientSince] = useState(new Date().toISOString().split("T")[0]);

  // 6. Client Status
  const [clientStatus, setClientStatus] = useState<"Active" | "Inactive">("Active");

  // 7. Notes
  const [notes, setNotes] = useState("");

  // Submit Intent: "save" or "save_and_add_service"
  const [submitIntent, setSubmitIntent] = useState<"save" | "save_and_add_service">("save_and_add_service");

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
      success("Client saved", "Client registration completed successfully.");
      if (submitIntent === "save_and_add_service") {
        router.push(`/clients/${state.clientId}?addService=true`);
      } else {
        router.push(`/clients/${state.clientId}`);
      }
    } else if (state.error) {
      toastError("Failed to save client", state.error);
    }
  }, [state, submitIntent, router, success, toastError]);

  // Additional Contacts Handlers
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      {/* Header: Back button + Title */}
      <div className="flex items-center gap-4">
        <Link
          href="/clients"
          className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif font-heading text-[#1B3260] tracking-tight">
            Add New Client
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
            Fill in company, contact, billing and ownership details to register a new client.
          </p>
        </div>
      </div>

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 shadow-2xs">
          {state.error}
        </div>
      )}

      {/* SINGLE BOX FORM CONTAINER */}
      <form action={formAction}>
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
        <input type="hidden" name="company_type" value={companyType} />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name="state" value={stateName} />

        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {/* ========================================================================= */}
          {/* 1. Company Details */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                  Company Details
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Legal registration and registered office address
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Company Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="company_name"
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Technologies Private Limited"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Trade Name, if different
                </label>
                <input
                  name="trade_name"
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Acme Labs"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Registered Address <span className="text-red-500">*</span>
                </label>
                <input
                  name="address"
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door No, Floor, Building, Street, Landmark"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="city"
                    required
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="pincode"
                    required
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560001"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] font-number transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                >
                  <option value="India">🇮🇳 India</option>
                  <option value="United States">🇺🇸 United States</option>
                  <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="Other">🌐 Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Entity Structure
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                >
                  {ENTITY_STRUCTURES.map((ent) => (
                    <option key={ent} value={ent}>
                      {ent}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. Primary Contact */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div>
                <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                  Primary Contact
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Main person responsible for communications and authorisations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="contact_person"
                  required
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Designation
                </label>
                <input
                  name="designation"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Managing Director / Founder"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  name="phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] font-number transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Alternate Mobile Number
                </label>
                <input
                  name="alternate_phone"
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] font-number transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@acme.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. Additional Contacts */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                    Additional Contacts
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Secondary directors, finance managers, or operation coordinators
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0481A2]/10 text-[#0481A2] hover:bg-[#0481A2]/20 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Contact</span>
              </button>
            </div>

            {additionalContacts.length === 0 ? (
              <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No additional contacts added yet. Click &quot;Add Contact&quot; to include secondary stakeholders.
              </div>
            ) : (
              <div className="space-y-3">
                {additionalContacts.map((contact, idx) => (
                  <div
                    key={contact.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl relative space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 text-xs">
                        Contact #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove contact"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Contact Name"
                          value={contact.name}
                          onChange={(e) => handleUpdateContact(contact.id, "name", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Designation"
                          value={contact.designation}
                          onChange={(e) => handleUpdateContact(contact.id, "designation", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          placeholder="Mobile Number"
                          value={contact.phone}
                          onChange={(e) => handleUpdateContact(contact.id, "phone", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2] font-number"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={contact.email}
                          onChange={(e) => handleUpdateContact(contact.id, "email", e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0481A2]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. Billing Details & GST */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                    Billing Details &amp; GST
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Billing address, invoice recipient and GSTIN identification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyFromPrimary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy from Company</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Billing Name
                </label>
                <input
                  name="billing_name"
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Entity name on invoice"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Billing Contact Person
                </label>
                <input
                  name="billing_contact"
                  type="text"
                  value={billingContact}
                  onChange={(e) => setBillingContact(e.target.value)}
                  placeholder="Person to receive invoices"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Billing Address
                </label>
                <input
                  name="billing_address"
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Full billing address for invoices"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Billing Email
                </label>
                <input
                  name="billing_email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="accounts@acme.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2]"
                />
              </div>

              {/* GSTIN / Not GST-registered */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
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

          {/* ========================================================================= */}
          {/* 5. Salesperson & Client Ownership */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                  Client Ownership &amp; Status
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Assigned executive who brought in the client and operational status
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
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
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Client Since Date
                </label>
                <input
                  name="client_since"
                  type="date"
                  value={clientSince}
                  onChange={(e) => setClientSince(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <label className="block font-semibold text-slate-700 mb-2">
                  Client Status
                </label>
                <div className="flex items-center gap-8">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status_radio"
                      value="Active"
                      checked={clientStatus === "Active"}
                      onChange={() => setClientStatus("Active")}
                      className="text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-900 text-xs">Active</span>
                    <span className="text-slate-500 text-[11px]">(Ongoing operations and deliverables)</span>
                  </label>

                  <label className="inline-flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status_radio"
                      value="Inactive"
                      checked={clientStatus === "Inactive"}
                      onChange={() => setClientStatus("Inactive")}
                      className="text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-900 text-xs">Inactive</span>
                    <span className="text-slate-500 text-[11px]">(Dormant or archived)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. Notes */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                  Introductory Notes
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  General background information or instructions about the client
                </p>
              </div>
            </div>

            <div>
              <textarea
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add introductory notes, business domain, special client preferences, or operational comments..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Action Buttons */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <Link
              href="/clients"
              className="px-6 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-2xs cursor-pointer w-full sm:w-auto text-center"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="submit"
                disabled={isPending}
                onClick={() => setSubmitIntent("save")}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#243E76] text-[#243E76] hover:bg-[#243E76]/10 font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
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
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
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
        </div>
      </form>
    </div>
  );
}
