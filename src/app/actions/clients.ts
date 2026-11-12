"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
import { checkClientDuplicatesAction } from "./duplicate-detection";
import { DuplicateMatch } from "@/lib/validation/duplicate-detector";

export interface CreateClientState {
  error?: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  clientId?: string;
  hasDuplicates?: boolean;
  duplicateMatches?: DuplicateMatch[];
  isBlockedByActiveEmail?: boolean;
}

export async function createClientAction(
  prevState: CreateClientState | null,
  formData: FormData
): Promise<CreateClientState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to create a client." };
  }

  // Get current user's profile to verify role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  // Extract Form Data
  const company_name = (formData.get("company_name") as string)?.trim();
  const company_type = (formData.get("company_type") as string) || "Private Limited (Pvt Ltd)";
  const contact_person = (formData.get("contact_person") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const alternate_phone = (formData.get("alternate_phone") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || "India";
  const gst_number = (formData.get("gst_number") as string)?.trim().toUpperCase() || null;
  const pan_number = (formData.get("pan_number") as string)?.trim().toUpperCase() || null;
  const services_purchased = (formData.get("services_purchased") as string)?.trim() || "Company Registration";
  const notes = (formData.get("notes") as string)?.trim() || null;
  
  const rawContractVal = formData.get("contract_value") as string;
  const rawPaymentsRec = formData.get("payments_received") as string;
  const contract_value = rawContractVal !== "" && rawContractVal !== null ? parseFloat(rawContractVal) : 0;
  const payments_received = rawPaymentsRec !== "" && rawPaymentsRec !== null ? parseFloat(rawPaymentsRec) : 0;

  const fieldErrors: Record<string, string> = {};

  if (!company_name) {
    fieldErrors.company_name = "Company name is required.";
  }
  if (!contact_person) {
    fieldErrors.contact_person = "Contact person is required.";
  }
  if (!email) {
    fieldErrors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }

  // Validate Phone
  if (!phone) {
    fieldErrors.phone = "Primary phone number is required.";
  } else {
    const parsed = parseInitialPhone(phone);
    const phoneCheck = validatePhoneNumber(parsed.nationalNumber, parsed.country, true);
    if (!phoneCheck.isValid) {
      fieldErrors.phone = phoneCheck.error || "Invalid phone number.";
    }
  }

  // Validate Alternate Phone if provided
  if (alternate_phone) {
    const parsedAlt = parseInitialPhone(alternate_phone);
    const altCheck = validatePhoneNumber(parsedAlt.nationalNumber, parsedAlt.country, false);
    if (!altCheck.isValid) {
      fieldErrors.alternate_phone = altCheck.error || "Invalid alternate phone number.";
    }
  }

  // Commercial / Numeric Validations
  if (isNaN(contract_value) || contract_value < 0) {
    fieldErrors.contract_value = "Contract value cannot be negative.";
  }
  if (isNaN(payments_received) || payments_received < 0) {
    fieldErrors.payments_received = "Payments received cannot be negative.";
  } else if (contract_value > 0 && payments_received > contract_value) {
    fieldErrors.payments_received = `Payments received (₹${payments_received.toLocaleString()}) cannot exceed total contract value (₹${contract_value.toLocaleString()}).`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstErrorMessage = Object.values(fieldErrors)[0];
    return {
      error: firstErrorMessage,
      fieldErrors,
      success: false,
    };
  }

  // Feature 015: Duplicate Detection Check
  const allowDuplicateOverride = formData.get("allow_duplicate_override") === "true";
  const duplicateCheck = await checkClientDuplicatesAction({
    companyName: company_name,
    email,
    phone,
  });

  // Strict prevention: Duplicate email on an active client is NEVER permitted
  if (duplicateCheck.activeEmailMatch) {
    return {
      error: `A client with email "${email}" is already active in BRAND 360s CRM. Duplicate active client records with identical email are prevented.`,
      fieldErrors: {
        email: "This email address is already registered to an active client.",
      },
      hasDuplicates: true,
      duplicateMatches: duplicateCheck.matches,
      isBlockedByActiveEmail: true,
      success: false,
    };
  }

  // Non-blocking duplicate warning (Company name, phone, or archived email)
  if (duplicateCheck.hasMatches && !allowDuplicateOverride) {
    return {
      error: "Potential duplicate client detected matching company name, phone, or existing records. Please review.",
      hasDuplicates: true,
      duplicateMatches: duplicateCheck.matches,
      isBlockedByActiveEmail: false,
      success: false,
    };
  }

  const balance_receivable = Math.max(0, contract_value - payments_received);

  // If Admin, can assign to any employee selected; if Employee, always assign to self
  let assigned_salesperson = user.id;
  if (isAdmin) {
    const selectedSalesperson = formData.get("assigned_salesperson") as string;
    if (selectedSalesperson && selectedSalesperson.trim() !== "") {
      assigned_salesperson = selectedSalesperson.trim();
    }
  }

  // Determine Payment Status
  let payment_status: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
  if (contract_value > 0 && balance_receivable === 0) {
    payment_status = "Paid in full";
  } else if (payments_received > 0) {
    payment_status = "Partially Paid";
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      company_name,
      company_type,
      contact_person,
      email,
      phone,
      alternate_phone,
      website,
      address,
      city,
      state,
      pincode,
      country,
      gst_number,
      pan_number,
      services_purchased,
      contract_value,
      payments_received,
      balance_receivable,
      next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
      payment_status,
      assigned_salesperson,
      created_by: user.id,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, clientId: data.id };
}

export async function fetchClientsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select(`
      *,
      assigned_profile:profiles!assigned_salesperson(full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }

  return data;
}

export async function fetchSalespeopleAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .order("full_name");

  if (error) {
    console.error("Error fetching salespeople:", error);
    return [];
  }

  return data || [];
}
