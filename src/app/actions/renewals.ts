"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import { generateInvoiceNumberAction as generateNextInvoiceNumber } from "@/lib/invoices/invoice-number";
import {
  calculateExpiryDate,
  calculateNextRenewalCycle,
  calculateReminderDate,
  getMonthsForFrequency,
  RenewalFrequency,
} from "@/lib/renewals/renewal-dates";

export interface RenewalItem {
  id: string; // renewal record id
  clientServiceId: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  contactPerson: string;
  email: string;
  phone: string;
  serviceName: string;
  serviceCategory: string;
  previousExpiryDate?: string | null;
  renewalStartDate?: string;
  renewalEndDate?: string;
  currentExpiryDate: string;
  renewalDate: string;
  renewalAmount: number;
  salesperson: string;
  salespersonId?: string | null;
  status: "Upcoming" | "Due Soon" | "Overdue" | "Renewed" | "Expired" | "Pending" | "Cancelled";
  renewalStatus: "Pending" | "Renewed" | "Cancelled";
  paymentStatus: "Not Invoiced" | "Unpaid" | "Partially Paid" | "Paid";
  lastRenewedAt?: string | null;
  notes?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  invoiceDetails?: {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: string;
  } | null;
  paymentAllocations?: {
    id: string;
    paymentId: string;
    paymentNumber?: string;
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    status?: string;
  }[];
  isCustomRenewal?: boolean;
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
 * Fetch all real renewals from public.renewals with live payment allocation calculations
 */
export async function fetchRenewalsAction(): Promise<RenewalItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Query recorded renewals from public.renewals table with client, service, and invoice joins
  let renewalsQuery = supabase
    .from("renewals")
    .select(`
      id,
      client_id,
      client_service_id,
      salesperson_id,
      service_name_snapshot,
      previous_expiry_date,
      renewal_start_date,
      renewal_end_date,
      renewal_date,
      renewal_amount,
      invoice_id,
      payment_status,
      renewal_status,
      notes,
      created_at,
      client:clients!client_id (
        id,
        company_name,
        client_code,
        contact_person,
        email,
        phone,
        client_status,
        assigned_salesperson
      ),
      salesperson_profile:profiles!salesperson_id (
        id,
        full_name
      ),
      invoice:invoices!invoice_id (
        id,
        invoice_number,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        status
      ),
      client_service:client_services!client_service_id (
        id,
        service_name,
        service_category,
        expected_completion_date
      )
    `)
    .order("renewal_date", { ascending: true });

  const { data: dbRenewals, error } = await renewalsQuery;

  if (error) {
    console.error("Error fetching renewals:", error);
    return [];
  }

  if (!dbRenewals || dbRenewals.length === 0) {
    return [];
  }

  // 3. Extract all invoice IDs to batch fetch verified payment allocations
  const invoiceIds = dbRenewals
    .map((r: any) => r.invoice_id)
    .filter((id): id is string => Boolean(id));

  const allocationsByInvoice: Record<string, {
    totalPaid: number;
    allocations: any[];
  }> = {};

  if (invoiceIds.length > 0) {
    const { data: allocations } = await supabase
      .from("invoice_payment_allocations")
      .select(`
        id,
        invoice_id,
        payment_id,
        amount,
        payment:payments!payment_id (
          id,
          payment_number,
          payment_date,
          payment_method,
          status
        )
      `)
      .in("invoice_id", invoiceIds);

    if (allocations) {
      allocations.forEach((alloc: any) => {
        const p = Array.isArray(alloc.payment) ? alloc.payment[0] : alloc.payment;
        // Verify payment is confirmed/verified (not rejected or reversed)
        const isVerified = !p || p.status === "Verified" || p.status === "Approved" || p.status === "Completed";
        if (isVerified) {
          if (!allocationsByInvoice[alloc.invoice_id]) {
            allocationsByInvoice[alloc.invoice_id] = { totalPaid: 0, allocations: [] };
          }
          const amt = Number(alloc.amount) || 0;
          allocationsByInvoice[alloc.invoice_id].totalPaid += amt;
          allocationsByInvoice[alloc.invoice_id].allocations.push({
            id: alloc.id,
            paymentId: alloc.payment_id,
            paymentNumber: p?.payment_number,
            amount: amt,
            paymentDate: p?.payment_date,
            paymentMethod: p?.payment_method,
            status: p?.status,
          });
        }
      });
    }
  }

