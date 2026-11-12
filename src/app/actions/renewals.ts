"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RenewalItem {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  contactPerson: string;
  email: string;
  phone: string;
  serviceName: string;
  serviceCategory: string;
  currentExpiryDate: string;
  renewalDate: string;
  renewalAmount: number;
  salesperson: string;
  salespersonId?: string | null;
  status: "Upcoming" | "Due Soon" | "Overdue" | "Renewed" | "Expired";
  lastRenewedAt?: string | null;
  notes?: string | null;
}

export interface RenewalActionState {
  error?: string | null;
  success?: boolean;
}

export async function fetchRenewalsAction(): Promise<RenewalItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      service_fee,
      total_amount,
      start_date,
      expected_completion_date,
      renewal_date,
      renewal_amount,
      renewal_status,
      last_renewed_at,
      notes,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contact_person,
        email,
        phone,
        assigned_profile:profiles!assigned_salesperson (
          id,
          full_name
        )
      )
    `)
    .order("renewal_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching renewals:", error);
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data || []).map((row: any) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const salespersonProfile = client?.assigned_profile
      ? Array.isArray(client.assigned_profile)
        ? client.assigned_profile[0]
        : client.assigned_profile
      : null;

    // Determine fallback renewal date if column is null
    const renewalDateStr =
      row.renewal_date ||
      row.expected_completion_date ||
      row.start_date ||
      new Date().toISOString().split("T")[0];

    const currentExpiry =
      row.expected_completion_date ||
      row.renewal_date ||
      row.start_date ||
      "-";

    const renewalAmount = Number(row.renewal_amount || row.total_amount || row.service_fee || 0);

    // Dynamic status determination if not explicitly marked Renewed/Expired
    let computedStatus: RenewalItem["status"] = (row.renewal_status as any) || "Upcoming";
    if (computedStatus !== "Renewed" && computedStatus !== "Expired") {
      const targetDate = new Date(renewalDateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        computedStatus = "Overdue";
      } else if (diffDays <= 30) {
        computedStatus = "Due Soon";
      } else {
        computedStatus = "Upcoming";
      }
    }

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.company_name || "Unknown Client",
      clientCode: client?.client_code || "B360-000",
      contactPerson: client?.contact_person || "-",
      email: client?.email || "-",
      phone: client?.phone || "-",
      serviceName: row.service_name || "Annual Service",
      serviceCategory: row.service_category || "General",
      currentExpiryDate: currentExpiry,
      renewalDate: renewalDateStr,
      renewalAmount,
      salesperson: salespersonProfile?.full_name || "Unassigned",
      salespersonId: salespersonProfile?.id || null,
      status: computedStatus,
      lastRenewedAt: row.last_renewed_at,
      notes: row.notes,
    };
  });
}

export async function processServiceRenewalAction(
  serviceId: string,
  newRenewalDate: string,
  renewalAmount: number,
  createInvoice: boolean = true
): Promise<RenewalActionState> {
  const supabase = await createClient();

  // 1. Fetch current service and client details
  const { data: service, error: fetchErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        assigned_salesperson
      )
    `)
    .eq("id", serviceId)
    .single();

  if (fetchErr || !service) {
    return { error: fetchErr?.message || "Service not found." };
  }

  const client = Array.isArray(service.client) ? service.client[0] : service.client;

  // 2. Update client_services renewal details
  const { error: updateErr } = await supabase
    .from("client_services")
    .update({
      renewal_date: newRenewalDate,
      renewal_amount: renewalAmount,
      renewal_status: "Renewed",
      last_renewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  // 3. Create invoice if requested
  if (createInvoice && client) {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const dueDate = newRenewalDate;

    const { error: invErr } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber,
      client_id: client.id,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: dueDate,
      status: "Unpaid",
      subtotal: renewalAmount,
      tax_amount: 0,
      total_amount: renewalAmount,
      notes: `Renewal for service: ${service.service_name}`,
    });

    if (invErr) {
      console.warn("Could not create renewal invoice:", invErr.message);
    }
  }

  revalidatePath("/renewals");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/clients");
  return { success: true };
}
