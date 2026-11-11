"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateClientState {
  error?: string | null;
  success?: boolean;
  clientId?: string;
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

  // Section 1: Company Details
  const company_name = (formData.get("company_name") as string)?.trim();
  const trade_name = (formData.get("trade_name") as string)?.trim() || null;
  const company_type = (formData.get("company_type") as string) || "Private Limited (Pvt Ltd)";
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || "India";

  // Section 2: Primary Contact
  const contact_person = (formData.get("contact_person") as string)?.trim();
  const designation = (formData.get("designation") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim();
  const alternate_phone = (formData.get("alternate_phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;

  // Section 3: Additional Contacts (JSON stringified)
  let additional_contacts: any[] = [];
  try {
    const rawContacts = formData.get("additional_contacts") as string;
    if (rawContacts) {
      additional_contacts = JSON.parse(rawContacts);
    }
  } catch (err) {
    console.error("Error parsing additional contacts:", err);
  }

  // Section 4: Billing Details & GST
  const billing_name = (formData.get("billing_name") as string)?.trim() || null;
  const billing_address = (formData.get("billing_address") as string)?.trim() || null;
  const billing_contact = (formData.get("billing_contact") as string)?.trim() || null;
  const billing_email = (formData.get("billing_email") as string)?.trim() || null;
  const is_not_gst_registered = formData.get("is_not_gst_registered") === "true";
  const raw_gst_number = (formData.get("gst_number") as string)?.trim() || null;
  const gst_number = is_not_gst_registered ? "Not GST-registered" : raw_gst_number;

  // Section 5: Client Ownership
  let assigned_salesperson = (formData.get("assigned_salesperson") as string) || user.id;
  if (!isAdmin && !assigned_salesperson) {
    assigned_salesperson = user.id;
  }
  const client_since = (formData.get("client_since") as string) || new Date().toISOString().split("T")[0];

  // Section 6: Client Status
  const client_status = (formData.get("client_status") as string) || "Active";

  // Section 7: Notes
  const notes = (formData.get("notes") as string)?.trim() || null;

  // Optional Commercials (if passed or default)
  const services_purchased = (formData.get("services_purchased") as string) || "General";
  const contract_value = parseFloat(formData.get("contract_value") as string) || 0;
  const payments_received = parseFloat(formData.get("payments_received") as string) || 0;
  const balance_receivable = Math.max(0, contract_value - payments_received);

  // Validation
  if (!company_name) {
    return { error: "Company Legal Name is required." };
  }
  if (!contact_person) {
    return { error: "Primary Contact Full Name is required." };
  }
  if (!phone) {
    return { error: "Primary Contact Mobile Number is required." };
  }
  if (!assigned_salesperson) {
    return { error: "Salesperson Who Brought In the Client is required." };
  }

  // Determine Payment Status
  let payment_status: "Paid in full" | "Upcoming" | "Overdue" | "Partially Paid" = "Upcoming";
  if (contract_value > 0 && balance_receivable === 0) {
    payment_status = "Paid in full";
  } else if (payments_received > 0) {
    payment_status = "Partially Paid";
  }

  // Primary payload with all enhanced fields
  const primaryPayload: Record<string, any> = {
    company_name,
    trade_name,
    company_type,
    contact_person,
    designation,
    email: email || `${phone.replace(/\D/g, "")}@client.brand360s.in`,
    phone,
    alternate_phone,
    address,
    city,
    state,
    pincode,
    country,
    gst_number,
    is_not_gst_registered,
    billing_name,
    billing_address,
    billing_contact,
    billing_email,
    additional_contacts,
    client_since,
    client_status,
    services_purchased,
    contract_value,
    payments_received,
    balance_receivable,
    next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
    payment_status,
    assigned_salesperson,
    created_by: user.id,
    notes,
  };

  let { data, error } = await supabase
    .from("clients")
    .insert(primaryPayload)
    .select("id")
    .single();

  // Resilient fallback if remote database hasn't executed migration 010 yet
  if (error) {
    const errorMsg = error.message || "";
    if (
      errorMsg.includes("column") ||
      errorMsg.includes("check constraint") ||
      errorMsg.includes("violates check constraint")
    ) {
      console.warn("Retrying with fallback payload due to DB schema constraints:", errorMsg);

      const metadataSummary = [
        trade_name ? `Trade Name: ${trade_name}` : null,
        designation ? `Designation: ${designation}` : null,
        billing_name ? `Billing Name: ${billing_name}` : null,
        billing_address ? `Billing Address: ${billing_address}` : null,
        billing_contact ? `Billing Contact: ${billing_contact}` : null,
        billing_email ? `Billing Email: ${billing_email}` : null,
        client_since ? `Client Since: ${client_since}` : null,
        additional_contacts.length > 0 ? `Additional Contacts: ${JSON.stringify(additional_contacts)}` : null,
      ].filter(Boolean).join("\n");

      const combinedNotes = [notes, metadataSummary].filter(Boolean).join("\n\n");

      const fallbackPayload: Record<string, any> = {
        company_name,
        company_type,
        contact_person,
        email: email || `${phone.replace(/\D/g, "")}@client.brand360s.in`,
        phone,
        alternate_phone,
        address,
        city,
        state,
        pincode,
        country,
        gst_number: is_not_gst_registered ? "Not GST-registered" : gst_number,
        services_purchased,
        contract_value,
        payments_received,
        balance_receivable,
        next_payment_due_amount: balance_receivable > 0 ? balance_receivable : 0,
        payment_status,
        client_status: client_status === "Inactive" ? "On Hold" : "Active",
        assigned_salesperson,
        created_by: user.id,
        notes: combinedNotes || null,
      };

      const fallbackResult = await supabase
        .from("clients")
        .insert(fallbackPayload)
        .select("id")
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }
  }

  if (error) {
    return { error: error.message };
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

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

  return data || [];
}
