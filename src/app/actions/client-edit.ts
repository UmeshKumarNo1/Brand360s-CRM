"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validatePhoneNumber, parseInitialPhone } from "@/lib/validation/phone";
import { checkClientDuplicatesAction } from "./duplicate-detection";
import {
  validateGstin,
  validatePan,
  validatePincode,
  validateEmailFormat,
} from "@/lib/validation/client-validation";
import { recordAuditLog } from "@/lib/audit/audit-logger";

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
    return { error: "Authentication required to update a client.", success: false };
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
    return { error: "Missing Client ID.", success: false };
  }

  // Fetch the existing client to guarantee we preserve existing values and verify ownership
  const { data: existingClient, error: fetchError } = await supabase
    .from("clients")
    .select("assigned_salesperson, created_by, contract_value, payments_received")
    .eq("id", clientId)
    .single();

  if (fetchError || !existingClient) {
    return { error: "Client not found or could not be loaded.", success: false };
  }

  // Authorization check: Non-admin can only edit if assigned or creator
  if (!isAdmin) {
    if (
      existingClient.assigned_salesperson !== user.id &&
      existingClient.created_by !== user.id
    ) {
      return { error: "You are not authorized to edit this client record.", success: false };
    }
  }

  // Extract Form Data
  const company_name = (formData.get("company_name") as string)?.trim();
  const trade_name = (formData.get("trade_name") as string)?.trim() || null;
  const company_type = (formData.get("company_type") as string) || "Private Limited (Pvt Ltd)";
  const contact_person = (formData.get("contact_person") as string)?.trim();
  const designation = (formData.get("designation") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim();
  const alternate_phone = (formData.get("alternate_phone") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || "India";

  // Additional contacts
  let additional_contacts: any[] = [];
  try {
    const rawContacts = formData.get("additional_contacts") as string;
    if (rawContacts) {
      additional_contacts = JSON.parse(rawContacts);
    }
  } catch (err) {
    console.error("Error parsing contacts in edit:", err);
  }

  // Billing Details & GST
  const billing_name = (formData.get("billing_name") as string)?.trim() || null;
  const billing_address = (formData.get("billing_address") as string)?.trim() || null;
  const billing_contact = (formData.get("billing_contact") as string)?.trim() || null;
  const billing_email = (formData.get("billing_email") as string)?.trim() || null;
  const is_not_gst_registered = formData.get("is_not_gst_registered") === "true";
  const raw_gst_number = (formData.get("gstin") as string || formData.get("gst_number") as string)?.trim().toUpperCase() || null;
  const gst_number = is_not_gst_registered ? "Not GST-registered" : raw_gst_number;
  const pan_number = (formData.get("pan_number") as string)?.trim().toUpperCase() || null;

  const services_purchased = (formData.get("services_purchased") as string)?.trim() || "Company Registration";
  const client_status = (formData.get("client_status") as string) || "Active";
  const client_since = (formData.get("client_since") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  
  const rawContractVal = formData.get("contract_value") as string;
  const rawPaymentsRec = formData.get("payments_received") as string;
  const contract_value = rawContractVal !== "" && rawContractVal !== null && !isNaN(Number(rawContractVal)) ? parseFloat(rawContractVal) : 0;
  const payments_received = rawPaymentsRec !== "" && rawPaymentsRec !== null && !isNaN(Number(rawPaymentsRec)) ? parseFloat(rawPaymentsRec) : 0;
  const balance_receivable = Math.max(0, contract_value - payments_received);
  const next_payment_due_date = (formData.get("next_payment_due_date") as string) || null;

  const fieldErrors: Record<string, string> = {};

  // Validations
  if (!company_name) {
    fieldErrors.company_name = "Company name is required.";
  }
  if (!contact_person) {
    fieldErrors.contact_person = "Contact person is required.";
  }
  if (!phone) {
    fieldErrors.phone = "Primary phone number is required.";
  } else {
    try {
      const parsed = parseInitialPhone(phone);
      const phoneCheck = validatePhoneNumber(parsed.nationalNumber, parsed.country, true);
      if (!phoneCheck.isValid) {
        fieldErrors.phone = phoneCheck.error || "Invalid phone number.";
      }
    } catch {}
  }

  if (email) {
    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.isValid) {
      fieldErrors.email = emailCheck.error || "Please enter a valid email address.";
    }
  }

  if (pincode) {
    const pinCheck = validatePincode(pincode);
    if (!pinCheck.isValid) {
      fieldErrors.pincode = pinCheck.error || "PIN Code must be a 6-digit number.";
    }
  }

  if (!is_not_gst_registered && raw_gst_number) {
    const gstCheck = validateGstin(raw_gst_number);
    if (!gstCheck.isValid) {
      fieldErrors.gstin = gstCheck.error || "Invalid GSTIN format.";
    }
  }

  if (pan_number) {
    const panCheck = validatePan(pan_number);
    if (!panCheck.isValid) {
      fieldErrors.pan_number = panCheck.error || "Invalid PAN format.";
    }
  }

  if (billing_email) {
    const billingEmailCheck = validateEmailFormat(billing_email);
    if (!billingEmailCheck.isValid) {
      fieldErrors.billing_email = billingEmailCheck.error || "Invalid billing email address.";
    }
  }

  // Role check: non-admins cannot archive via general edit
  if (!isAdmin && client_status === "Archived") {
    fieldErrors.client_status = "Employees cannot archive client records. Please request an Administrator.";
  }

  if (alternate_phone) {
    try {
      const parsedAlt = parseInitialPhone(alternate_phone);
      const altCheck = validatePhoneNumber(parsedAlt.nationalNumber, parsedAlt.country, false);
      if (!altCheck.isValid) {
        fieldErrors.alternate_phone = altCheck.error || "Invalid alternate phone number.";
      }
    } catch {}
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
    tradeName: trade_name,
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
  // Determine Payment Status
  let payment_status: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
  if (contract_value > 0 && balance_receivable === 0) {
    payment_status = "Paid in full";
  } else if (payments_received > 0) {
    payment_status = "Partially Paid";
  }

  // Construct update payload
  const updatePayload: Record<string, any> = {
    company_name,
    trade_name,
    company_type,
    contact_person,
    designation,
    email: email || null,
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
    is_not_gst_registered,
    billing_name,
    billing_address,
    billing_contact,
    billing_email,
    additional_contacts,
    client_status,
    services_purchased,
    contract_value,
    payments_received,
    balance_receivable,
    next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
    next_payment_due_date,
    payment_status,
    notes,
    updated_at: new Date().toISOString(),
  };

  if (client_since) {
    updatePayload.client_since = client_since;
  }

  // Salesperson assignment logic:
  // Strictly protect assigned_salesperson from being unintentionally overwritten or reset!
  if (isAdmin) {
    const selectedSalesperson = (formData.get("salesperson_id") as string || formData.get("assigned_salesperson") as string);
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

  let { error } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  // Fallback if remote schema doesn't have the new columns yet
  if (error) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("column") ||
      errorMsg.includes("check constraint") ||
      errorMsg.includes("violates check constraint")
    ) {
      console.warn("Retrying update with fallback payload:", errorMsg);

      const fallbackPayload: Record<string, any> = {
        company_name,
        company_type,
        contact_person,
        email: email || null,
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
        client_status: client_status === "Inactive" ? "On Hold" : "Active",
        contract_value,
        payments_received,
        balance_receivable,
        next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
        next_payment_due_date,
        payment_status,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (isAdmin && updatePayload.assigned_salesperson) {
        fallbackPayload.assigned_salesperson = updatePayload.assigned_salesperson;
      }

      const fallbackRes = await supabase
        .from("clients")
        .update(fallbackPayload)
        .eq("id", clientId);

      error = fallbackRes.error;
    }
  }

  if (error) {
    return { error: error.message, success: false };
  }

  await recordAuditLog({
    action: "UPDATE",
    entityType: "client",
    entityId: clientId,
    entityName: company_name,
    details: {
      trade_name,
      assigned_salesperson: updatePayload.assigned_salesperson,
      client_status,
      contract_value,
    },
  });

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
