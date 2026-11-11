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
  const notes = (formData.get("notes") as string) || null;
  const contract_value = parseFloat(formData.get("contract_value") as string) || 0;
  const payments_received = parseFloat(formData.get("payments_received") as string) || 0;
  const balance_receivable = Math.max(0, contract_value - payments_received);

  // If Admin, can assign to any employee selected; if Employee, always assign to self
  let assigned_salesperson = user.id;
  if (isAdmin) {
    const selectedSalesperson = formData.get("assigned_salesperson") as string;
    if (selectedSalesperson) {
      assigned_salesperson = selectedSalesperson;
    }
  }

  if (!company_name || !contact_person || !email || !phone) {
    return { error: "Please fill in all required fields (Company name, contact person, email, and phone)." };
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
