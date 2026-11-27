"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  calculateExpiryDate,
  calculateReminderDate,
  getMonthsForFrequency,
  RenewalFrequency,
} from "@/lib/renewals/renewal-dates";
import { revalidatePath } from "next/cache";
import { autoGenerateInvoiceForClientAction } from "@/app/actions/invoices";
import { uploadClientServiceDocumentAction } from "@/app/actions/documents";
import { syncClientContractValueAction } from "@/app/actions/client-reconciliation";
import { verifyAdminSession, recordAuditLog } from "@/lib/audit/audit-logger";

import { getServiceFulfillmentPreset, FulfillmentStage } from "@/lib/services/fulfillment-workflows";

export interface ServiceActionState {
  error?: string | null;
  success?: boolean;
}

export interface ServiceDeletionEligibility {
  canDelete: boolean;
  ruleCategory: "NO_FINANCIALS" | "DRAFT_ONLY" | "ISSUED_INVOICE" | "PAYMENTS_OR_ALLOCS";
  reason: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  draftInvoicesCount: number;
  issuedInvoicesCount: number;
  allocationsCount: number;
  allocatedTotal: number;
}

export async function fetchServicesCatalogAction() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services_catalog")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching services catalog:", error);
    return [];
  }

  return data || [];
}

export async function fetchActiveServicesCountAction(): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("client_services")
      .select("id, service_status");

    if (error || !data) {
      console.error("Error fetching active services count:", error);
      return 0;
    }

    return data.filter(
      (s: any) => s.service_status !== "Completed" && s.service_status !== "Cancelled"
    ).length;
  } catch (err) {
    console.error("Exception in fetchActiveServicesCountAction:", err);
    return 0;
  }
}

