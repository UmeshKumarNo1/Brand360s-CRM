"use client";

import { useActionState, useEffect, useState, useMemo, useRef } from "react";
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

  // 4. Billing Details
  const [billingName, setBillingName] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // 5. GST Details
  const [isNotGstRegistered, setIsNotGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");

  // 6. Salesperson & Client Since
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedSalesperson, setAssignedSalesperson] = useState("");
  const [clientSince, setClientSince] = useState(new Date().toISOString().split("T")[0]);

  // 7. Client Status
  const [clientStatus, setClientStatus] = useState<"Active" | "Inactive">("Active");

  // 8. Notes
  const [notes, setNotes] = useState("");

  // Submit Intent: "draft", "save", "save_and_add_service"
  const [submitIntent, setSubmitIntent] = useState<"draft" | "save" | "save_and_add_service">("save_and_add_service");

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

  // Form Completion Progress Percentage
  const progressPercentage = useMemo(() => {
    let score = 0;
    const totalWeight = 100;

    // Company details (25%)
    if (companyName.trim()) score += 15;
    if (address.trim() || city.trim()) score += 5;
    if (pincode.trim()) score += 5;

    // Primary contact (25%)
    if (contactPerson.trim()) score += 15;
    if (phone.trim()) score += 10;

    // Billing & GST (20%)
    if (billingName.trim() || isNotGstRegistered || gstin.trim()) score += 20;

    // Salesperson (15%)
    if (assignedSalesperson) score += 15;

    // Status & Notes (15%)
    if (clientStatus) score += 10;
    if (notes.trim() || email.trim()) score += 5;

    return Math.min(totalWeight, score);
  }, [
    companyName,
    address,
    city,
    pincode,
    contactPerson,
    phone,
    billingName,
    isNotGstRegistered,
    gstin,
    assignedSalesperson,
    clientStatus,
    notes,
    email,
  ]);

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
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3.5">
          <Link
            href="/clients"
            className="w-10 h-10 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif font-heading text-[#1B3260] tracking-tight">
              Create Client
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
              Company and contact details to register a new client
            </p>
          </div>
        </div>

        {/* Pure Progress Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 shadow-2xs flex items-center gap-3 self-start sm:self-auto min-w-[220px]">
          <span className="text-xs font-semibold text-slate-600 shrink-0">Progress:</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0481A2] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs font-bold font-number text-[#0481A2] shrink-0 min-w-[32px] text-right">
            {progressPercentage}%
          </span>
        </div>
      </div>

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 shadow-2xs">
          {state.error}
        </div>
      )}

      {/* SINGLE BOX CONTAINER (Everything in one card, no steps, no accordions) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <form action={formAction} className="p-6 sm:p-8 space-y-8 text-xs text-slate-700">
          {/* Hidden metadata */}
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

          {/* ========================================================================= */}
          {/* 1. COMPANY DETAILS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  Company Details
                </h2>
                <p className="text-[11px] text-slate-400">Legal business entity name, trade name and registered address</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
                  Registered Address
                </label>
                <input
                  name="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door No, Floor, Building, Street, Landmark"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    name="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] focus:ring-1 focus:ring-[#0481A2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">State</label>
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
                  <label className="block font-semibold text-slate-700 mb-1.5">PIN Code</label>
                  <input
                    name="pincode"
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
                <label className="block font-semibold text-slate-700 mb-1.5">Country</label>
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
                <label className="block font-semibold text-slate-700 mb-1.5">Entity Structure</label>
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
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 2. PRIMARY CONTACT */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  Primary Contact
                </h2>
                <p className="text-[11px] text-slate-400">Key person managing the account and communication</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 3. ADDITIONAL CONTACTS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                    Additional Contacts
                  </h2>
                  <p className="text-[11px] text-slate-400">Secondary directors, finance managers, or coordinators</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2]/10 text-[#0481A2] hover:bg-[#0481A2]/20 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Contact</span>
              </button>
            </div>

            {additionalContacts.length === 0 ? (
              <p className="text-slate-400 italic text-[11px] py-1">
                No additional contacts added yet. Click &quot;Add Contact&quot; to record secondary contacts.
              </p>
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
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 4. BILLING DETAILS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                    Billing Details
                  </h2>
                  <p className="text-[11px] text-slate-400">Invoicing name, contact person and billing address</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
                  Billing Contact
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

              <div className="md:col-span-2">
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
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 5. GST DETAILS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  GST Details
                </h2>
                <p className="text-[11px] text-slate-400">GSTIN or option to mark as not GST-registered</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">GSTIN</label>
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
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 6. SALESPERSON (WHO BROUGHT IN THIS CLIENT) */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  Salesperson
                </h2>
                <p className="text-[11px] text-slate-400">Team member who brought in this client</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 7. CLIENT STATUS */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  Client Status
                </h2>
                <p className="text-[11px] text-slate-400">Current operational state</p>
              </div>
            </div>

            <div className="flex items-center gap-8 py-1 pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="status_radio"
                  value="Active"
                  checked={clientStatus === "Active"}
                  onChange={() => setClientStatus("Active")}
                  className="text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-900 text-xs sm:text-sm">Active</span>
                <span className="text-slate-500 text-[11px]">(Default: ongoing operations and services)</span>
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
                <span className="font-bold text-slate-900 text-xs sm:text-sm">Inactive</span>
                <span className="text-slate-500 text-[11px]">(Dormant or archived)</span>
              </label>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* ========================================================================= */}
          {/* 8. NOTES */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="font-serif font-heading font-bold text-sm sm:text-base text-[#1B3260]">
                  Notes
                </h2>
                <p className="text-[11px] text-slate-400">General information or instructions about the client</p>
              </div>
            </div>

            <div className="pt-1">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Introductory Notes / Instructions (Optional)
              </label>
              <textarea
                name="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="General information, business domain, special client preferences, or operational instructions..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
              />
            </div>
          </section>

          {/* ========================================================================= */}
          {/* FORM FOOTER ACTIONS */}
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
                onClick={() => setSubmitIntent("draft")}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <Save size={16} className="text-slate-500" />
                <span>Save as Draft</span>
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
        </form>
      </div>
    </div>
  );
}