  // 4. Transform records into RenewalItem
  const results: RenewalItem[] = [];

  dbRenewals.forEach((r: any) => {
    const client = Array.isArray(r.client) ? r.client[0] : r.client;
    if (client?.client_status === "Archived") return;
    if (!isAdmin && client?.assigned_salesperson !== user.id) return;

    const sp = r.salesperson_profile ? (Array.isArray(r.salesperson_profile) ? r.salesperson_profile[0] : r.salesperson_profile) : null;
    const inv = r.invoice ? (Array.isArray(r.invoice) ? r.invoice[0] : r.invoice) : null;
    const cs = r.client_service ? (Array.isArray(r.client_service) ? r.client_service[0] : r.client_service) : null;

    // Determine live Payment Status strictly from renewal invoice allocations
    let paymentStatus: RenewalItem["paymentStatus"] = "Not Invoiced";
    let invoiceDetails: RenewalItem["invoiceDetails"] = null;
    let paymentAllocations: RenewalItem["paymentAllocations"] = [];

    if (inv) {
      const invoiceTotal = Number(inv.total_amount) || 0;
      const invoiceSubtotal = Number(inv.subtotal) || 0;
      const invoiceTax = Number(inv.tax_amount) || 0;

      const allocInfo = allocationsByInvoice[inv.id] || { totalPaid: 0, allocations: [] };
      // Fallback to inv.amount_paid if no allocation rows are present but invoice has recorded payment
      const actualPaid = allocInfo.totalPaid > 0 ? allocInfo.totalPaid : (Number(inv.amount_paid) || 0);
      const actualBalance = Math.max(0, invoiceTotal - actualPaid);

      paymentAllocations = allocInfo.allocations;

      if (actualBalance <= 0.01 && invoiceTotal > 0) {
        paymentStatus = "Paid";
      } else if (actualPaid > 0.01) {
        paymentStatus = "Partially Paid";
      } else {
        paymentStatus = "Unpaid";
      }

      invoiceDetails = {
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        subtotal: invoiceSubtotal,
        taxAmount: invoiceTax,
        totalAmount: invoiceTotal,
        amountPaid: actualPaid,
        balanceDue: actualBalance,
        status: inv.status,
      };
    }

    // Determine status (Upcoming, Due Soon, Overdue, Renewed, Cancelled)
    let computedStatus: RenewalItem["status"] = (r.renewal_status as any) || "Pending";
    if (computedStatus === "Pending") {
      const targetDate = new Date(r.renewal_date || r.renewal_end_date);
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) computedStatus = "Overdue";
      else if (diffDays <= 30) computedStatus = "Due Soon";
      else computedStatus = "Upcoming";
    }

    results.push({
      id: r.id,
      clientServiceId: r.client_service_id,
      clientId: r.client_id,
      clientName: client?.company_name || "Unknown Client",
      clientCode: client?.client_code || "B360-000",
      contactPerson: client?.contact_person || "-",
      email: client?.email || "-",
      phone: client?.phone || "-",
      serviceName: r.service_name_snapshot || cs?.service_name || "Renewal Service",
      serviceCategory: cs?.service_category || "General",
      previousExpiryDate: r.previous_expiry_date,
      renewalStartDate: r.renewal_start_date,
      renewalEndDate: r.renewal_end_date,
      currentExpiryDate: r.previous_expiry_date || cs?.expected_completion_date || "-",
      renewalDate: r.renewal_date || r.renewal_end_date,
      renewalAmount: Number(r.renewal_amount) || 0,
      salesperson: sp?.full_name || "Unassigned",
      salespersonId: sp?.id || null,
      status: computedStatus,
      renewalStatus: r.renewal_status || "Pending",
      paymentStatus,
      notes: r.notes,
      invoiceId: inv?.id || r.invoice_id || null,
      invoiceNumber: inv?.invoice_number || null,
      invoiceDetails,
      paymentAllocations,
      isCustomRenewal: true,
    });
  });

  return results;
}

/**
 * Dedicated server action to fetch active clients and their active client services
 * for populating the Create Renewal modal independently of the renewals table.
 */
