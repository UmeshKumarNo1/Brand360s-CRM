"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ClientFormState {
  error?: string | null;
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

  // If not admin, check if user is the assigned salesperson or creator
  if (!isAdmin) {
    const { data: existingClient } = await supabase
      .from("clients")
      .select("assigned_salesperson, created_by")
      .eq("id", clientId)
      .single();

    if (!existingClient || (existingClient.assigned_salesperson !== user.id && existingClient.created_by !== user.id)) {
      return { error: "You are not authorized to edit this client record." };
    }
  }

  // Extract Form Data
  const company_name = formData.get("company_name") as string;
  const company_type = (formData.get("company_type") as string) || "Private Limited (Pvt Ltd)";
  const contact_person = formData.get("contact_person") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const alternate_phone = (formData.get("alternate_phone") as string) || null;
  const website = (formData.get("website") as string) || null;
  const address = (formData.get("address") as string) || null;
  const city = (formData.get("city") as string) || null;
  const state = (formData.get("state") as string) || null;
  const pincode = (formData.get("pincode") as string) || null;
  const country = (formData.get("country") as string) || "India";
  const gst_number = (formData.get("gst_number") as string) || null;
  const pan_number = (formData.get("pan_number") as string) || null;
  const services_purchased = (formData.get("services_purchased") as string) || "Company Registration";
  const client_status = (formData.get("client_status") as string) || "Active";
  const notes = (formData.get("notes") as string) || null;
  const contract_value = parseFloat(formData.get("contract_value") as string) || 0;
  const payments_received = parseFloat(formData.get("payments_received") as string) || 0;
  const balance_receivable = Math.max(0, contract_value - payments_received);
  const next_payment_due_date = (formData.get("next_payment_due_date") as string) || null;

  if (!company_name || !contact_person || !email || !phone) {
    return { error: "Please fill in all required fields (Company name, contact person, email, and phone)." };
  }

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

  // Only Admin can reassign assigned_salesperson
  if (isAdmin) {
    const selectedSalesperson = formData.get("assigned_salesperson") as string;
    if (selectedSalesperson) {
      updatePayload.assigned_salesperson = selectedSalesperson;
    }
  }

  const { error } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/clients/${clientId}`);
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
      assigned_profile:profiles!assigned_salesperson(id, full_name, email)
    `)
    .eq("id", clientId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

