"use client";

import { useActionState, useEffect, useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Layers,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { createClientAction, fetchSalespeopleAction, CreateClientState } from "@/app/actions/clients";
import { fetchServicesCatalogAction } from "@/app/actions/services";
import { BRAND360_CATEGORIES } from "@/lib/services/service-catalogue-master";
import { formatINR } from "@/lib/utils";
import { fetchProspectFollowupByIdAction } from "@/app/actions/prospect-followups";
import { useToast } from "@/components/common/ToastProvider";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { PhoneInput } from "@/components/clients/PhoneInput";
import { DuplicateWarningModal } from "@/components/clients/DuplicateWarningModal";
import { DuplicateMatch } from "@/lib/validation/duplicate-detector";
import { validateGstin, validatePincode, validateEmailFormat } from "@/lib/validation/client-validation";
import { parseInitialPhone, validatePhoneNumber, CountryCode } from "@/lib/validation/phone";
import { ALL_COUNTRIES, COUNTRY_NAME_TO_CODE } from "@/lib/data/countries";
import { lookupPincodeAction } from "@/app/actions/pincode";

interface AdditionalContact {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
}

interface InitialServiceItem {
  id: string;
  service_name: string;
  service_category: string;
  service_fee: number;
  govt_fee: number;
  tax_rate: number;
  assigned_employee_id: string;
  expected_completion_date: string;
  notes?: string;
  is_renewable?: boolean;
  renewal_frequency?: string;
  renewal_duration_months?: number;
  renewal_amount?: number;
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
  const searchParams = useSearchParams();
  const fromProspectId = searchParams.get("fromProspect");
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
  const [clientStatus, setClientStatus] = useState<string>("Active");

  // 7. Notes
  const [notes, setNotes] = useState("");

  // 8. Services
  const [initialServices, setInitialServices] = useState<InitialServiceItem[]>([]);
  const [catalogList, setCatalogList] = useState<any[]>([]);

  // 9. Follow-up
  const [scheduleFollowup, setScheduleFollowup] = useState(false);
  const [followupTitle, setFollowupTitle] = useState("");
  const [followupType, setFollowupType] = useState("Call");
  const [followupDueDate, setFollowupDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [followupDueTime, setFollowupDueTime] = useState("10:00");
  const [followupPriority, setFollowupPriority] = useState("Medium");
  const [followupAssignedTo, setFollowupAssignedTo] = useState("");
  const [followupContactMethod, setFollowupContactMethod] = useState("Phone");
  const [followupNotes, setFollowupNotes] = useState("");

  // Helper working date calculation
  const getDefaultWorkingDate = () => {
    const d = new Date();
    let added = 0;
    while (added < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        added++;
      }
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleAddInitialService = (preset?: any) => {
    const newService: InitialServiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      service_name: preset?.name || "",
      service_category: preset?.category || "Business Registration",
      service_fee: Number(preset?.default_service_fee) || 0,
      govt_fee: Number(preset?.default_govt_fee) || 0,
      tax_rate: 18,
      assigned_employee_id: assignedSalesperson || (salespeople[0]?.id ?? ""),
      expected_completion_date: getDefaultWorkingDate(),
      is_renewable: !!preset?.is_renewable,
      renewal_frequency: preset?.renewal_frequency || "Annually",
      renewal_duration_months: preset?.renewal_duration_months || 12,
      renewal_amount: Number(preset?.default_renewal_amount) || Number(preset?.default_service_fee) || 0,
    };
    setInitialServices((prev) => [...prev, newService]);
  };

  const handleUpdateInitialService = (id: string, field: keyof InitialServiceItem, value: any) => {
    setInitialServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveInitialService = (id: string) => {
    setInitialServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSelectCatalogItem = (serviceId: string, catalogItemName: string) => {
    const matched = catalogList.find((c) => c.name === catalogItemName);
    if (!matched) return;
    setInitialServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              service_name: matched.name,
              service_category: matched.category || s.service_category,
              service_fee: Number(matched.default_service_fee) || 0,
              govt_fee: Number(matched.default_govt_fee) || 0,
              is_renewable: !!matched.is_renewable,
              renewal_frequency: matched.renewal_frequency || "Annually",
              renewal_duration_months: matched.renewal_duration_months || 12,
              renewal_amount: Number(matched.default_renewal_amount) || Number(matched.default_service_fee) || 0,
            }
          : s
      )
    );
  };

  // Prefill from prospect when converting from /follow-ups
  useEffect(() => {
    if (!fromProspectId) return;
    fetchProspectFollowupByIdAction(fromProspectId).then((prospect) => {
      if (!prospect) return;
      if (prospect.convertedClientId) {
        toastError("Already Converted", "This prospect has already been converted to a client.");
        router.replace(`/clients/${prospect.convertedClientId}`);
        return;
      }
      if (prospect.companyName) setCompanyName(prospect.companyName);
      if (prospect.contactPerson) setContactPerson(prospect.contactPerson);
      if (prospect.phone) setPhone(prospect.phone);
      if (prospect.notes) setNotes(prospect.notes);
      if (prospect.assignedToId) setAssignedSalesperson(prospect.assignedToId);
    });
  }, [fromProspectId, router, toastError]);

  // Submit Intent: "save" (default) or "save_and_add_service"
  const [submitIntent, setSubmitIntent] = useState<"save" | "save_and_add_service">("save");
  const submitIntentRef = useRef<"save" | "save_and_add_service">("save");
  const [stepError, setStepError] = useState<string | null>(null);
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);

  // Handle PIN Code change and auto-fill City, State, Country
  const handlePincodeChange = async (val: string) => {
    setPincode(val);
    const clean = val.replace(/\D/g, "");
    if (clean.length === 6) {
      setIsLookingUpPincode(true);
      try {
        const res = await lookupPincodeAction(clean);
        if (res.success) {
          if (res.city) setCity(res.city);
          if (res.state) setStateName(res.state);
          if (res.country) setCountry(res.country);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsLookingUpPincode(false);
      }
    }
  };

  // Load Salespeople and Services Catalog
  useEffect(() => {
    fetchSalespeopleAction().then((data) => {
      setSalespeople(data || []);
      if (data && data.length > 0 && !assignedSalesperson) {
        setAssignedSalesperson(data[0].id);
      }
    });

    fetchServicesCatalogAction().then((data) => {
      setCatalogList(data || []);
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
      if (submitIntentRef.current === "save_and_add_service") {
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
    { id: 8, title: "Services", fullTitle: "8. Services", desc: "Assign initial services", icon: Layers },
    { id: 9, title: "Follow-up", fullTitle: "9. Follow-up", desc: "Schedule an initial follow-up", icon: Calendar },
  ];

  // Validation before advancing
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!companyName.trim()) {
        const errMsg = "Please enter the Company Legal Name before continuing.";
        setStepError(errMsg);
        toastError("Company Legal Name required", errMsg);
        return false;
      }
      if (!address.trim()) {
        const errMsg = "Please enter the Registered Address.";
        setStepError(errMsg);
        toastError("Address required", errMsg);
        return false;
      }
      if (!city.trim()) {
        const errMsg = "Please enter City.";
        setStepError(errMsg);
        toastError("City required", errMsg);
        return false;
      }
      if (!pincode.trim()) {
        const errMsg = "Please enter PIN Code.";
        setStepError(errMsg);
        toastError("PIN Code required", errMsg);
        return false;
      }
      const pinCheck = validatePincode(pincode);
      if (!pinCheck.isValid) {
        const errMsg = pinCheck.error || "Please enter a valid 6-digit Indian PIN code.";
        setStepError(errMsg);
        toastError("Invalid PIN Code", errMsg);
        return false;
      }
    }
    if (step === 2) {
      if (!contactPerson.trim()) {
        const errMsg = "Please enter the primary contact Full Name.";
        setStepError(errMsg);
        toastError("Full Name required", errMsg);
        return false;
      }
      if (!phone.trim()) {
        const errMsg = "Please enter the Mobile Number.";
        setStepError(errMsg);
        toastError("Mobile Number required", errMsg);
        return false;
      }
      const defaultCountry: CountryCode = COUNTRY_NAME_TO_CODE[country] || "IN";
      const parsed = parseInitialPhone(phone, defaultCountry);
      const phoneCheck = validatePhoneNumber(parsed.nationalNumber, parsed.country, true);
      if (!phoneCheck.isValid) {
        const errMsg = phoneCheck.error || "Invalid mobile number.";
        setStepError(errMsg);
        toastError("Invalid Mobile Number", errMsg);
        return false;
      }
      if (alternatePhone.trim()) {
        const parsedAlt = parseInitialPhone(alternatePhone, defaultCountry);
        const altCheck = validatePhoneNumber(parsedAlt.nationalNumber, parsedAlt.country, false);
        if (!altCheck.isValid) {
          const errMsg = altCheck.error || "Invalid alternate mobile number.";
          setStepError(errMsg);
          toastError("Invalid Alternate Phone", errMsg);
          return false;
        }
      }
      if (email.trim()) {
        const emailCheck = validateEmailFormat(email);
        if (!emailCheck.isValid) {
          const errMsg = emailCheck.error || "Please enter a valid email address or leave it empty.";
          setStepError(errMsg);
          toastError("Invalid Email Format", errMsg);
          return false;
        }
      }
    }
    if (step === 3) {
      for (let i = 0; i < additionalContacts.length; i++) {
        const contact = additionalContacts[i];
        if (contact.email && contact.email.trim()) {
          const emailCheck = validateEmailFormat(contact.email);
          if (!emailCheck.isValid) {
            const errMsg = `Contact #${i + 1}: ${emailCheck.error || "Please enter a valid email format."}`;
            setStepError(errMsg);
            toastError(`Invalid Email in Contact #${i + 1}`, errMsg);
            return false;
          }
        }
        if (contact.phone && contact.phone.trim()) {
          const parsedContact = parseInitialPhone(contact.phone, "IN");
          const phoneCheck = validatePhoneNumber(parsedContact.nationalNumber, parsedContact.country, false);
          if (!phoneCheck.isValid) {
            const errMsg = `Contact #${i + 1}: ${phoneCheck.error || "Invalid phone number."}`;
            setStepError(errMsg);
            toastError(`Invalid Phone in Contact #${i + 1}`, errMsg);
            return false;
          }
        }
      }
    }
    if (step === 4) {
      if (!isNotGstRegistered && gstin.trim()) {
        const gstCheck = validateGstin(gstin);
        if (!gstCheck.isValid) {
          const errMsg = gstCheck.error || "Please enter a valid 15-character GSTIN format (e.g. 29AAAAA0000A1Z5) or check 'Not GST-registered'.";
          setStepError(errMsg);
          toastError("Invalid GSTIN", errMsg);
          return false;
        }
      }
      if (billingEmail.trim()) {
        const billingCheck = validateEmailFormat(billingEmail);
        if (!billingCheck.isValid) {
          const errMsg = billingCheck.error || "Please enter a valid billing email address.";
          setStepError(errMsg);
          toastError("Invalid Billing Email", errMsg);
          return false;
        }
      }
    }
    if (step === 5) {
      if (!assignedSalesperson) {
        const errMsg = "Please select the salesperson who brought in the client.";
        setStepError(errMsg);
        toastError("Salesperson Required", errMsg);
        return false;
      }
    }
    if (step === 8) {
      for (let i = 0; i < initialServices.length; i++) {
        const s = initialServices[i];
        if (!s.service_name.trim()) {
          const errMsg = `Service #${i + 1}: Please enter a Service Name or remove this service.`;
          setStepError(errMsg);
          toastError(`Service #${i + 1} Name Required`, errMsg);
          return false;
        }
      }
    }
    if (step === 9) {
      if (scheduleFollowup) {
        if (!followupTitle.trim()) {
          const errMsg = "Please enter a follow-up title or uncheck the follow-up box.";
          setStepError(errMsg);
          toastError("Follow-up Title Required", errMsg);
          return false;
        }
        if (!followupDueDate) {
          const errMsg = "Please select a due date for the follow-up.";
          setStepError(errMsg);
          toastError("Due Date Required", errMsg);
          return false;
        }
      }
    }
    setStepError(null);
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setStepError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 9));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    for (let s = 1; s <= 9; s++) {
      if (!validateStep(s)) {
        e.preventDefault();
        setCurrentStep(s);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
  };

  // Progress Gauge calculations: Starts at 0% on Step 1, scales to 100% on Step 9
  const progressPercentage = Math.round(((currentStep - 1) / 8) * 100);
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

      {(stepError || state?.error) && (
        <div className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs ${
          state?.isBlockedByActiveEmail
            ? "bg-red-50 border-red-200 text-red-700"
            : state?.hasDuplicates
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {state?.isBlockedByActiveEmail ? (
            <ShieldAlert size={16} className="text-red-500 shrink-0" />
          ) : (
            <AlertTriangle size={16} className={state?.hasDuplicates ? "text-amber-600 shrink-0" : "text-red-500 shrink-0"} />
          )}
          <span>{stepError || state?.error}</span>
          {state?.hasDuplicates && (
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
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleFormSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            if (currentStep < 9) {
              handleNextStep();
            }
          }
        }}
      >
        {/* Hidden inputs to guarantee all state values submit regardless of active step */}
        {fromProspectId && (
          <input type="hidden" name="from_prospect_id" value={fromProspectId} />
        )}
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
        <input
          type="hidden"
          name="initial_services"
          value={JSON.stringify(
            initialServices.filter((s) => s.service_name.trim().length > 0)
          )}
        />
        <input
          type="hidden"
          name="initial_followup"
          value={
            scheduleFollowup && followupTitle.trim()
              ? JSON.stringify({
                  title: followupTitle.trim(),
                  follow_up_type: followupType,
                  due_date: followupDueDate,
                  due_time: followupDueTime || null,
                  priority: followupPriority,
                  assigned_to: followupAssignedTo || assignedSalesperson,
                  notes: followupNotes.trim() || null,
                  contact_method: followupContactMethod,
                })
              : ""
          }
        />

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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-semibold text-slate-700">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        {isLookingUpPincode && (
                          <span className="text-[10px] text-[#0481A2] font-medium flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" />
                            <span>Auto-filling...</span>
                          </span>
                        )}
                      </div>
                      <input
                        name="pincode"
                        type="text"
                        value={pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
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
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
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
                    <PhoneInput
                      label="Mobile Number"
                      name="phone"
                      required
                      value={phone}
                      onChange={(val) => {
                        setPhone(val);
                        if (stepError) setStepError(null);
                      }}
                      defaultCountry={COUNTRY_NAME_TO_CODE[country] || "IN"}
                    />
                  </div>

                  <div>
                    <PhoneInput
                      label="Alternate Mobile Number"
                      name="alternate_phone"
                      required={false}
                      value={alternatePhone}
                      onChange={(val) => {
                        setAlternatePhone(val);
                        if (stepError) setStepError(null);
                      }}
                      defaultCountry={COUNTRY_NAME_TO_CODE[country] || "IN"}
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
                      { value: "Active", label: "Active", desc: "Regular active client relationship." },
                      { value: "Pending Onboarding", label: "Pending Onboarding", desc: "Awaiting onboarding and agreement." },
                      { value: "Documentation in Progress", label: "Documentation in Progress", desc: "Required documents are being collected, prepared or verified." },
                      { value: "Work in Progress", label: "Work in Progress", desc: "Service execution and process-related activities are currently underway." },
                      { value: "Awaiting External Approval", label: "Awaiting External Approval", desc: "Pending approval from government authorities or third-party agencies." },
                      { value: "Awaiting Professional Review", label: "Awaiting Professional Review", desc: "Documentation or application is awaiting review by a CA or Advocate." },
                      { value: "Completed – Professional Review", label: "Completed – Professional Review", desc: "Review and verification completed by the assigned CA or Advocate." },
                      { value: "On Hold", label: "On Hold", desc: "Temporarily paused due to pending information, approval or client decision." },
                      { value: "Completed", label: "Completed", desc: "All agreed services and deliverables successfully completed." },
                      { value: "Inactive", label: "Inactive", desc: "Dormant or archived client account." },
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
              {/* 8. Services Step                                                     */}
              {/* ===================================================================== */}
              <div className={currentStep === 8 ? "space-y-6" : "hidden"}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                          8. Services
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-sans">
                        Assign initial services for this client
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddInitialService()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0481A2]/10 text-[#0481A2] hover:bg-[#0481A2]/20 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Service</span>
                  </button>
                </div>

                <div className="bg-[#EBF5F8] border border-[#CDE5EC] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#0481A2]">
                  <Info size={16} className="shrink-0" />
                  <span>You can add one or more services right now, or proceed and assign services later from the client&apos;s workspace.</span>
                </div>

                {initialServices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Layers size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700">No services added yet</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Click &ldquo;+ Add Service&rdquo; above to assign a service from the catalog, or click &ldquo;Next: Follow-up&rdquo; to skip.
                      </p>
                    </div>
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddInitialService()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add a Service</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {initialServices.map((service, index) => (
                      <div
                        key={service.id}
                        className="p-5 bg-slate-50/70 border border-slate-200/90 rounded-2xl space-y-4 relative"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                              Service #{index + 1}
                            </span>
                            {service.service_name && (
                              <span className="text-xs font-semibold text-[#0481A2] truncate max-w-[200px] sm:max-w-xs">
                                {service.service_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Catalog Quick Selector */}
                            {catalogList.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSelectCatalogItem(service.id, e.target.value);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-[#0481A2]"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  ⚡ Auto-fill from Catalog...
                                </option>
                                {catalogList.map((catItem) => (
                                  <option key={catItem.id} value={catItem.name}>
                                    {catItem.name} {catItem.default_service_fee ? `(₹${catItem.default_service_fee.toLocaleString("en-IN")})` : ""}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveInitialService(service.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove service"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs text-slate-700">
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">
                              Service Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={service.service_name}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "service_name", e.target.value)
                              }
                              placeholder="e.g. Private Limited Company Registration"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Category
                            </label>
                            <select
                              value={service.service_category}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "service_category", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            >
                              {BRAND360_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Professional Fee (₹)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={service.service_fee || ""}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "service_fee", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-number focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Government Fee (₹)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={service.govt_fee || ""}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "govt_fee", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-number focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Total Service Value
                            </label>
                            <div className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-xs font-bold text-slate-800 font-number">
                              {formatINR((Number(service.service_fee) || 0) + (Number(service.govt_fee) || 0))}
                            </div>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Assign Employee
                            </label>
                            <select
                              value={service.assigned_employee_id || assignedSalesperson}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "assigned_employee_id", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                            >
                              {salespeople.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.full_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Target Completion Date
                            </label>
                            <input
                              type="date"
                              value={service.expected_completion_date}
                              onChange={(e) =>
                                handleUpdateInitialService(service.id, "expected_completion_date", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-number focus:outline-none focus:border-[#0481A2]"
                            />
                          </div>

                          <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={!!service.is_renewable}
                                onChange={(e) =>
                                  handleUpdateInitialService(service.id, "is_renewable", e.target.checked)
                                }
                                className="rounded text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                              />
                              <span>Renewable Service</span>
                            </label>
                          </div>

                          {service.is_renewable && (
                            <div className="sm:col-span-2 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                  Renewal Frequency
                                </label>
                                <select
                                  value={service.renewal_frequency || "Annually"}
                                  onChange={(e) =>
                                    handleUpdateInitialService(service.id, "renewal_frequency", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2]"
                                >
                                  <option value="Monthly">Monthly (1 Month)</option>
                                  <option value="Quarterly">Quarterly (3 Months)</option>
                                  <option value="Half-Yearly">Half-Yearly (6 Months)</option>
                                  <option value="Annually">Annually (12 Months)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                  Renewal Cycle Fee (₹)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={service.renewal_amount || ""}
                                  onChange={(e) =>
                                    handleUpdateInitialService(service.id, "renewal_amount", parseFloat(e.target.value) || 0)
                                  }
                                  placeholder="Same as fee"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-number focus:outline-none focus:border-[#0481A2]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddInitialService()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Another Service</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ===================================================================== */}
              {/* 9. Follow-up Step                                                    */}
              {/* ===================================================================== */}
              <div className={currentStep === 9 ? "space-y-6" : "hidden"}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0481A2]/10 text-[#0481A2] flex items-center justify-center shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-heading font-bold text-base text-[#1B3260]">
                          9. Follow-up
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-sans">
                        Schedule an initial follow-up task for this client
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#EBF5F8] border border-[#CDE5EC] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#0481A2]">
                  <Info size={16} className="shrink-0" />
                  <span>You can set a reminder for a welcome call, document collection, or proposal review now, or complete registration.</span>
                </div>

                <div className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleFollowup}
                        onChange={(e) => {
                          setScheduleFollowup(e.target.checked);
                          if (e.target.checked && !followupTitle) {
                            setFollowupTitle("Introductory Call & Document Verification");
                          }
                        }}
                        className="rounded text-[#0481A2] focus:ring-[#0481A2] w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 text-xs">
                        Schedule an initial follow-up for this client
                      </span>
                    </label>

                    {scheduleFollowup && (
                      <span className="text-[11px] font-semibold text-[#0481A2] bg-[#0481A2]/10 px-2.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  {scheduleFollowup ? (
                    <div className="space-y-4 pt-1">
                      {/* Quick Title Presets */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                          Quick Presets
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Introductory Call & Welcome",
                            "Document Collection",
                            "Proposal & Scope Review",
                            "Payment Discussion",
                            "Agreement Sign-off",
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setFollowupTitle(preset)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                followupTitle === preset
                                  ? "bg-[#0481A2] text-white border-[#0481A2]"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                        <div className="md:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Follow-up Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={followupTitle}
                            onChange={(e) => setFollowupTitle(e.target.value)}
                            placeholder="e.g. Introductory Call & Document Verification"
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Follow-up Type
                          </label>
                          <select
                            value={followupType}
                            onChange={(e) => setFollowupType(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                          >
                            <option value="Call">Phone Call</option>
                            <option value="Email">Email</option>
                            <option value="Meeting">Meeting / Consultation</option>
                            <option value="Document Collection">Document Collection</option>
                            <option value="Payment Reminder">Payment Reminder</option>
                            <option value="General">General Follow-up</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Priority
                          </label>
                          <select
                            value={followupPriority}
                            onChange={(e) => setFollowupPriority(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                          >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Due Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={followupDueDate}
                            onChange={(e) => setFollowupDueDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Due Time
                          </label>
                          <input
                            type="time"
                            value={followupDueTime}
                            onChange={(e) => setFollowupDueTime(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] font-number transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Assign Follow-up To
                          </label>
                          <select
                            value={followupAssignedTo || assignedSalesperson}
                            onChange={(e) => setFollowupAssignedTo(e.target.value)}
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
                            Contact Method
                          </label>
                          <select
                            value={followupContactMethod}
                            onChange={(e) => setFollowupContactMethod(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                          >
                            <option value="Phone">Phone Call</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="In-Person">In-Person Meeting</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1.5">
                            Follow-up Instructions / Notes
                          </label>
                          <textarea
                            rows={2}
                            value={followupNotes}
                            onChange={(e) => setFollowupNotes(e.target.value)}
                            placeholder="Any specific talking points or required documents to discuss..."
                            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:border-[#0481A2] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No follow-up will be scheduled. Check the box above if you want to set an initial follow-up.
                    </div>
                  )}
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
                  {currentStep < 9 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>
                        Next: {stepsList[currentStep]?.title}
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isPending || isSubmittingOverride}
                      onClick={() => {
                        submitIntentRef.current = "save";
                        setSubmitIntent("save");
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0481A2] hover:bg-[#036c88] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Complete &amp; Save Client</span>
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
                        if (step.id < currentStep) {
                          setStepError(null);
                          setCurrentStep(step.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } else if (step.id > currentStep) {
                          for (let s = currentStep; s < step.id; s++) {
                            if (!validateStep(s)) {
                              setCurrentStep(s);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                              return;
                            }
                          }
                          setStepError(null);
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs transition-colors truncate ${
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

              {/* Progress Bar & Status */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Step {currentStep} of 9</span>
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
                  {currentStep <= 6
                    ? "Add required details to register the client"
                    : currentStep === 7
                    ? "Add introductory notes"
                    : currentStep === 8
                    ? "Assign initial services if needed or continue"
                    : "Schedule follow-up if needed or complete"}
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