export async function fetchClientsAndServicesForRenewalAction(): Promise<{
  clients: { id: string; name: string }[];
  services: {
    id: string;
    clientId: string;
    name: string;
    amount: number;
    expiry: string;
    serviceCategory: string;
    contractValue: number;
  }[];
}> {
  if (!isSupabaseConfigured()) {
    return { clients: [], services: [] };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { clients: [], services: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  let clientQuery = supabase
    .from("clients")
    .select("id, company_name, assigned_salesperson, client_status")
    .neq("client_status", "Archived")
    .order("company_name", { ascending: true });

  if (!isAdmin) {
    clientQuery = clientQuery.eq("assigned_salesperson", user.id);
  }

  const { data: clientRows, error: cErr } = await clientQuery;
  if (cErr || !clientRows) {
    console.error("Error fetching clients for renewal:", cErr);
    return { clients: [], services: [] };
  }

  const clientIds = clientRows.map((c: any) => c.id);
  if (clientIds.length === 0) {
    return { clients: [], services: [] };
  }

  const { data: serviceRows, error: sErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      service_fee,
      total_amount,
      expected_completion_date,
      renewal_date,
      renewal_amount,
      status
    `)
    .in("client_id", clientIds)
    .neq("status", "Cancelled")
    .order("service_name", { ascending: true });

  if (sErr || !serviceRows) {
    console.error("Error fetching services for renewal:", sErr);
  }

  const clients = clientRows.map((c: any) => ({
    id: c.id,
    name: c.company_name,
  }));

  const services = (serviceRows || []).map((s: any) => {
    const contractVal = Number(s.total_amount || s.service_fee || 0);
    const renewAmt = Number(s.renewal_amount) || contractVal;
    const exp = s.renewal_date || s.expected_completion_date || "-";

    return {
      id: s.id,
      clientId: s.client_id,
      name: s.service_name,
      amount: renewAmt,
      expiry: exp,
      serviceCategory: s.service_category || "General",
      contractValue: contractVal,
    };
  });

  return { clients, services };
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
    const invoiceNumber = await generateNextInvoiceNumber();

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

      // Also create an invoice_items line item
      await supabase.from("invoice_items").insert({
        invoice_id: invData.id,
        client_service_id: service.id,
        item_description: `Subscription Renewal: ${service.service_name}`,
        quantity: 1,
        unit_price: renewalAmount,
        subtotal: renewalAmount,
        tax_rate: 0,
        tax_amount: 0,
        total: renewalAmount,
      });
    }
  }

  // 4. Insert into dedicated renewals table for audit history
  try {
    const nowIso = new Date().toISOString();
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
      confirmed_by: user.id,
      confirmed_at: nowIso,
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
 * Manual renewal creation for a specific client & service.
 * Inserts a record into public.renewals with status = 'Pending' without prematurely updating service expiry.
 */
export async function createManualRenewalAction(
  clientId: string,
  serviceId: string,
  renewalStartDate: string,
  renewalEndDate: string,
  renewalAmount: number,
  notes?: string,
  createInvoice: boolean = false
): Promise<RenewalActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Fetch client & service info
  const { data: service, error: sErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      expected_completion_date,
      renewal_date,
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson
      )
    `)
    .eq("id", serviceId)
    .single();

  if (sErr || !service) {
    return { error: "Service not found or inaccessible." };
  }

  const client = Array.isArray(service.client) ? service.client[0] : service.client;
  const previousExpiry = service.expected_completion_date || service.renewal_date || null;

  // Prevent accidental duplicates for identical service and period
  const { data: existingDuplicate } = await supabase
    .from("renewals")
    .select("id")
    .eq("client_service_id", serviceId)
    .eq("renewal_start_date", renewalStartDate)
    .eq("renewal_end_date", renewalEndDate)
    .neq("renewal_status", "Cancelled")
    .maybeSingle();

  if (existingDuplicate) {
    return { error: "A renewal record already exists for this service and period." };
  }

  let createdInvoiceId: string | null = null;

  // Create invoice if requested
  if (createInvoice && client) {
    const invoiceNumber = await generateNextInvoiceNumber();
    const { data: invData, error: invErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        client_id: client.id,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: renewalEndDate,
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

    if (!invErr && invData) {
      createdInvoiceId = invData.id;

      // Also create invoice_items row
      await supabase.from("invoice_items").insert({
        invoice_id: invData.id,
        client_service_id: service.id,
        item_description: `Subscription Renewal: ${service.service_name}`,
        quantity: 1,
        unit_price: renewalAmount,
        subtotal: renewalAmount,
        tax_rate: 0,
        tax_amount: 0,
        total: renewalAmount,
      });
    }
  }

  // Insert into public.renewals
  const { data: newRenewal, error: insErr } = await supabase
    .from("renewals")
    .insert({
      client_id: client.id,
      client_service_id: service.id,
      salesperson_id: client.assigned_salesperson || null,
      service_name_snapshot: service.service_name,
      previous_expiry_date: previousExpiry,
      renewal_start_date: renewalStartDate,
      renewal_end_date: renewalEndDate,
      renewal_date: renewalEndDate,
      renewal_amount: renewalAmount,
      invoice_id: createdInvoiceId,
      payment_status: "Unpaid",
      renewal_status: "Pending",
      notes: notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insErr) {
    return { error: insErr.message };
  }

  // Audit Log
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "RENEWAL_CREATED",
      entity_type: "renewals",
      entity_id: newRenewal?.id || serviceId,
      details: {
        clientName: client.company_name,
        serviceName: service.service_name,
        renewalStartDate,
        renewalEndDate,
        renewalAmount,
        invoiceId: createdInvoiceId,
      },
    });
  } catch {}

  revalidatePath("/renewals");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  return { success: true };
}

/**
 * Complete a pending renewal record: updates status to 'Renewed' and updates client_service expiry date
 */
export async function completeRenewalRecordAction(renewalId: string): Promise<RenewalActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Fetch renewal record with service and client details
  const { data: renewal, error: rErr } = await supabase
    .from("renewals")
    .select(`
      *,
      client_service:client_services!client_service_id(
        id,
        service_name,
        service_category,
        is_renewable,
        renewal_frequency,
        renewal_duration_months,
        renewal_amount,
        renewal_reminder_days,
        renewal_cycle_count
      ),
      client:clients!client_id(
        id,
        company_name,
        assigned_salesperson
      )
    `)
    .eq("id", renewalId)
    .single();

  if (rErr || !renewal) {
    return { error: "Renewal record not found." };
  }

  if (renewal.renewal_status === "Renewed") {
    return { error: "Renewal is already completed." };
  }

  const nowIso = new Date().toISOString();

  // 1. Mark current renewal record as Renewed, tracking confirmed_by and confirmed_at
  const { error: updRenewalErr } = await supabase
    .from("renewals")
    .update({
      renewal_status: "Renewed",
      confirmed_by: user.id,
      confirmed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", renewalId);

  if (updRenewalErr) return { error: updRenewalErr.message };

  const cs = Array.isArray(renewal.client_service) ? renewal.client_service[0] : renewal.client_service;
  const client = Array.isArray(renewal.client) ? renewal.client[0] : renewal.client;

  // 2. Update client_service expiry & cycle count
  const newCycleCount = ((cs?.renewal_cycle_count || renewal.cycle_number || 1) + 1);
  if (renewal.client_service_id) {
    await supabase
      .from("client_services")
      .update({
        expected_completion_date: renewal.renewal_end_date,
        renewal_date: renewal.renewal_end_date,
        renewal_amount: renewal.renewal_amount,
        renewal_status: "Renewed",
        renewal_cycle_count: newCycleCount,
        last_renewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", renewal.client_service_id);
  }

  // 3. Automatically schedule the NEXT renewal cycle if the service is configured as renewable
  if (renewal.client_service_id) {
    try {
      // Check if an existing Pending renewal already exists to prevent duplicate cycles
      const { data: existingNextPending } = await supabase
        .from("renewals")
        .select("id")
        .eq("client_service_id", renewal.client_service_id)
        .eq("renewal_status", "Pending")
        .maybeSingle();

      if (!existingNextPending) {
        const frequency: RenewalFrequency = (renewal.renewal_frequency || cs?.renewal_frequency || "Annually") as RenewalFrequency;
        const durationMonths: number = renewal.duration_months || cs?.renewal_duration_months || getMonthsForFrequency(frequency);
        const reminderDays: number = cs?.renewal_reminder_days || 30;

        // Calculate next period: Next Start = Previous Expiry + 1 day; Next End = Next Start + duration - 1 day
        const previousExpiry = renewal.renewal_end_date || renewal.renewal_date;
        const nextCycle = calculateNextRenewalCycle(previousExpiry, durationMonths);
        const nextReminderDate = calculateReminderDate(nextCycle.endDate, reminderDays);

        await supabase.from("renewals").insert({
          client_id: renewal.client_id,
          client_service_id: renewal.client_service_id,
          salesperson_id: renewal.salesperson_id || client?.assigned_salesperson || null,
          service_name_snapshot: renewal.service_name_snapshot || cs?.service_name || "Renewal Service",
          previous_expiry_date: previousExpiry,
          renewal_start_date: nextCycle.startDate,
          renewal_end_date: nextCycle.endDate,
          renewal_date: nextCycle.endDate,
          renewal_amount: renewal.renewal_amount,
          payment_status: "Unpaid",
          renewal_status: "Pending",
          cycle_number: newCycleCount,
          renewal_frequency: frequency,
          duration_months: durationMonths,
          reminder_date: nextReminderDate,
          notes: `Cycle ${newCycleCount} scheduled following completion of cycle ${renewal.cycle_number || 1}.`,
          created_by: user.id,
        });
      }
    } catch (nextCycleErr) {
      console.warn("Auto-scheduling next renewal cycle notice:", nextCycleErr);
    }
  }

  // 4. Audit log
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "RENEWAL_COMPLETED",
      entity_type: "renewals",
      entity_id: renewalId,
      details: {
        confirmedBy: user.id,
        confirmedAt: nowIso,
        renewalEndDate: renewal.renewal_end_date,
        renewalAmount: renewal.renewal_amount,
        nextCycleScheduled: true,
      },
    });
  } catch {}

  revalidatePath("/renewals");
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Cancel a pending renewal record
 */
export async function cancelRenewalRecordAction(renewalId: string): Promise<RenewalActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("renewals")
    .update({
      renewal_status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", renewalId);

  if (error) return { error: error.message };

  // Audit log
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "RENEWAL_CANCELLED",
      entity_type: "renewals",
      entity_id: renewalId,
    });
  } catch {}

  revalidatePath("/renewals");
  revalidatePath("/clients");
  return { success: true };
}

