"use client";

import { useActionState, useEffect, useState, useRef, useTransition } from "react";
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
  Check,
  Info,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { createClientAction, fetchSalespeopleAction, CreateClientState } from "@/app/actions/clients";
import { useToast } from "@/components/common/ToastProvider";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { PhoneInput } from "@/components/clients/PhoneInput";
import { DuplicateWarningModal } from "@/components/clients/DuplicateWarningModal";
import { DuplicateMatch } from "@/lib/validation/duplicate-detector";
import { validateGstin, validatePincode, validateEmailFormat } from "@/lib/validation/client-validation";

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
  const formRef = useRef<HTMLFormElement>(null);
  const { success, error: toastError } = useToast();
  const [state, formAction, isPending] = useActionState(createClientAction, null);
  const handledStateRef = useRef<CreateClientState | null>(null);

  // Duplicate Warning Modal State
  const [isAdmin, setIsAdmin] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [isBlockedByEmail, setIsBlockedByEmail] = useState(false);
  const [isSubmittingOverride, startTransition] = useTransition();

  // Active step (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

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
  const [clientStatus, setClientStatus] = useState<"Active" | "Pending Onboarding" | "On Hold" | "Completed" | "Inactive">("Active");

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

    getCurrentUserProfileAction().then((p) => {
      if (p?.role === "admin") {
        setIsAdmin(true);
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
    } else if (state.hasDuplicates && state.duplicateMatches) {
      setDuplicateMatches(state.duplicateMatches);
      setIsBlockedByEmail(!!state.isBlockedByActiveEmail);
      setDuplicateModalOpen(true);
      if (state.error) {
        toastError("Duplicate client detected", state.error);
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

  // Step definition list
  const stepsList = [
    { id: 1, title: "Company", fullTitle: "1. Company Details", desc: "Enter company information", icon: Building2 },
    { id: 2, title: "Contact", fullTitle: "2. Primary Contact", desc: "Add primary contact for this client", icon: User },
    { id: 3, title: "Additional Contacts", fullTitle: "3. Additional Contacts", desc: "Add secondary and further contacts", icon: Users },
    { id: 4, title: "Billing & GST", fullTitle: "4. Billing Details & GST", desc: "Enter billing and GST information for invoicing", icon: Receipt },
    { id: 5, title: "Ownership", fullTitle: "5. Client Ownership", desc: "Ownership and association details", icon: UserCheck },
    { id: 6, title: "Status", fullTitle: "6. Client Status", desc: "Current status of the client", icon: ShieldCheck },
    { id: 7, title: "Introductory Notes", fullTitle: "7. Introductory Notes", desc: "Add any additional notes about the company", icon: FileText },
  ];

  // Validation before advancing
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!companyName.trim()) {
        toastError("Company Legal Name required", "Please enter the Company Legal Name before continuing.");
        return false;
      }
      if (!address.trim()) {
        toastError("Address required", "Please enter the Registered Address.");
        return false;
      }
      if (!city.trim()) {
        toastError("City required", "Please enter City.");
        return false;
      }
      if (!pincode.trim()) {
        toastError("PIN Code required", "Please enter PIN Code.");
        return false;
      }
      if (!validatePincode(pincode)) {
        toastError("Invalid PIN Code", "Please enter a valid 6-digit Indian PIN code.");
        return false;
      }
    }
    if (step === 2) {
      if (!contactPerson.trim()) {
        toastError("Full Name required", "Please enter the primary contact Full Name.");
        return false;
      }
      if (!phone.trim()) {
        toastError("Mobile Number required", "Please enter the Mobile Number.");
        return false;
      }
      if (email.trim() && !validateEmailFormat(email)) {
        toastError("Invalid Email Format", "Please enter a valid email address or leave it empty.");
        return false;
      }
    }
    if (step === 3) {
      for (let i = 0; i < additionalContacts.length; i++) {
        const contact = additionalContacts[i];
        if (contact.email && contact.email.trim() && !validateEmailFormat(contact.email)) {
          toastError(`Invalid Email in Contact #${i + 1}`, "Please enter a valid email format.");
          return false;
        }
      }
    }
    if (step === 4) {
      if (!isNotGstRegistered && gstin.trim()) {
        if (!validateGstin(gstin)) {
          toastError("Invalid GSTIN", "Please enter a valid 15-character GSTIN format (e.g. 29AAAAA0000A1Z5) or check 'Not GST-registered'.");
          return false;
        }
      }
      if (billingEmail.trim() && !validateEmailFormat(billingEmail)) {
        toastError("Invalid Billing Email", "Please enter a valid billing email address.");
        return false;
      }
    }
    if (step === 5) {
      if (!assignedSalesperson) {
        toastError("Salesperson Required", "Please select the salesperson who brought in the client.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Progress Gauge calculations
  const progressPercentage = Math.round((currentStep / 7) * 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercentage) / 100;

  // Admin Proceed Anyway Handler
  const handleProceedAnyway = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("allow_duplicate_override", "true");

    startTransition(async () => {
      await formAction(formData);
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20 font-sans">
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

      {state?.error && (
        <div className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs ${
          state.isBlockedByActiveEmail
            ? "bg-red-50 border-red-200 text-red-700"
            : state.hasDuplicates
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {state.isBlockedByActiveEmail ? (
            <ShieldAlert size={16} className="text-red-500 shrink-0" />
          ) : (
            <AlertTriangle size={16} className={state.hasDuplicates ? "text-amber-600 shrink-0" : "text-red-500 shrink-0"} />
          )}
          <span>{state.error}</span>
          {state.hasDuplicates && (
            <button
              type="button"
              onClick={() => setDuplicateModalOpen(true)}
              className="ml-auto underline font-bold cursor-pointer hover:opacity-80"
            >
              View Matches ({state.duplicateMatches?.length || 0})
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Form Card on Left, Progress Sidebar on Right */}
      <form ref={formRef} action={formAction}>
        {/* Hidden inputs to guarantee all state values submit regardless of active step */}
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
        <input type="hidden" name="salesperson_id" value={assignedSalesperson} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================================= */}
          {/* LEFT: The Single Form Card (shows only current step, replaces in place)   */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* ===================================================================== */}
              {/* 1. Company Details Step                                               */}
              {/* ===================================================================== */}
              <div className={currentStep === 1 ? "space-y-6" : "hidden"}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      1. Company Details
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Enter company information
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
                      <option value="Singapore">🇸🇬 Singapore</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom</option>
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
                      {ENTITY_STRUCTURES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Helpful Instruction Banner matching design */}
                <div className="bg-[#EBF5F8] border border-[#CDE5EC] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#0481A2]">
                  <Info size={16} className="shrink-0" />
                  <span>Please ensure all details are correct before moving to the next step.</span>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 2. Primary Contact Step                                               */}
              {/* ===================================================================== */}
              <div className={currentStep === 2 ? "space-y-6" : "hidden"}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      2. Primary Contact
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Add primary contact for this client
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

              {/* ===================================================================== */}
              {/* 3. Additional Contacts Step                                           */}
              {/* ===================================================================== */}
              <div className={currentStep === 3 ? "space-y-6" : "hidden"}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                        3. Additional Contacts
                      </h3>
                      <p className="text-xs text-slate-500 font-sans">
                        Add more contacts (e.g. directors, finance managers, coordinators)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2]/10 text-[#0481A2] hover:bg-[#0481A2]/20 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Contact</span>
                  </button>
                </div>

                {additionalContacts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs space-y-2">
                    <p className="font-medium text-slate-600">No additional contacts added yet</p>
                    <p className="text-[11px] text-slate-400">
                      Click the &ldquo;+ Add Contact&rdquo; button above to add directors, accounts, or operational contacts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {additionalContacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-3 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-xs">
                            Contact #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(contact.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(e) =>
                                handleUpdateContact(contact.id, "name", e.target.value)
                              }
                              placeholder="Contact Name"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Designation
                            </label>
                            <input
                              type="text"
                              value={contact.designation}
                              onChange={(e) =>
                                handleUpdateContact(contact.id, "designation", e.target.value)
                              }
                              placeholder="e.g. Finance Head"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={contact.phone}
                              onChange={(e) =>
                                handleUpdateContact(contact.id, "phone", e.target.value)
                              }
                              placeholder="+91 98765 00000"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) =>
                                handleUpdateContact(contact.id, "email", e.target.value)
                              }
                              placeholder="name@company.com"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===================================================================== */}
              {/* 4. Billing Details & GST Step                                         */}
              {/* ===================================================================== */}
              <div className={currentStep === 4 ? "space-y-6" : "hidden"}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                        4. Billing Details &amp; GST
                      </h3>
                      <p className="text-xs text-slate-500 font-sans">
                        Enter billing and GST information for invoicing
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyFromPrimary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>Copy from Primary</span>
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
                      placeholder="Legal Entity Name on Invoices"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
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
                      placeholder="e.g. Accounts Department"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
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
                      placeholder="Full billing address for GST invoices"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
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
                      placeholder="billing@acme.com"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-semibold text-slate-700">
                        GSTIN
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={isNotGstRegistered}
                          onChange={(e) => {
                            setIsNotGstRegistered(e.target.checked);
                            if (e.target.checked) setGstin("");
                          }}
                          className="rounded text-[#0481A2] focus:ring-[#0481A2] w-3.5 h-3.5"
                        />
                        <span>Not GST-registered</span>
                      </label>
                    </div>
                    <input
                      name="gstin"
                      type="text"
                      disabled={isNotGstRegistered}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder={isNotGstRegistered ? "Not GST Registered" : "29AAAAA0000A1Z5"}
                      maxLength={15}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs uppercase font-mono transition-colors ${
                        isNotGstRegistered
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-800 border-slate-300 focus:outline-none focus:border-[#0481A2]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 5. Client Ownership Step                                              */}
              {/* ===================================================================== */}
              <div className={currentStep === 5 ? "space-y-6" : "hidden"}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      5. Client Ownership
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Ownership and association details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Salesperson Who Brought In the Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignedSalesperson}
                      onChange={(e) => setAssignedSalesperson(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                    >
                      {salespeople.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Client Since
                    </label>
                    <input
                      name="client_since"
                      type="date"
                      value={clientSince}
                      onChange={(e) => setClientSince(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 6. Client Status Step                                                 */}
              {/* ===================================================================== */}
              <div className={currentStep === 6 ? "space-y-6" : "hidden"}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      6. Client Status
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Current status of the client
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block font-semibold text-slate-700 text-xs">
                    Account Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { value: "Active", label: "Active", desc: "Regular active client relationship" },
                      { value: "Pending Onboarding", label: "Pending Onboarding", desc: "Awaiting onboarding & agreement" },
                      { value: "On Hold", label: "On Hold", desc: "Temporarily paused relationship" },
                      { value: "Completed", label: "Completed", desc: "All projects successfully completed" },
                      { value: "Inactive", label: "Inactive", desc: "Dormant or archived account" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                          clientStatus === opt.value
                            ? "border-[#0481A2] bg-[#0481A2]/5 ring-1 ring-[#0481A2]"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="status_radio"
                          checked={clientStatus === opt.value}
                          onChange={() => setClientStatus(opt.value as any)}
                          className="mt-0.5 text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{opt.label}</div>
                          <div className="text-slate-500 text-[11px] leading-snug">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 7. Introductory Notes Step                                            */}
              {/* ===================================================================== */}
              <div className={currentStep === 7 ? "space-y-6" : "hidden"}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                      7. Introductory Notes
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Add any additional notes about the company
                    </p>
                  </div>
                </div>

                <div>
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

              {/* ===================================================================== */}
              {/* Action & Navigation Buttons at bottom of the Form Card                 */}
              {/* ===================================================================== */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                <div>
                  {currentStep === 1 ? (
                    <Link
                      href="/clients"
                      className="px-5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-2xs inline-block text-center cursor-pointer"
                    >
                      Cancel
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      ← Back: {stepsList[currentStep - 2]?.title}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="submit"
                    disabled={isPending || isSubmittingOverride}
                    onClick={() => setSubmitIntent("save")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#243E76] text-[#243E76] hover:bg-[#243E76]/10 font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isPending && submitIntent === "save" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    <span>Save Client</span>
                  </button>

                  {currentStep < 7 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Next: {stepsList[currentStep]?.title}</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isPending || isSubmittingOverride}
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
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: Client Registration Progress Sidebar                               */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6 sticky top-24">
              <h2 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                Client Registration Progress
              </h2>

              {/* Circular Progress Gauge */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#E2E8F0"
                      strokeWidth="8"
                    />
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
                    <span className="text-2xl font-bold font-number text-[#1B3260]">
                      {progressPercentage}%
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Complete</span>
                  </div>
                </div>
              </div>

              {/* Step Navigation List */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {stepsList.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.id <= currentStep || validateStep(currentStep)) {
                          setCurrentStep(step.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="flex items-center gap-3 w-full text-left group cursor-pointer transition-colors"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                          isActive
                            ? "bg-[#0481A2] text-white ring-4 ring-[#0481A2]/20"
                            : isCompleted
                            ? "bg-[#0481A2] text-white"
                            : "border-2 border-slate-300 text-slate-400 bg-white"
                        }`}
                      >
                        {isCompleted ? <Check size={12} className="stroke-[3]" /> : step.id}
                      </div>
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
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar & Status */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Step {currentStep} of 7</span>
                  <span className="text-[#0481A2] font-number">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0481A2] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Helper Card */}
              <div className="bg-[#EBF5F8] border border-[#CDE5EC] rounded-xl p-3 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  Add all required details to register the client
                </p>
              </div>
            </div>
          </div>
        </div>

      </form>

      {/* Duplicate Warning & Inspection Modal */}
      <DuplicateWarningModal
        isOpen={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        matches={duplicateMatches}
        isBlocked={isBlockedByEmail}
        isAdmin={isAdmin}
        onProceedAnyway={handleProceedAnyway}
        isSubmitting={isSubmittingOverride}
      />
    </div>
  );
}
