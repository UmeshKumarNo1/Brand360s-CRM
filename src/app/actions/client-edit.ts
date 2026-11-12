"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
import { checkClientDuplicatesAction } from "./duplicate-detection";

export interface ClientFormState {
  error?: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  clientId?: string;
}

export async function updateClientAction(
  prevState: ClientFormState | null,
  formData: FormData
): Promise<ClientFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to update a client." };
  }

  // Verify role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  const clientId = formData.get("client_id") as string;
  if (!clientId) {
    return { error: "Missing Client ID." };
  }

  // Fetch the existing client to guarantee we preserve existing values and verify ownership
  const { data: existingClient, error: fetchError } = await supabase
    .from("clients")
    .select("assigned_salesperson, created_by, contract_value, payments_received")
    .eq("id", clientId)
    .single();

  if (fetchError || !existingClient) {
    return { error: "Client not found or could not be loaded." };
  }

  // Authorization check: Non-admin can only edit if assigned or creator
  if (!isAdmin) {
    if (
      existingClient.assigned_salesperson !== user.id &&
      existingClient.created_by !== user.id
    ) {
      return { error: "You are not authorized to edit this client record." };
    }
  }

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
  const client_status = (formData.get("client_status") as string) || "Active";
  const notes = (formData.get("notes") as string)?.trim() || null;
  
  const rawContractVal = formData.get("contract_value") as string;
  const rawPaymentsRec = formData.get("payments_received") as string;
  const contract_value = rawContractVal !== "" && rawContractVal !== null ? parseFloat(rawContractVal) : 0;
  const payments_received = rawPaymentsRec !== "" && rawPaymentsRec !== null ? parseFloat(rawPaymentsRec) : 0;
  
  const next_payment_due_date = (formData.get("next_payment_due_date") as string) || null;

  const fieldErrors: Record<string, string> = {};

  // Validations
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

  // Feature 015: Duplicate detection when updating email
  const duplicateCheck = await checkClientDuplicatesAction({
    companyName: company_name,
    email,
    phone,
    excludeClientId: clientId,
  });

  if (duplicateCheck.activeEmailMatch) {
    return {
      error: `Another active client with email "${email}" already exists.`,
      fieldErrors: {
        email: "This email address is already registered to another active client.",
      },
      success: false,
    };
  }

  const balance_receivable = Math.max(0, contract_value - payments_received);

  // Determine Payment Status
  let payment_status: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
  const formPaymentStatus = formData.get("payment_status") as string;
  if (formPaymentStatus) {
    payment_status = formPaymentStatus as any;
  } else if (contract_value > 0 && balance_receivable === 0) {
    payment_status = "Paid in full";
  } else if (payments_received > 0) {
    payment_status = "Partially Paid";
  }

  const updatePayload: Record<string, any> = {
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
    client_status,
    contract_value,
    payments_received,
    balance_receivable,
    next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
    next_payment_due_date,
    payment_status,
    notes,
    updated_at: new Date().toISOString(),
  };

  // Salesperson assignment logic:
  // Strictly protect assigned_salesperson from being unintentionally overwritten or reset!
  if (isAdmin) {
    const selectedSalesperson = formData.get("assigned_salesperson") as string;
    // Only update if explicitly provided and not empty
    if (selectedSalesperson && selectedSalesperson.trim() !== "") {
      updatePayload.assigned_salesperson = selectedSalesperson.trim();
    } else {
      // If untouched or omitted, preserve existing assignment
      updatePayload.assigned_salesperson = existingClient.assigned_salesperson;
    }
  } else {
    // Non-admin can NEVER reassign salesperson; explicitly lock to existing
    updatePayload.assigned_salesperson = existingClient.assigned_salesperson;
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (updateError) {
    return { error: updateError.message, success: false };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  revalidatePath("/clients");
  revalidatePath("/dashboard");

  return { success: true, clientId };
}

export async function fetchClientByIdAction(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select(`
      *,
      assigned_profile:profiles!assigned_salesperson(id, full_name, email, role, is_active)
    `)
    .eq("id", clientId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