/**
 * Generate invoice for an existing renewal record
 */
export async function generateRenewalInvoiceAction(renewalId: string): Promise<RenewalActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: renewal, error: rErr } = await supabase
    .from("renewals")
    .select("*, client:clients!client_id(id, company_name), client_service:client_services!client_service_id(id, service_name)")
    .eq("id", renewalId)
    .single();

  if (rErr || !renewal) return { error: "Renewal not found." };
  if (renewal.invoice_id) return { error: "An invoice is already generated for this renewal." };

  const invoiceNumber = await generateNextInvoiceNumber();
  const renewalAmount = Number(renewal.renewal_amount) || 0;

  const { data: invData, error: invErr } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      client_id: renewal.client_id,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: renewal.renewal_end_date || renewal.renewal_date,
      status: "Unpaid",
      subtotal: renewalAmount,
      tax_amount: 0,
      total_amount: renewalAmount,
      amount_paid: 0,
      balance_due: renewalAmount,
      notes: `Subscription Renewal for: ${renewal.service_name_snapshot}`,
    })
    .select("id")
    .single();

  if (invErr || !invData) return { error: invErr?.message || "Failed to generate invoice." };

  // Insert invoice_items record
  if (renewal.client_service_id) {
    await supabase.from("invoice_items").insert({
      invoice_id: invData.id,
      client_service_id: renewal.client_service_id,
      item_description: `Subscription Renewal: ${renewal.service_name_snapshot}`,
      quantity: 1,
      unit_price: renewalAmount,
      subtotal: renewalAmount,
      tax_rate: 0,
      tax_amount: 0,
      total: renewalAmount,
    });
  }

  // Link invoice back to renewal
  await supabase
    .from("renewals")
    .update({ invoice_id: invData.id, updated_at: new Date().toISOString() })
    .eq("id", renewalId);

  // Audit log
  try {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "RENEWAL_INVOICE_GENERATED",
      entity_type: "renewals",
      entity_id: renewalId,
      details: { invoiceId: invData.id, invoiceNumber },
    });
  } catch {}

  revalidatePath("/renewals");
  revalidatePath("/invoices");
  return { success: true };
}
