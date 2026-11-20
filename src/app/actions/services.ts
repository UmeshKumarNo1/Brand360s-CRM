"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
      is_active: true,
    });

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

  // 2. Fetch invoice allocations mapped to client services (or invoice items linked to services)
  const serviceIds = (data || []).map((s: any) => s.id);
  const paidByService: Record<string, number> = {};
  const invoicedByService: Record<string, number> = {};

  if (serviceIds.length > 0) {
    // Check direct allocations to client_service_id
    const { data: directAllocs } = await supabase
      .from("invoice_payment_allocations")
      .select("client_service_id, allocated_amount")
      .in("client_service_id", serviceIds);

    (directAllocs || []).forEach((a: any) => {
      if (a.client_service_id) {
        paidByService[a.client_service_id] =
          (paidByService[a.client_service_id] || 0) + (Number(a.allocated_amount) || 0);
      }
    });

    // Also fetch invoice items linked to client services
    const { data: invoiceItems } = await supabase
      .from("invoice_items")
      .select("id, invoice_id, client_service_id, total");

    const invoiceToServiceMap: Record<string, string> = {};
    (invoiceItems || []).forEach((item: any) => {
      if (item.client_service_id && serviceIds.includes(item.client_service_id)) {
        invoicedByService[item.client_service_id] =
          (invoicedByService[item.client_service_id] || 0) + (Number(item.total) || 0);
        if (item.invoice_id) {
          invoiceToServiceMap[item.invoice_id] = item.client_service_id;
        }
      }
    });

    // Check allocations where client_service_id might be null but invoice has a linked service
    const { data: allClientAllocs } = await supabase
      .from("invoice_payment_allocations")
      .select("invoice_id, client_service_id, allocated_amount");

    (allClientAllocs || []).forEach((a: any) => {
      if (!a.client_service_id && a.invoice_id && invoiceToServiceMap[a.invoice_id]) {
        const resolvedSvcId = invoiceToServiceMap[a.invoice_id];
        if (serviceIds.includes(resolvedSvcId)) {
          const currentDirect = paidByService[resolvedSvcId] || 0;
          if (currentDirect === 0) {
            paidByService[resolvedSvcId] = (paidByService[resolvedSvcId] || 0) + (Number(a.allocated_amount) || 0);
          }
        }
      }
    });
  }

  return (data || []).map((s: any) => {
    const contractVal = Number(s.total_amount) || (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);
    const amountPaid = paidByService[s.id] || 0;
    const invoicedAmt = invoicedByService[s.id] || contractVal;

    let paymentStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
    const billableTarget = invoicedAmt > 0 ? invoicedAmt : contractVal;
    if (billableTarget > 0 && amountPaid >= billableTarget - 0.009) {
      paymentStatus = "Paid";
    } else if (amountPaid > 0.009) {
      paymentStatus = "Partial";
    }

    return {
      ...s,
      contractValue: contractVal,
      amountPaid,
      invoicedAmount: invoicedAmt,
      paymentStatus,
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
  const serviceFee = parseFloat(formData.get("service_fee") as string) || 0;
  const govtFee = parseFloat(formData.get("govt_fee") as string) || 0;
  const startDate = (formData.get("start_date") as string) || null;
  const rawExpectedCompletion = (formData.get("expected_completion_date") as string) || null;
  // Enforce working day only for target delivery date
  const expectedCompletionDate = snapToWorkingDayString(rawExpectedCompletion);
  const serviceStatus = (formData.get("service_status") as string) || "Pending";
  const assignedEmployeeId = (formData.get("assigned_employee_id") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const workflowPreset = (formData.get("workflow_preset") as string) || null;
  const taxRate = parseFloat(formData.get("tax_rate") as string) || 18.0;

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

  const { data: newClientService, error } = await supabase
    .from("client_services")
    .insert({
      client_id: clientId,
      service_name: serviceName,
      service_category: serviceCategory,
      service_fee: serviceFee,
      govt_fee: govtFee,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tax_rate: taxRate,
      workflow_preset: workflowPreset || (serviceName.toLowerCase().includes("web") ? "website" : serviceName.toLowerCase().includes("gst") ? "gst" : "general"),
      fulfillment_stages: initialStages,
      current_stage_name: initialStages[0]?.name || "Onboarding",
      progress_percentage: 0,
      start_date: startDate,
      expected_completion_date: expectedCompletionDate,
      service_status: serviceStatus,
      assigned_employee_id: assignedEmployeeId,
      notes,
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

  // Feature: Auto-generate invoice for this service deliverable if not already covered
  if (totalAmount > 0 && newClientService?.id) {
    try {
      await autoGenerateInvoiceForClientAction(clientId, {
        serviceName,
        clientServiceId: newClientService.id,
        amount: totalAmount,
        description: `${serviceName} - Professional Deliverable`,
        dueDate: expectedCompletionDate || undefined,
      });
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

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
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
  // If an issued invoice exists, do not silently change commercial amounts (serviceFee, govtFee)
  if (hasIssuedInvoice) {
    const feeChanged = data.serviceFee !== undefined && Number(data.serviceFee) !== Number(currentService.service_fee);
    const govtFeeChanged = data.govtFee !== undefined && Number(data.govtFee) !== Number(currentService.govt_fee);
    if (feeChanged || govtFeeChanged) {
      return {
        error: "Commercial fees cannot be altered because this service is already linked to an Issued Tax Invoice. To modify amounts, please create an adjustment invoice or void/cancel the existing invoice.",
      };
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.serviceName !== undefined) updateData.service_name = data.serviceName;
  if (data.serviceCategory !== undefined) updateData.service_category = data.serviceCategory;
  if (!hasIssuedInvoice) {
    if (data.serviceFee !== undefined) updateData.service_fee = data.serviceFee;
    if (data.govtFee !== undefined) updateData.govt_fee = data.govtFee;
    if (data.serviceFee !== undefined || data.govtFee !== undefined) {
      const fee = data.serviceFee ?? Number(currentService.service_fee);
      const govt = data.govtFee ?? Number(currentService.govt_fee);
      updateData.total_amount = fee + govt;
    }
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
    const newStages: FulfillmentStage[] = newStageNames.map((name, idx) => {
      if (completedNames.has(name.toLowerCase())) {
        return { name, status: "completed" };
      }
      return { name, status: idx === 0 ? "current" : "upcoming" };
    });

    // If first stage wasn't completed, mark it current
    const currentIdx = newStages.findIndex((s) => s.status === "current");
    const completedCount = newStages.filter((s) => s.status === "completed").length;
    const newProgress = Math.round((completedCount / newStages.length) * 100);

    updateData.fulfillment_stages = newStages;
    updateData.current_stage_name = (currentIdx !== -1 ? newStages[currentIdx]?.name : newStages[0]?.name) || "In Progress";
    updateData.progress_percentage = newProgress;
  }

  const { error } = await supabase
    .from("client_services")
    .update(updateData)
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

  // Recalculate client contract value
  await syncClientContractValueAction(clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/services");
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

  // Update assigned_employee_id
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

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
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


