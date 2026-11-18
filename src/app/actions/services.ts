"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { autoGenerateInvoiceForClientAction } from "@/app/actions/invoices";
import { uploadClientServiceDocumentAction } from "@/app/actions/documents";

export interface ServiceActionState {
  error?: string | null;
  success?: boolean;
}

export async function fetchServicesCatalogAction() {
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
      .select("id, client_service_id, total");

    (invoiceItems || []).forEach((item: any) => {
      if (item.client_service_id && serviceIds.includes(item.client_service_id)) {
        invoicedByService[item.client_service_id] =
          (invoicedByService[item.client_service_id] || 0) + (Number(item.total) || 0);
      }
    });
  }

  return (data || []).map((s: any) => {
    const contractVal = Number(s.total_amount) || (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);
    const amountPaid = paidByService[s.id] || 0;
    const invoicedAmt = invoicedByService[s.id] || contractVal;

    let paymentStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
    if (contractVal > 0 && amountPaid >= contractVal - 0.009) {
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
  const expectedCompletionDate = (formData.get("expected_completion_date") as string) || null;
  const serviceStatus = (formData.get("service_status") as string) || "Pending";
  const assignedEmployeeId = (formData.get("assigned_employee_id") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!clientId || !serviceName) {
    return { error: "Client and service name are required." };
  }

  const totalAmount = serviceFee + govtFee;

  const { data: newClientService, error } = await supabase
    .from("client_services")
    .insert({
      client_id: clientId,
      service_name: serviceName,
      service_category: serviceCategory,
      service_fee: serviceFee,
      govt_fee: govtFee,
      total_amount: totalAmount,
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

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/invoices");
  revalidatePath("/payments");
  return { success: true };
}

export async function removeClientServiceAction(serviceId: string, clientId: string): Promise<ServiceActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("client_services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    return { error: error.message };
  }

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
    revalidatePath(`/clients/${clientId}`);
  }
  revalidatePath("/clients");
  revalidatePath("/services");
  revalidatePath("/reports");
  return { success: true };
}