export async function createCatalogServiceAction(
  prevState: ServiceActionState | null,
  formData: FormData
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const name = formData.get("name") as string;
  const category = (formData.get("category") as string) || "General";
  const description = (formData.get("description") as string) || null;
  const default_service_fee = parseFloat(formData.get("default_service_fee") as string) || 0;
  const default_govt_fee = parseFloat(formData.get("default_govt_fee") as string) || 0;
  const workflow_preset = (formData.get("workflow_preset") as string) || null;
  const is_renewable = formData.get("is_renewable") === "true" || formData.get("is_renewable") === "on";
  const renewal_frequency = (formData.get("renewal_frequency") as string) || "Annually";
  const renewal_duration_months = parseInt(formData.get("renewal_duration_months") as string, 10) || 12;
  const default_renewal_amount = parseFloat(formData.get("default_renewal_amount") as string) || default_service_fee;
  const default_reminder_days = parseInt(formData.get("default_reminder_days") as string, 10) || 30;

  if (!name) {
    return { error: "Service name is required." };
  }

  const { error } = await supabase
    .from("services_catalog")
    .insert({
      name,
      category,
      description,
      default_service_fee,
      default_govt_fee,
      workflow_preset: workflow_preset || undefined,
      is_renewable,
      renewal_frequency: is_renewable ? renewal_frequency : null,
      renewal_duration_months: is_renewable ? renewal_duration_months : null,
      default_renewal_amount: is_renewable ? default_renewal_amount : null,
      default_reminder_days: is_renewable ? default_reminder_days : null,
      is_active: true,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function updateCatalogServiceAction(
  id: string,
  data: {
    name?: string;
    category?: string;
    description?: string | null;
    default_service_fee?: number;
    default_govt_fee?: number;
    workflow_preset?: string | null;
    is_renewable?: boolean;
    renewal_frequency?: RenewalFrequency | null;
    renewal_duration_months?: number | null;
    default_renewal_amount?: number | null;
    default_reminder_days?: number | null;
  }
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.default_service_fee !== undefined) updateData.default_service_fee = data.default_service_fee;
  if (data.default_govt_fee !== undefined) updateData.default_govt_fee = data.default_govt_fee;
  if (data.workflow_preset !== undefined) updateData.workflow_preset = data.workflow_preset || null;
  if (data.is_renewable !== undefined) updateData.is_renewable = data.is_renewable;
  if (data.renewal_frequency !== undefined) updateData.renewal_frequency = data.renewal_frequency;
  if (data.renewal_duration_months !== undefined) updateData.renewal_duration_months = data.renewal_duration_months;
  if (data.default_renewal_amount !== undefined) updateData.default_renewal_amount = data.default_renewal_amount;
  if (data.default_reminder_days !== undefined) updateData.default_reminder_days = data.default_reminder_days;

  const { error } = await supabase
    .from("services_catalog")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function toggleCatalogServiceAction(id: string, currentStatus: boolean): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("services_catalog")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function fetchClientServicesAction(clientId: string) {
  const supabase = await createClient();

  // 1. Fetch client services
  const { data, error } = await supabase
    .from("client_services")
    .select(`
      *,
      assigned_profile:profiles!assigned_employee_id (full_name),
      vendor_assignments:service_vendors (
        id,
        agreed_cost,
        payment_status,
        notes,
        created_at,
        vendor:vendors!vendor_id (
          id,
          name,
          company,
          contact_person,
          phone,
          email,
          category,
          status
        )
      ),
      documents:documents (
        id,
        document_type,
        file_name,
        file_url,
        file_size,
        uploaded_by,
        created_at
      )
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching client services:", error);
    return [];
  }

  // 2. Fetch all invoices with items and allocations for this client's services
  const serviceIds = (data || []).map((s: any) => s.id);
  const paidByService: Record<string, number> = {};
  const invoicedByService: Record<string, number> = {};
  const invoicesByService: Record<string, any[]> = {};

  if (serviceIds.length > 0) {
    // Fetch valid issued invoices for this client
    const { data: clientInvoices } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        total_amount,
        amount_paid,
        balance_due,
        status,
        items:invoice_items (
          id,
          description,
          total,
          client_service_id
        )
      `)
      .eq("client_id", clientId)
      .not("status", "in", '("Draft","Void","Cancelled")');

    // Fetch verified payments and their allocations for this client
    const { data: clientPayments } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        status,
        allocations:invoice_payment_allocations (
          id,
          invoice_id,
          allocated_amount,
          client_service_id
        )
      `)
      .eq("client_id", clientId)
      .not("status", "in", '("Pending","Failed","Cancelled","Reversed")');

    // Organize invoices by service
    (data || []).forEach((s: any) => {
      const matchingInvs = (clientInvoices || []).filter((inv: any) => {
        if (inv.items && inv.items.some((it: any) => it.client_service_id === s.id)) return true;
        if ((data || []).length === 1 && !inv.items?.some((it: any) => it.client_service_id && it.client_service_id !== s.id)) return true;
        return false;
      });
      invoicesByService[s.id] = matchingInvs;

      // Calculate invoiced total for this service
      const invTotal = matchingInvs.reduce((sum: number, inv: any) => {
        if (inv.items && Array.isArray(inv.items)) {
          const sItems = inv.items.filter((it: any) => it.client_service_id === s.id);
          if (sItems.length > 0) {
            return sum + sItems.reduce((iSum: number, it: any) => iSum + (Number(it.total) || 0), 0);
          }
        }
        return sum + (Number(inv.total_amount) || 0);
      }, 0);
      invoicedByService[s.id] = invTotal;

      // Calculate verified payment allocations for this service
      const matchingInvIds = new Set(matchingInvs.map((i: any) => i.id));
      let allocTotal = 0;
      (clientPayments || []).forEach((p: any) => {
        (p.allocations || []).forEach((a: any) => {
          if (a.client_service_id === s.id || matchingInvIds.has(a.invoice_id)) {
            allocTotal += Number(a.allocated_amount ?? a.amount) || 0;
          }
        });
      });

      // Fallback for single service if allocation table was empty
      if ((data || []).length === 1 && allocTotal === 0) {
        const invPaidSum = matchingInvs.reduce((sum: number, inv: any) => sum + (Number(inv.amount_paid) || 0), 0);
        if (invPaidSum > 0) {
          allocTotal = invPaidSum;
        } else {
          allocTotal = (clientPayments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        }
      }

      paidByService[s.id] = allocTotal;
    });
  }

  return (data || []).map((s: any) => {
    const contractVal = Number(s.total_amount) || (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);
    const matchingInvs = invoicesByService[s.id] || [];
    const hasIssuedInvoice = matchingInvs.length > 0;
    const amountPaid = paidByService[s.id] || 0;
    const invoicedAmt = invoicedByService[s.id] || 0;
    const outstandingAmt = Math.max(0, invoicedAmt - amountPaid);

    let paymentStatus: "Paid" | "Partially Paid" | "Partial" | "Unpaid" | "Not Invoiced" = "Not Invoiced";
    if (!hasIssuedInvoice || invoicedAmt === 0) {
      paymentStatus = "Not Invoiced";
    } else if (amountPaid >= invoicedAmt - 0.009) {
      paymentStatus = "Paid";
    } else if (amountPaid > 0.009) {
      paymentStatus = "Partially Paid";
    } else {
      paymentStatus = "Unpaid";
    }

    return {
      ...s,
      contractValue: contractVal,
      amountPaid,
      invoicedAmount: invoicedAmt,
      outstandingAmount: outstandingAmt,
      paymentStatus,
      hasIssuedInvoice,
      vendor_assignments: (s.vendor_assignments || []).map((va: any) => ({
        ...va,
        vendor: Array.isArray(va.vendor) ? va.vendor[0] : va.vendor,
      })),
      documents: s.documents || [],
    };
  });
}

export async function assignClientServiceAction(
  prevState: ServiceActionState | null,
  formData: FormData
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const clientId = formData.get("client_id") as string;
  const serviceName = formData.get("service_name") as string;
  const serviceCategory = (formData.get("service_category") as string) || "General";
  const enteredPackageAmount = parseFloat(formData.get("service_fee") as string) || 0;
  const govtFee = parseFloat(formData.get("govt_fee") as string) || 0;
  const pricingMode =
    (formData.get("pricing_mode") as string) === "govt_fee_added"
      ? "govt_fee_added"
      : "govt_fee_included";

  if (pricingMode === "govt_fee_included" && govtFee > enteredPackageAmount) {
    return { error: "Government Fee cannot exceed the entered Service Fee." };
  }

  const serviceFee =
    pricingMode === "govt_fee_included"
      ? Math.max(0, Math.round((enteredPackageAmount - govtFee) * 100) / 100)
      : enteredPackageAmount;
  const netProfessionalFee = serviceFee;
  const startDate = (formData.get("start_date") as string) || null;
  const rawExpectedCompletion = (formData.get("expected_completion_date") as string) || null;
  // Enforce working day only for target delivery date
  const expectedCompletionDate = snapToWorkingDayString(rawExpectedCompletion);
  const serviceStatus = (formData.get("service_status") as string) || "Pending";
  const assignedEmployeeId = (formData.get("assigned_employee_id") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const workflowPreset = (formData.get("workflow_preset") as string) || null;
  const taxRate = parseFloat(formData.get("tax_rate") as string) || 18.0;

  // Renewable Service Fields
  const isRenewable = formData.get("is_renewable") === "true" || formData.get("is_renewable") === "on";
  const renewalFrequency = (formData.get("renewal_frequency") as RenewalFrequency) || "Annually";
  const renewalDurationMonths = parseInt(formData.get("renewal_duration_months") as string, 10) || 12;
  const renewalAmount = parseFloat(formData.get("renewal_amount") as string) || serviceFee;
  const renewalReminderDays = parseInt(formData.get("renewal_reminder_days") as string, 10) || 30;
  const explicitRenewalExpiryDate = (formData.get("renewal_expiry_date") as string) || null;

  if (!clientId || !serviceName) {
    return { error: "Client and service name are required." };
  }

  const totalAmount = serviceFee + govtFee;
  const taxAmount = Math.round(((serviceFee * taxRate) / 100) * 100) / 100;

  // Determine initial workflow stages
  const stageNames = getServiceFulfillmentPreset(serviceName, serviceCategory, workflowPreset);
  const initialStages: FulfillmentStage[] = stageNames.map((name, idx) => ({
    name,
    status: idx === 0 ? "current" : "upcoming",
  }));

  const resolvedWorkflowPreset = workflowPreset || (
    serviceName.toLowerCase().includes("social media") || serviceCategory?.toLowerCase().includes("growth") ? "smm" :
    serviceName.toLowerCase().includes("web") ? "website" :
    serviceName.toLowerCase().includes("trademark") ? "trademark" :
    serviceName.toLowerCase().includes("incorporat") || serviceName.toLowerCase().includes("company reg") ? "incorporation" :
    serviceName.toLowerCase().includes("gst") ? "gst" : "general"
  );

  // Calculate renewal cycle dates if renewable
  const calculatedExpiry = isRenewable
    ? explicitRenewalExpiryDate || calculateExpiryDate(startDate || new Date().toISOString().split("T")[0], renewalDurationMonths)
    : null;

  const { data: newClientService, error } = await supabase
    .from("client_services")
    .insert({
      client_id: clientId,
      service_name: serviceName,
      service_category: serviceCategory,
      service_fee: serviceFee,
      govt_fee: govtFee,
      pricing_mode: pricingMode,
      net_professional_fee: netProfessionalFee,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tax_rate: taxRate,
      workflow_preset: resolvedWorkflowPreset,
      fulfillment_stages: initialStages,
      current_stage_name: initialStages[0]?.name || "Onboarding",
      progress_percentage: 0,
      start_date: startDate,
      expected_completion_date: expectedCompletionDate,
      service_status: serviceStatus,
      assigned_employee_id: assignedEmployeeId,
      notes,
      is_renewable: isRenewable,
      renewal_frequency: isRenewable ? renewalFrequency : null,
      renewal_duration_months: isRenewable ? renewalDurationMonths : null,
      renewal_reminder_days: isRenewable ? renewalReminderDays : null,
      renewal_date: calculatedExpiry,
      renewal_amount: isRenewable ? renewalAmount : 0,
      renewal_status: isRenewable ? "Upcoming" : null,
      renewal_cycle_count: isRenewable ? 1 : 0,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update client's services_purchased string summary if needed
  const { data: allServices } = await supabase
    .from("client_services")
    .select("service_name")
    .eq("client_id", clientId);

  if (allServices && allServices.length > 0) {
    const serviceList = Array.from(new Set(allServices.map((s) => s.service_name))).join(", ");
    await supabase
      .from("clients")
      .update({ services_purchased: serviceList })
      .eq("id", clientId);
  }

  // Feature: Auto-generate invoice for this service deliverable with correct GST-exclusive billing
  let generatedInvoiceId: string | null = null;
  if (totalAmount > 0 && newClientService?.id) {
    try {
      const invRes = await autoGenerateInvoiceForClientAction(clientId, {
        serviceName,
        clientServiceId: newClientService.id,
        serviceFee,
        govtFee,
        taxRate,
        isEligiblePureAgent: true,
        description: `${serviceName} - Professional Deliverable`,
        dueDate: expectedCompletionDate || undefined,
      });
      if (invRes.success && invRes.invoiceId) {
        generatedInvoiceId = invRes.invoiceId;
      }
    } catch (invErr) {
      console.warn("Auto-invoice generation on service assignment warning:", invErr);
    }
  }

  // Feature: Process initial required documents (e.g. PAN card, Aadhaar, Company Onboarding Documents)
  if (newClientService?.id) {
    try {
      const docFiles = (
        [
          ...formData.getAll("required_documents"),
          ...formData.getAll("documents"),
        ] as File[]
      ).filter((f) => f && typeof f === "object" && "size" in f && f.size > 0);

      for (let idx = 0; idx < docFiles.length; idx++) {
        const file = docFiles[idx];
        const explicitType = (formData.get(`document_type_${idx}`) as string) || (formData.get("document_type") as string);
        let docType = explicitType;

        if (!docType) {
          const fn = file.name.toLowerCase();
          if (fn.includes("pan") || fn.includes("gst")) {
            docType = "PAN/GST";
          } else if (fn.includes("aadhaar") || fn.includes("id") || fn.includes("passport")) {
            docType = "Company Document";
          } else if (fn.includes("coi") || fn.includes("registration") || fn.includes("incorporation")) {
            docType = "Registration";
          } else {
            docType = "PAN/GST";
          }
        }

        const uploadFormData = new FormData();
        uploadFormData.append("client_id", clientId);
        uploadFormData.append("client_service_id", newClientService.id);
        uploadFormData.append("document_type", docType);
        uploadFormData.append("file", file);

        await uploadClientServiceDocumentAction(uploadFormData);
      }
    } catch (docErr) {
      console.warn("Initial document upload on service assignment warning:", docErr);
    }
  }

  // Recalculate and synchronize client contract value & balance receivable
  await syncClientContractValueAction(clientId);

  // Automatic First Renewal Cycle Creation for Renewable Services
  if (isRenewable && newClientService?.id && calculatedExpiry) {
    try {
      // Check if a pending renewal already exists to prevent duplicate creation
      const { data: existingRenewal } = await supabase
        .from("renewals")
        .select("id")
        .eq("client_service_id", newClientService.id)
        .eq("renewal_status", "Pending")
        .maybeSingle();

      if (!existingRenewal) {
        // Fetch client's assigned salesperson
        const { data: clientInfo } = await supabase
          .from("clients")
          .select("assigned_salesperson")
          .eq("id", clientId)
          .single();

        const { data: { user: currentUser } } = await supabase.auth.getUser();

        const reminderDate = calculateReminderDate(calculatedExpiry, renewalReminderDays);

        const { data: createdRenewal } = await supabase.from("renewals").insert({
          client_id: clientId,
          client_service_id: newClientService.id,
          salesperson_id: clientInfo?.assigned_salesperson || null,
          service_name_snapshot: serviceName,
          previous_expiry_date: null,
          renewal_start_date: startDate || new Date().toISOString().split("T")[0],
          renewal_end_date: calculatedExpiry,
          renewal_date: calculatedExpiry,
          renewal_amount: renewalAmount,
          payment_status: "Unpaid",
          renewal_status: "Pending",
          cycle_number: 1,
          renewal_frequency: renewalFrequency,
          duration_months: renewalDurationMonths,
          reminder_date: reminderDate,
          invoice_id: generatedInvoiceId || null,
          notes: notes ? `Initial renewal cycle. Notes: ${notes}` : "Initial automated renewal cycle.",
          created_by: currentUser?.id || null,
        }).select("id").maybeSingle();

        // If an invoice was created and migration 045 added renewal_id, link back explicitly
        if (createdRenewal?.id && generatedInvoiceId) {
          try {
            await supabase
              .from("invoices")
              .update({ renewal_id: createdRenewal.id })
              .eq("id", generatedInvoiceId);
          } catch (linkErr) {
            console.warn("Could not link invoice to renewal_id:", linkErr);
          }
        }
      }
    } catch (renewalErr) {
      console.warn("Auto-creation of first renewal cycle notice:", renewalErr);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/renewals");
  revalidatePath("/services");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  return { success: true };
}

export async function removeClientServiceAction(serviceId: string, clientId: string): Promise<ServiceActionState> {
  const supabase = await createClient();

  // Financial safety check: check if this service has linked invoice items or payment allocations
  const { data: linkedAllocations } = await supabase
    .from("invoice_payment_allocations")
    .select("id, allocated_amount")
    .eq("client_service_id", serviceId);

  const totalAllocated = (linkedAllocations || []).reduce(
    (sum: number, a: any) => sum + (Number(a.allocated_amount) || 0),
    0
  );

  if (totalAllocated > 0) {
    return {
      error: `Cannot delete service because it has ₹${totalAllocated.toLocaleString("en-IN")} in recorded payment allocations. To preserve financial audit integrity, change the service status to 'Cancelled' instead of deleting it.`,
    };
  }

  const { error } = await supabase
    .from("client_services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

  // Recalculate and synchronize client contract value & balance receivable
  await syncClientContractValueAction(clientId);

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function updateClientServiceStatusAction(
  serviceId: string,
  newStatus: string,
  clientId?: string
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const validStatuses = [
    "Pending",
    "Processing",
    "In Progress",
    "New",
    "Documents Pending",
    "Waiting for Approval",
    "Completed",
    "On Hold",
    "Cancelled",
  ];

  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status: ${newStatus}` };
  }

  const updatePayload: any = {
    service_status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "Completed") {
    updatePayload.actual_completion_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("client_services")
    .update(updatePayload)
    .eq("id", serviceId);

  if (error) {
    console.error("Error updating client service status:", error);
    return { error: error.message };
  }

  if (clientId) {
    // Recalculate and synchronize client contract value & balance receivable
  await syncClientContractValueAction(clientId);

  revalidatePath(`/clients/${clientId}`);
  }
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/reports");
  return { success: true };
}

export async function editClientServiceAction(
  serviceId: string,
  clientId: string,
  data: {
    serviceName?: string;
    serviceCategory?: string;
    serviceFee?: number;
    govtFee?: number;
    startDate?: string | null;
    expectedCompletionDate?: string | null;
    serviceStatus?: string;
    assignedEmployeeId?: string | null;
    notes?: string | null;
    taxRate?: number;
    workflowPreset?: string | null;
    resetWorkflow?: boolean;
    isRenewable?: boolean;
    renewalFrequency?: RenewalFrequency;
    renewalDurationMonths?: number;
    renewalAmount?: number;
    renewalReminderDays?: number;
    renewalDate?: string | null;
  }
): Promise<ServiceActionState> {
  const supabase = await createClient();

  // 1. Fetch current service to verify financial constraints and current workflow state
  const { data: currentService, error: fetchErr } = await supabase
    .from("client_services")
    .select("id, client_id, service_name, service_category, service_fee, govt_fee, total_amount, tax_rate, tax_amount, fulfillment_stages, workflow_preset, current_stage_name, progress_percentage")
    .eq("id", serviceId)
    .single();

  if (fetchErr || !currentService) {
    return { error: "Service record not found." };
  }

  // 2. Check if an issued invoice exists for this service
  const { data: linkedInvoiceItems } = await supabase
    .from("invoice_items")
    .select("id, invoice:invoices!invoice_id (id, status, invoice_number)")
    .eq("client_service_id", serviceId);

  const hasIssuedInvoice = (linkedInvoiceItems || []).some((it: any) => {
    const status = it.invoice?.status;
    return status && status !== "Draft" && status !== "Cancelled";
  });

  // Financial editing restrictions:
  // If an issued invoice exists, allow authorized admin revision of service contract value
  // while recording previous & revised values in the audit log and preserving issued invoices.
  const feeChanged = data.serviceFee !== undefined && Number(data.serviceFee) !== Number(currentService.service_fee);
  const govtFeeChanged = data.govtFee !== undefined && Number(data.govtFee) !== Number(currentService.govt_fee);

  if (hasIssuedInvoice && (feeChanged || govtFeeChanged)) {
    await recordAuditLog({
      action: "UPDATE",
      entityType: "client_service",
      entityId: serviceId,
      entityName: currentService.service_name,
      details: {
        reason: "Contract value revision while issued invoices exist",
        previousServiceFee: currentService.service_fee,
        newServiceFee: data.serviceFee ?? currentService.service_fee,
        previousGovtFee: currentService.govt_fee,
        newGovtFee: data.govtFee ?? currentService.govt_fee,
        note: "Issued invoices and payment allocations preserved without silent overwrite.",
      },
    });
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.serviceName !== undefined) updateData.service_name = data.serviceName;
  if (data.serviceCategory !== undefined) updateData.service_category = data.serviceCategory;
  if (data.serviceFee !== undefined) updateData.service_fee = data.serviceFee;
  if (data.govtFee !== undefined) updateData.govt_fee = data.govtFee;
  if (data.serviceFee !== undefined || data.govtFee !== undefined) {
    const fee = data.serviceFee ?? Number(currentService.service_fee);
    const govt = data.govtFee ?? Number(currentService.govt_fee);
    updateData.total_amount = fee + govt;
  }

  if (data.taxRate !== undefined) updateData.tax_rate = data.taxRate;
  
  // Recalculate tax_amount if serviceFee or taxRate was updated and no issued invoice exists
  if (!hasIssuedInvoice && (data.serviceFee !== undefined || data.taxRate !== undefined)) {
    const fee = data.serviceFee ?? Number(currentService.service_fee);
    const rate = data.taxRate ?? (Number(currentService.tax_rate) || 18.0);
    updateData.tax_amount = Math.round(((fee * rate) / 100) * 100) / 100;
  }
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.expectedCompletionDate !== undefined) {
    updateData.expected_completion_date = snapToWorkingDayString(data.expectedCompletionDate);
  }
  if (data.serviceStatus !== undefined) updateData.service_status = data.serviceStatus;
  if (data.assignedEmployeeId !== undefined) updateData.assigned_employee_id = data.assignedEmployeeId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isRenewable !== undefined) updateData.is_renewable = data.isRenewable;
  if (data.renewalFrequency !== undefined) updateData.renewal_frequency = data.renewalFrequency;
  if (data.renewalDurationMonths !== undefined) updateData.renewal_duration_months = data.renewalDurationMonths;
  if (data.renewalAmount !== undefined) updateData.renewal_amount = data.renewalAmount;
  if (data.renewalReminderDays !== undefined) updateData.renewal_reminder_days = data.renewalReminderDays;
  if (data.renewalDate !== undefined) updateData.renewal_date = data.renewalDate;

  // 3. Workflow Preset Update & Intelligent Stage Mapping
  if (data.workflowPreset !== undefined && data.workflowPreset !== currentService.workflow_preset) {
    updateData.workflow_preset = data.workflowPreset;
    const newStageNames = getServiceFulfillmentPreset(
      data.serviceName || currentService.service_name,
      data.serviceCategory || currentService.service_category,
      data.workflowPreset
    );

    const existingStages: FulfillmentStage[] = currentService.fulfillment_stages || [];
    const completedNames = new Set(existingStages.filter((s) => s.status === "completed").map((s) => s.name.toLowerCase()));

    // Map stages intelligently
    const newStages: FulfillmentStage[] = newStageNames.map((name) => {
      if (completedNames.has(name.toLowerCase())) {
        return { name, status: "completed" };
      }
      return { name, status: "upcoming" };
    });

    // The first incomplete stage automatically becomes current
    const firstIncompleteIdx = newStages.findIndex((s) => s.status !== "completed");
    if (firstIncompleteIdx !== -1) {
      newStages[firstIncompleteIdx].status = "current";
    }

    const completedCount = newStages.filter((s) => s.status === "completed").length;
    const isAllComplete = completedCount === newStages.length;
    const newProgress = isAllComplete
      ? 100
      : newStages.length > 0
      ? Math.round((completedCount / newStages.length) * 100)
      : 0;

    const currentIdx = newStages.findIndex((s) => s.status === "current");
    updateData.fulfillment_stages = newStages;
    updateData.current_stage_name = isAllComplete ? "Completed" : (currentIdx !== -1 ? newStages[currentIdx]?.name : newStages[0]?.name) || "In Progress";
    updateData.progress_percentage = newProgress;
    if (isAllComplete) {
      updateData.service_status = "Completed";
    }
  }

  const { error } = await supabase
    .from("client_services")
    .update(updateData)
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

  // Update existing pending renewal record if renewal details changed, WITHOUT creating duplicate cycles
  if (data.isRenewable || data.renewalDate || data.renewalAmount !== undefined) {
    try {
      const { data: pendingRenewal } = await supabase
        .from("renewals")
        .select("id")
        .eq("client_service_id", serviceId)
        .eq("renewal_status", "Pending")
        .maybeSingle();

      if (pendingRenewal) {
        const renewalUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        if (data.renewalDate) {
          renewalUpdate.renewal_end_date = data.renewalDate;
          renewalUpdate.renewal_date = data.renewalDate;
        }
        if (data.renewalAmount !== undefined) {
          renewalUpdate.renewal_amount = data.renewalAmount;
        }
        if (data.renewalFrequency) {
          renewalUpdate.renewal_frequency = data.renewalFrequency;
        }
        if (data.renewalDurationMonths) {
          renewalUpdate.duration_months = data.renewalDurationMonths;
        }
        await supabase
          .from("renewals")
          .update(renewalUpdate)
          .eq("id", pendingRenewal.id);
      }
    } catch (renewUpdateErr) {
      console.warn("Sync pending renewal on service edit notice:", renewUpdateErr);
    }
  }

  // Recalculate client contract value
  await syncClientContractValueAction(clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/renewals");
  return { success: true };
}

/**
 * Snaps any date to the next working day (Monday - Friday).
 * Saturday (+2 days) -> Monday
 * Sunday (+1 day) -> Monday
 */
function snapToWorkingDayString(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const clean = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay();
    if (day === 6) {
      d.setDate(d.getDate() + 2); // Saturday -> Monday
    } else if (day === 0) {
      d.setDate(d.getDate() + 1); // Sunday -> Monday
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dt}`;
  }
  return clean;
}

/**
 * Updates the target delivery date committed for the service.
 * Strictly enforces working days only (snaps weekends to Monday).
 */
export async function updateClientServiceDueDateAction(
  serviceId: string,
  newDueDate: string | null,
  clientId?: string
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  if (!serviceId) {
    return { error: "Service ID is required." };
  }

  const workingDueDate = snapToWorkingDayString(newDueDate);

  const { error } = await supabase
    .from("client_services")
    .update({
      expected_completion_date: workingDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (error) {
    console.error("Error updating client service target delivery date:", error);
    return { error: error.message };
  }

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
  }
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/reports");
  return { success: true };
}

/**
 * Assigns or unassigns an employee to a client service.
 * Supports passing null to clear assignment.
 */
export async function assignClientServiceEmployeeAction(
  serviceId: string,
  employeeId: string | null,
  clientId?: string
): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  if (!serviceId) {
    return { error: "Service ID is required." };
  }

  // 1. Fetch current user profile to verify assignment permissions
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = currentUserProfile?.role === "admin";

  // 2. Fetch service with client to verify ownership/assignment authority
  const { data: currentService, error: svcFetchError } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      assigned_employee_id,
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", serviceId)
    .single();

  if (svcFetchError || !currentService) {
    return { error: "Client service not found." };
  }

  const client = Array.isArray(currentService.client) ? currentService.client[0] : currentService.client;
  const isAssignedSalesperson = client?.assigned_salesperson === user.id || client?.created_by === user.id;

  if (!isAdmin && !isAssignedSalesperson) {
    return { error: "Permission denied. Only Administrators and the assigned Salesperson can assign employees." };
  }

  // 3. If assigning an employee (not unassigning), verify that the employee exists and is active
  let assignedEmployeeName = "Unassigned";
  if (employeeId) {
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", employeeId)
      .single();

    if (targetProfileError || !targetProfile) {
      return { error: "Selected employee profile does not exist." };
    }

    if (targetProfile.is_active === false) {
      return { error: "Cannot assign deactivated or inactive employee." };
    }

    assignedEmployeeName = targetProfile.full_name || "Employee";
  }

  // 4. Update assigned_employee_id
  const { error } = await supabase
    .from("client_services")
    .update({
      assigned_employee_id: employeeId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  if (error) {
    console.error("Error assigning employee to client service:", error);
    return { error: error.message };
  }

  // 5. Record CRM Audit Log
  try {
    const { recordAuditLog } = await import("@/lib/audit/audit-logger");
    await recordAuditLog({
      actorId: user.id,
      action: "UPDATE",
      entityType: "client_service",
      entityId: serviceId,
      entityName: `${currentService.service_name} (${client?.company_name || "Client"})`,
      details: {
        action_type: "REASSIGN_EMPLOYEE",
        previous_employee_id: currentService.assigned_employee_id,
        new_employee_id: employeeId || null,
        new_employee_name: assignedEmployeeName,
      },
    });
  } catch (auditErr) {
    console.warn("Could not log employee assignment audit record:", auditErr);
  }

  const effectiveClientId = clientId || currentService.client_id;
  if (effectiveClientId) {
    revalidatePath(`/clients/${effectiveClientId}`);
  }
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/reports");
  return { success: true };
}

/**
 * Checks whether an individual client service is eligible for deletion
 * Implements Cases A, B, C, D
 */
export async function checkServiceDeletionEligibilityAction(
  serviceId: string
): Promise<ServiceDeletionEligibility> {
  const supabase = await createClient();

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc("check_service_deletion_eligibility", {
    p_service_id: serviceId,
  });

  if (!rpcError && rpcData && rpcData.success) {
    return {
      canDelete: Boolean(rpcData.canDelete),
      ruleCategory: rpcData.ruleCategory,
      reason: rpcData.reason,
      serviceId: rpcData.serviceId,
      serviceName: rpcData.serviceName,
      clientId: rpcData.clientId,
      draftInvoicesCount: Number(rpcData.draftInvoicesCount) || 0,
      issuedInvoicesCount: Number(rpcData.issuedInvoicesCount) || 0,
      allocationsCount: Number(rpcData.allocationsCount) || 0,
      allocatedTotal: Number(rpcData.allocatedTotal) || 0,
    };
  }

  // Graceful server-side fallback
  const { data: service, error: sErr } = await supabase
    .from("client_services")
    .select("id, client_id, service_name")
    .eq("id", serviceId)
    .single();

  if (sErr || !service) {
    return {
      canDelete: false,
      ruleCategory: "PAYMENTS_OR_ALLOCS",
      reason: "Service not found.",
      serviceId,
      serviceName: "Unknown Service",
      clientId: "",
      draftInvoicesCount: 0,
      issuedInvoicesCount: 0,
      allocationsCount: 0,
      allocatedTotal: 0,
    };
  }

  // Check payment allocations
  const { data: allocs } = await supabase
    .from("invoice_payment_allocations")
    .select("id, allocated_amount")
    .eq("client_service_id", serviceId);

  const allocationsCount = allocs?.length || 0;
  const allocatedTotal = (allocs || []).reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);

  // Check invoice items
  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, invoice:invoices!invoice_id (id, status, invoice_number)")
    .eq("client_service_id", serviceId);

  let draftInvoicesCount = 0;
  let issuedInvoicesCount = 0;

  (items || []).forEach((it: any) => {
    const inv = it.invoice;
    if (!inv) return;
    if (inv.status === "Draft") {
      draftInvoicesCount++;
    } else if (inv.status !== "Cancelled") {
      issuedInvoicesCount++;
    }
  });

  if (allocationsCount > 0 || allocatedTotal > 0) {
    return {
      canDelete: false,
      ruleCategory: "PAYMENTS_OR_ALLOCS",
      reason: `This service has recorded payment allocations (₹${allocatedTotal.toLocaleString("en-IN")}). Permanent deletion is blocked to preserve financial receipts and tax audit history.`,
      serviceId,
      serviceName: service.service_name,
      clientId: service.client_id,
      draftInvoicesCount,
      issuedInvoicesCount,
      allocationsCount,
      allocatedTotal,
    };
  }

  if (issuedInvoicesCount > 0) {
    return {
      canDelete: false,
      ruleCategory: "ISSUED_INVOICE",
      reason: `This service is linked to ${issuedInvoicesCount} issued tax invoice(s). Permanent deletion is blocked to maintain sequential numbering and compliance.`,
      serviceId,
      serviceName: service.service_name,
      clientId: service.client_id,
      draftInvoicesCount,
      issuedInvoicesCount,
      allocationsCount: 0,
      allocatedTotal: 0,
    };
  }

  if (draftInvoicesCount > 0) {
    return {
      canDelete: true,
      ruleCategory: "DRAFT_ONLY",
      reason: `This service has ${draftInvoicesCount} unissued draft invoice(s). Deleting it will safely purge unissued draft items without affecting issued financial records.`,
      serviceId,
      serviceName: service.service_name,
      clientId: service.client_id,
      draftInvoicesCount,
      issuedInvoicesCount,
      allocationsCount: 0,
      allocatedTotal: 0,
    };
  }

  return {
    canDelete: true,
    ruleCategory: "NO_FINANCIALS",
    reason: "This service has no invoices or payments. It can be safely and permanently deleted.",
    serviceId,
    serviceName: service.service_name,
    clientId: service.client_id,
    draftInvoicesCount: 0,
    issuedInvoicesCount: 0,
    allocationsCount: 0,
    allocatedTotal: 0,
  };
}

/**
 * Safely deletes an individual client service (Admin only)
 * Recalculates client contract values and updates services_purchased string.
 */
export async function deleteClientServiceAction(
  serviceId: string
): Promise<{ success: boolean; error?: string; clientId?: string }> {
  const { authorized, error: authError, user, profile } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, error: authError || "Only an authorized Admin can delete services." };
  }

  const supabase = await createClient();

  // Pre-flight check
  const check = await checkServiceDeletionEligibilityAction(serviceId);
  if (!check.canDelete) {
    return { success: false, error: check.reason };
  }

  // 1. Try atomic database RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("safe_delete_client_service", {
    p_service_id: serviceId,
  });

  if (!rpcErr && rpcRes) {
    if (!rpcRes.success) {
      return { success: false, error: rpcRes.error || "Failed to delete service." };
    }

    await recordAuditLog({
      actorId: user?.id,
      action: "DELETE",
      entityType: "client_service",
      entityId: serviceId,
      entityName: check.serviceName,
      details: {
        client_id: check.clientId,
        deleted_by_name: profile?.full_name,
        rule_category: check.ruleCategory,
      },
    });

    if (check.clientId) {
      revalidatePath(`/clients/${check.clientId}`);
    }
    revalidatePath("/clients");
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return { success: true, clientId: check.clientId };
  }

  // 2. Fallback: Transaction-like server steps
  try {
    // If draft only, clean up draft line items & draft invoices
    if (check.ruleCategory === "DRAFT_ONLY") {
      const { data: draftItems } = await supabase
        .from("invoice_items")
        .select("id, invoice_id")
        .eq("client_service_id", serviceId);

      const draftItemIds = (draftItems || []).map((i) => i.id);
      const draftInvoiceIds = Array.from(new Set((draftItems || []).map((i) => i.invoice_id)));

      if (draftItemIds.length > 0) {
        await supabase.from("invoice_items").delete().in("id", draftItemIds);
      }

      // If draft invoices have no items left, remove them
      for (const invId of draftInvoiceIds) {
        const { count } = await supabase
          .from("invoice_items")
          .select("id", { count: "exact", head: true })
          .eq("invoice_id", invId);

        if (count === 0) {
          await supabase.from("invoices").delete().eq("id", invId).eq("status", "Draft");
        }
      }
    }

    // Dependent non-financial records
    await supabase.from("service_stage_history").delete().eq("client_service_id", serviceId);
    await supabase.from("documents").delete().eq("client_service_id", serviceId);
    await supabase.from("service_vendors").delete().eq("client_service_id", serviceId);
    await supabase.from("renewals").delete().eq("client_service_id", serviceId);

    // Delete client service
    const { error: delErr } = await supabase
      .from("client_services")
      .delete()
      .eq("id", serviceId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // Sync client contract value and services_purchased
    if (check.clientId) {
      await syncClientContractValueAction(check.clientId);

      const { data: remainingServices } = await supabase
        .from("client_services")
        .select("service_name")
        .eq("client_id", check.clientId);

      const updatedStr = (remainingServices && remainingServices.length > 0)
        ? Array.from(new Set(remainingServices.map((s) => s.service_name))).join(", ")
        : null;

      await supabase
        .from("clients")
        .update({ services_purchased: updatedStr })
        .eq("id", check.clientId);
    }

    await recordAuditLog({
      actorId: user?.id,
      action: "DELETE",
      entityType: "client_service",
      entityId: serviceId,
      entityName: check.serviceName,
      details: {
        client_id: check.clientId,
        deleted_by_name: profile?.full_name,
        rule_category: check.ruleCategory,
      },
    });

    if (check.clientId) {
      revalidatePath(`/clients/${check.clientId}`);
    }
    revalidatePath("/clients");
    revalidatePath("/services");
    revalidatePath("/dashboard");

    return { success: true, clientId: check.clientId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to complete service deletion." };
  }
}


