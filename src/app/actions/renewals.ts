"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RenewalItem {
  id: string; // client_service id
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
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid";
  lastRenewedAt?: string | null;
  notes?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
}

export interface RenewalHistoryRecord {
  id: string;
  clientId: string;
  clientServiceId: string;
  serviceName: string;
  previousExpiryDate: string | null;
  renewalStartDate: string;
  renewalEndDate: string;
  renewalDate: string;
  renewalAmount: number;
  paymentStatus: string;
  renewalStatus: string;
  invoiceId: string | null;
  invoiceNumber?: string | null;
  notes: string | null;
  createdAt: string;
  createdByName?: string;
}

export interface RenewalActionState {
  error?: string | null;
  success?: boolean;
}

/**
 * Fetch all renewals derived from active client services with RLS & salesperson mapping
 */
export async function fetchRenewalsAction(): Promise<RenewalItem[]> {
  const supabase = await createClient();

  // 1. Fetch current user & role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // 2. Query client services with client & salesperson info
  let query = supabase
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
        client_status,
        assigned_salesperson,
        assigned_profile:profiles!assigned_salesperson (
          id,
          full_name
        )
      )
    `)
    .order("renewal_date", { ascending: true, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching renewals:", error);
    return [];
  }

  // Also fetch latest renewal records from public.renewals if available to get invoice IDs
  const { data: renewalRecords } = await supabase
    .from("renewals")
    .select("client_service_id, invoice_id, payment_status, invoice:invoices!invoice_id(id, invoice_number, status)")
    .order("created_at", { ascending: false });

  const renewalMap = new Map<string, any>();
  if (renewalRecords) {
    renewalRecords.forEach((rec: any) => {
      if (!renewalMap.has(rec.client_service_id)) {
        renewalMap.set(rec.client_service_id, rec);
      }
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data || [])
    .filter((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      // Skip archived clients unless specifically viewed
      if (client?.client_status === "Archived") return false;

      // If salesperson, only show assigned clients
      if (!isAdmin && client?.assigned_salesperson !== user.id) {
        return false;
      }
      return true;
    })
    .map((row: any) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      const salespersonProfile = client?.assigned_profile
        ? Array.isArray(client.assigned_profile)
          ? client.assigned_profile[0]
          : client.assigned_profile
        : null;

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

      // Status determination
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

      // Check linked renewal invoice/payment
      const linkedRec = renewalMap.get(row.id);
      let paymentStatus: "Unpaid" | "Partially Paid" | "Paid" = "Unpaid";
      let invoiceId: string | null = null;
      let invoiceNumber: string | null = null;

      if (linkedRec) {
        invoiceId = linkedRec.invoice_id || null;
        invoiceNumber = linkedRec.invoice?.invoice_number || null;
        const invStatus = linkedRec.invoice?.status || linkedRec.payment_status;
        if (invStatus === "Paid" || invStatus === "Completed") paymentStatus = "Paid";
        else if (invStatus === "Partially Paid" || invStatus === "Partial") paymentStatus = "Partially Paid";
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
        paymentStatus,
        lastRenewedAt: row.last_renewed_at,
        notes: row.notes,
        invoiceId,
        invoiceNumber,
      };
    });
}

/**
 * Fetch renewal history records for a service or client
 */
export async function fetchRenewalHistoryAction(clientServiceId?: string, clientId?: string): Promise<RenewalHistoryRecord[]> {
  const supabase = await createClient();

  let query = supabase
    .from("renewals")
    .select(`
      id,
      client_id,
      client_service_id,
      service_name_snapshot,
      previous_expiry_date,
      renewal_start_date,
      renewal_end_date,
      renewal_date,
      renewal_amount,
      payment_status,
      renewal_status,
      invoice_id,
      notes,
      created_at,
      creator:profiles!created_by(full_name),
      invoice:invoices!invoice_id(invoice_number)
    `)
    .order("created_at", { ascending: false });

  if (clientServiceId) query = query.eq("client_service_id", clientServiceId);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching renewal history:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    clientId: r.client_id,
    clientServiceId: r.client_service_id,
    serviceName: r.service_name_snapshot,
    previousExpiryDate: r.previous_expiry_date,
    renewalStartDate: r.renewal_start_date,
    renewalEndDate: r.renewal_end_date,
    renewalDate: r.renewal_date,
    renewalAmount: Number(r.renewal_amount) || 0,
    paymentStatus: r.payment_status,
    renewalStatus: r.renewal_status,
    invoiceId: r.invoice_id,
    invoiceNumber: r.invoice?.invoice_number || null,
    notes: r.notes,
    createdAt: r.created_at,
    createdByName: r.creator?.full_name || "Admin",
  }));
}

/**
 * Process a service renewal with history persistence, client service update, invoice generation & follow-up
 */
export async function processServiceRenewalAction(
  serviceId: string,
  newRenewalDate: string,
  renewalAmount: number,
  createInvoice: boolean = true,
  notes?: string,
  createFollowup?: boolean
): Promise<RenewalActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // 1. Fetch current service and client details
  const { data: service, error: fetchErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      expected_completion_date,
      renewal_date,
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
  const previousExpiry = service.expected_completion_date || service.renewal_date || null;
  const startDate = previousExpiry || new Date().toISOString().split("T")[0];

  // 2. Update client_services
  const { error: updateErr } = await supabase
    .from("client_services")
    .update({
      expected_completion_date: newRenewalDate,
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

  let createdInvoiceId: string | null = null;

  // 3. Create invoice if requested
  if (createInvoice && client) {
    const invoiceNumber = `B360-INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const { data: invData, error: invErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: client.id,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: newRenewalDate,
        status: "Unpaid",
        subtotal: renewalAmount,
        tax_amount: 0,
        total_amount: renewalAmount,
        amount_paid: 0,
        balance_due: renewalAmount,
        notes: `Subscription Renewal for: ${service.service_name}`,
      })
      .select("id")
      .single();

    if (invErr) {
      console.warn("Could not create renewal invoice:", invErr.message);
    } else if (invData) {
      createdInvoiceId = invData.id;
    }
  }

  // 4. Insert into dedicated renewals table for audit history
  try {
    await supabase.from("renewals").insert({
      client_id: client.id,
      client_service_id: service.id,
      salesperson_id: client.assigned_salesperson || null,
      service_name_snapshot: service.service_name,
      previous_expiry_date: previousExpiry,
      renewal_start_date: startDate,
      renewal_end_date: newRenewalDate,
      renewal_date: newRenewalDate,
      renewal_amount: renewalAmount,
      invoice_id: createdInvoiceId,
      payment_status: "Unpaid",
      renewal_status: "Renewed",
      notes: notes || null,
      created_by: user.id,
    });
  } catch (histErr) {
    console.warn("Could not write to renewals history table (schema migration may still be pending):", histErr);
  }

  // 5. Create follow-up if requested
  if (createFollowup && client) {
    try {
      await supabase.from("follow_ups").insert({
        client_id: client.id,
        title: `Renewal Follow-up: ${service.service_name}`,
        follow_up_type: "renewal",
        priority: "Medium",
        due_date: newRenewalDate,
        assigned_to: client.assigned_salesperson || user.id,
        status: "pending",
        notes: `Automated follow-up for subscription renewal of ${service.service_name}`,
      });
    } catch (fErr) {
      console.warn("Could not create follow-up reminder:", fErr);
    }
  }

  // 6. Record in audit_logs if table exists
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "RENEWAL_COMPLETED",
      entity_type: "client_services",
      entity_id: serviceId,
      details: {
        clientName: client.company_name,
        serviceName: service.service_name,
        newRenewalDate,
        renewalAmount,
        invoiceId: createdInvoiceId,
      },
    });
  } catch {}

  revalidatePath("/renewals");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/clients");
  return { success: true };
}

/**
 * Manual renewal creation for a specific client & service
 */
export async function createManualRenewalAction(
  clientId: string,
  serviceId: string,
  renewalStartDate: string,
  newRenewalDate: string,
  renewalAmount: number,
  notes?: string,
  createInvoice: boolean = true
): Promise<RenewalActionState> {
  return processServiceRenewalAction(
    serviceId,
    newRenewalDate,
    renewalAmount,
    createInvoice,
    notes,
    false
  );
}
