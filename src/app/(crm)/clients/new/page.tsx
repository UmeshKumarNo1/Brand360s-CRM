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
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Save,
  Check,
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

  // Active accordion section (1 to 7)
  const [activeSection, setActiveSection] = useState<number>(1);

  // Form Fields State
  // Section 1: Company Details
  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [companyType, setCompanyType] = useState("Private Limited (Pvt Ltd)");

  // Section 2: Primary Contact
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [email, setEmail] = useState("");

  // Section 3: Additional Contacts
  const [additionalContacts, setAdditionalContacts] = useState<AdditionalContact[]>([]);

  // Section 4: Billing Details & GST
  const [billingName, setBillingName] = useState("");
  const [billingContact, setBillingContact] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isNotGstRegistered, setIsNotGstRegistered] = useState(false);
  const [gstin, setGstin] = useState("");

  // Section 5: Client Ownership
  const [salespeople, setSalespeople] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedSalesperson, setAssignedSalesperson] = useState("");
  const [clientSince, setClientSince] = useState(new Date().toISOString().split("T")[0]);

  // Section 6: Client Status
  const [clientStatus, setClientStatus] = useState<"Active" | "Inactive">("Active");

  // Section 7: Notes
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

  // Calculate Progress Percentage dynamically
  const progressPercentage = useMemo(() => {
    let completedSteps = 0;
    // Step 1: Company Details
    if (companyName.trim() && address.trim() && city.trim() && pincode.trim()) {
      completedSteps += 1;
    } else if (activeSection > 1) {
      completedSteps += 1;
    }

    // Step 2: Primary Contact
    if (contactPerson.trim() && phone.trim()) {
      completedSteps += 1;
    } else if (activeSection > 2) {
      completedSteps += 1;
    }

    // Step 3: Additional Contacts (optional, counts as completed if section 3 passed)
    if (activeSection > 3 || additionalContacts.length > 0) {
      completedSteps += 1;
    }

    // Step 4: Billing Details & GST
    if (activeSection > 4 || billingName.trim() || isNotGstRegistered || gstin.trim()) {
      completedSteps += 1;
    }

    // Step 5: Ownership
    if (activeSection > 5 || assignedSalesperson) {
      completedSteps += 1;
    }

    // Step 6: Status
    if (activeSection > 6 || clientStatus) {
      completedSteps += 1;
    }

    // Step 7: Notes
    if (activeSection === 7 || notes.trim()) {
      completedSteps += 1;
    }

    // Normalize between active step baseline and total calculated
    const stepBasedPercent = Math.round((activeSection / 7) * 100);
    const scorePercent = Math.round((completedSteps / 7) * 100);
    const result = Math.max(stepBasedPercent, scorePercent);
    // When on step 1, show 14% exactly like in the UI design mock
    return Math.min(100, Math.max(14, result));
  }, [
    activeSection,
    companyName,
    address,
    city,
    pincode,
    contactPerson,
    phone,
    additionalContacts,
    billingName,
    isNotGstRegistered,
    gstin,
    assignedSalesperson,
    clientStatus,
    notes,
  ]);

  // SVG Gauge calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~ 251.32
  const strokeDashoffset = circumference - (circumference * progressPercentage) / 100;

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
    setEmail(email);
    setBillingEmail(email);
  };

  const stepsList = [
    { id: 1, key: "company", title: "Company", fullTitle: "1. Company Details", desc: "Enter company information", icon: Building2 },
    { id: 2, key: "contact", title: "Contact", fullTitle: "2. Primary Contact", desc: "Add primary contact for this client", icon: User },
    { id: 3, key: "additional", title: "Additional Contacts", fullTitle: "3. Additional Contacts", desc: "Add more contacts (e.g. directors, finance managers, coordinators)", icon: Users },
    { id: 4, key: "billing", title: "Billing & GST", fullTitle: "4. Billing Details & GST", desc: "Enter billing and GST information for invoicing", icon: Receipt },
    { id: 5, key: "ownership", title: "Ownership", fullTitle: "5. Client Ownership", desc: "Ownership and association details", icon: UserCheck },
    { id: 6, key: "status", title: "Status", fullTitle: "6. Client Status", desc: "Current status of the client", icon: ShieldCheck },
    { id: 7, key: "notes", title: "Introductory Notes", fullTitle: "7. Introductory Notes", desc: "Add any additional notes about the company", icon: FileText },
  ];

  return (
    <div className="max-w-[1450px] mx-auto space-y-6 pb-16 font-sans">
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
            Complete the details below to register a new client in the system.
          </p>
        </div>
      </div>

      {/* Top Stepper Bar (matching image) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] max-w-4xl mx-auto px-4">
          {stepsList.map((step, idx) => {
            const isActive = activeSection === step.id;
            const isCompleted = activeSection > step.id;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                <button
                  type="button"
                  onClick={() => setActiveSection(step.id)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-[#0481A2] text-white shadow-sm ring-4 ring-[#0481A2]/15"
                        : isCompleted
                        ? "bg-[#0481A2]/20 text-[#0481A2]"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check size={14} className="stroke-[3]" /> : step.id}
                  </div>
                  <span
                    className={`text-[11px] font-semibold tracking-tight transition-colors ${
                      isActive
                        ? "text-[#0481A2] font-bold"
                        : isCompleted
                        ? "text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>

                {/* Connecting Line */}
                {idx < stepsList.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-2 transition-colors ${
                      activeSection > step.id ? "bg-[#0481A2]" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 shadow-2xs">
          {state.error}
        </div>
      )}

      {/* Main 2-Column Grid */}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 7 Accordion Sections + Bottom Bar (cols 8 / 9) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* ========================================================================= */}
            {/* SECTION 1: Company Details */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 1 ? 0 : 1)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      1. Company Details
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Enter company information
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 1 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 1 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Section 1 Next Banner (matching image) */}
                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mt-3">
                    <div className="flex items-center gap-2 text-[#0481A2] font-medium">
                      <Info size={16} className="shrink-0 text-[#0481A2]" />
                      <span>Please ensure all details are correct before moving to the next step.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Contact</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2: Primary Contact */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 2 ? 0 : 2)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      2. Primary Contact
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Add primary contact for this client
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 2 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 2 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        Alternate Number
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

                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs mt-3">
                    <span className="text-[#0481A2] font-medium">
                      Primary contact details saved. You can add additional directors or accountants next.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection(3)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Additional Contacts</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 3: Additional Contacts */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 3 ? 0 : 3)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      3. Additional Contacts
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Add more contacts (e.g. directors, finance managers, coordinators)
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 3 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 3 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-slate-500 font-medium">
                      Add team members who will participate in compliance, billing, or operations.
                    </span>
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
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                      No additional contacts added yet. Click &quot;Add Contact&quot; if this client has multiple directors or coordinators.
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
                              Additional Contact #{idx + 1}
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
                                placeholder="Mobile / WhatsApp"
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

                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs mt-3">
                    <span className="text-[#0481A2] font-medium">
                      Proceed to configure Billing and GST tax details.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection(4)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Billing &amp; GST</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 4: Billing Details & GST */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 4 ? 0 : 4)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      4. Billing Details &amp; GST
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Enter billing and GST information for invoicing
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 4 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 4 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-slate-500 font-medium">
                      Fill billing details or copy directly from company &amp; primary contact.
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyFromPrimary}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>Copy from Company</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* GST Details */}
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

                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs mt-3">
                    <span className="text-[#0481A2] font-medium">
                      Assign client ownership to the relevant salesperson.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection(5)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Ownership</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 5: Client Ownership */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 5 ? 0 : 5)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      5. Client Ownership
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Ownership and association details
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 5 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 5 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs mt-3">
                    <span className="text-[#0481A2] font-medium">
                      Select client operational status.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection(6)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Status</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 6: Client Status */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 6 ? 0 : 6)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      6. Client Status
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Current status of the client
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 6 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 6 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div className="flex items-center gap-8 py-2">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status_radio"
                        value="Active"
                        checked={clientStatus === "Active"}
                        onChange={() => setClientStatus("Active")}
                        className="text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 text-sm">Active</span>
                      <span className="text-slate-500 text-xs">(Default: ongoing operations and services)</span>
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
                      <span className="font-bold text-slate-900 text-sm">Inactive</span>
                      <span className="text-slate-500 text-xs">(Dormant or archived)</span>
                    </label>
                  </div>

                  <div className="bg-[#E6F4F8] border border-[#BCE1EC] rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs mt-3">
                    <span className="text-[#0481A2] font-medium">
                      Add any initial notes or background instructions.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection(7)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <span>Next: Notes</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 7: Introductory Notes */}
            {/* ========================================================================= */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 7 ? 0 : 7)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      7. Introductory Notes
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Add any additional notes about the company
                    </p>
                  </div>
                </div>
                <div className="text-slate-400 p-1">
                  {activeSection === 7 ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {activeSection === 7 && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs text-slate-700">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Company Background &amp; Delivery Instructions (Optional)
                    </label>
                    <textarea
                      name="notes"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add introductory notes, business domain, special client preferences, or operational comments..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (matching image) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
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
          </div>

          {/* Right Column: Client Registration Progress Sidebar (cols 4 / 3) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
              <h2 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                Client Registration Progress
              </h2>

              {/* Circular Gauge */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#E2E8F0"
                      strokeWidth="8"
                    />
                    {/* Animated Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#0481A2"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold font-number text-[#1B3260]">
                      {progressPercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Complete</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500 mt-2">Complete</span>
              </div>

              {/* Vertical Stepper List (matching image) */}
              <div className="space-y-4 pt-2">
                {stepsList.map((step, idx) => {
                  const isActive = activeSection === step.id;
                  const isCompleted = activeSection > step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveSection(step.id)}
                      className="flex items-center gap-3 w-full text-left group cursor-pointer"
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-[#0481A2] text-white ring-4 ring-[#0481A2]/15"
                              : isCompleted
                              ? "bg-[#0481A2] text-white"
                              : "border-2 border-slate-300 bg-white"
                          }`}
                        >
                          {isActive ? (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          ) : isCompleted ? (
                            <Check size={11} className="stroke-[3]" />
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold font-number ${
                            isActive ? "text-[#0481A2]" : isCompleted ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {step.id}
                        </span>
                        <span
                          className={`text-xs transition-colors ${
                            isActive
                              ? "font-bold text-[#0481A2]"
                              : isCompleted
                              ? "font-semibold text-slate-800"
                              : "text-slate-500 group-hover:text-slate-800"
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Illustration & Helper Banner (matching image) */}
              <div className="bg-gradient-to-b from-[#EBF5F8] to-[#E3F2F6] border border-[#CDE5EC] rounded-2xl p-4 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-white shadow-2xs flex items-center justify-center text-[#0481A2]">
                  <FileText size={24} />
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  Add all required details to register the client
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
