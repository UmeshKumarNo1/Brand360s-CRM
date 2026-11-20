"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateServiceFinancials } from "@/lib/financial/financial-calculator";

export interface DetailedServiceData {
  id: string;
  clientId: string;
  serviceName: string;
  serviceCategory: string;
  serviceStatus: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string;
  serviceFee: number;
  govtFee: number;
  totalAmount: number;
  paymentTerms: string;
  startDate: string | null;
  expectedCompletionDate: string | null;
  notes: string | null;
  vendorDetails: string;
  // Fulfillment progression
  workflowPreset?: string | null;
  taxRate?: number;
  fulfillmentStages?: any[] | null;
  currentStageName?: string | null;
  currentStageDescription?: string | null;
  progressPercentage?: number | null;
  // Financial metrics (Standardized)
  contractValue: number;
  invoicedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  paymentProgress: number;
  paymentStatus: "Paid" | "Partially Paid" | "Unpaid" | "Overdue";
  hasCommercialMismatch?: boolean;
  hasIssuedInvoice?: boolean;
  // Invoices & Payments linked to this service
  invoices: {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: string;
  }[];
  payments: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number;
    allocatedAmount: number;
    paymentMethod: string;
    status: string;
  }[];
  // Documents
  documents: {
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    status: string;
  }[];
  // Next action
  nextAction: {
    title: string;
    dueDate: string;
    status: string;
    isCompleted?: boolean;
  };
  // Activity timeline
  activities: {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    type: "create" | "invoice" | "payment" | "status" | "document";
  }[];
}

/**
 * Fetch detailed individual services for a client including linked invoices,
 * payments, allocations, documents, and chronological timeline.
 */
export async function fetchClientDetailedServicesAction(clientId: string): Promise<DetailedServiceData[]> {
  if (!clientId) return [];
  const supabase = await createClient();

  // 1. Fetch client services
  const { data: clientServices, error: csError } = await supabase
    .from("client_services")
    .select(`
      *,
      assigned_profile:profiles!assigned_employee_id (full_name),
      vendor_assignments:service_vendors (
        agreed_cost,
        vendor:vendors!vendor_id (name, company)
      ),
      documents:documents (
        id,
        document_type,
        file_name,
        file_url,
        file_size,
        created_at
      )
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (csError || !clientServices) {
    console.error("Error fetching client services:", csError);
    return [];
  }

  // 2. Fetch all invoices with line items for this client
  const { data: clientInvoices } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      issue_date,
      due_date,
      total_amount,
      amount_paid,
      balance_due,
      status,
      payment_terms,
      created_at,
      items:invoice_items (
        id,
        description,
        total,
        client_service_id
      )
    `)
    .eq("client_id", clientId)
    .order("issue_date", { ascending: false });

  // 3. Fetch all payments and allocations for this client
  const { data: clientPayments } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      payment_date,
      payment_method,
      transaction_ref,
      status,
      created_at,
      allocations:invoice_payment_allocations (
        id,
        invoice_id,
        allocated_amount,
        amount,
        client_service_id,
        invoice_item_id,
        created_at
      )
    `)
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false });

  const activeServices = (clientServices || []).filter(
    (s: any) => (s.service_status || s.status) !== "Cancelled"
  );

  // 4. Map each service with its standardized financials
  return clientServices.map((cs: any) => {
    const csId = cs.id;

    // Filter invoices matching this service (via invoice_items.client_service_id, or single service fallback)
    const matchingInvoices: any[] = [];
    (clientInvoices || []).forEach((inv: any) => {
      // Exclude void or cancelled invoices
      if (["Void", "Cancelled"].includes(inv.status)) return;

      const matchingItems = (inv.items || []).filter((item: any) => item.client_service_id === csId);
      const isSoleServiceFallback =
        clientServices.length === 1 &&
        !inv.items?.some((i: any) => i.client_service_id && i.client_service_id !== csId);

      if (matchingItems.length > 0 || isSoleServiceFallback) {
        const serviceItemTotal = matchingItems.length > 0
          ? matchingItems.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0)
          : Number(inv.total_amount) || 0;

        // Ratio of service to total invoice for allocating paid amount if multiple items exist
        const invTotal = Number(inv.total_amount) || 1;
        const serviceRatio = matchingItems.length > 0 ? serviceItemTotal / invTotal : 1;
        const invAmountPaid = Number(inv.amount_paid) || 0;
        const proportionalPaid = Math.min(serviceItemTotal, Math.round(invAmountPaid * serviceRatio * 100) / 100);
        const itemBalanceDue = Math.max(0, serviceItemTotal - proportionalPaid);

        matchingInvoices.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          issueDate: inv.issue_date,
          dueDate: inv.due_date,
          totalAmount: serviceItemTotal,
          amountPaid: proportionalPaid,
          balanceDue: itemBalanceDue,
          status: inv.status,
          createdAt: inv.created_at,
          items: matchingItems.length > 0 ? matchingItems : inv.items,
        });
      }
    });

    // Calculate collected amount specifically allocated to this service
    let serviceAllocatedAmount = 0;
    const matchingPayments: any[] = [];

    (clientPayments || []).forEach((p: any, pIdx: number) => {
      if (p.status === "Reversed" || p.status === "Cancelled" || p.status === "Failed") return;

      const matchingAllocs = (p.allocations || []).filter((a: any) => {
        if (a.client_service_id === csId) return true;
        return matchingInvoices.some((inv) => inv.id === a.invoice_id);
      });

      const allocForThisService = matchingAllocs.reduce(
        (sum: number, a: any) => sum + (Number(a.allocated_amount ?? a.amount) || 0),
        0
      );

      if (allocForThisService > 0) {
        serviceAllocatedAmount += allocForThisService;
        matchingPayments.push({
          id: p.id,
          paymentNumber: `PAY-2026-00${String(pIdx + 1).padStart(2, "0")}`,
          paymentDate: p.payment_date,
          amount: Number(p.amount) || 0,
          allocatedAmount: allocForThisService,
          paymentMethod: p.payment_method || "UPI / QR",
          status: p.status || "Received",
          createdAt: p.created_at,
        });
      }
    });

    // Fallback: If only one service exists, and payments exist but allocations table was empty
    if (clientServices.length === 1 && serviceAllocatedAmount === 0) {
      // Check if invoice itself has amount_paid
      const invoicePaidSum = matchingInvoices.reduce((sum, inv) => sum + (Number(inv.amountPaid) || 0), 0);
      if (invoicePaidSum > 0) {
        serviceAllocatedAmount = invoicePaidSum;
      } else {
        const verifiedPayments = (clientPayments || []).filter((p: any) =>
          ["Verified", "Completed", "Received"].includes(p.status) ||
          (!["Pending", "Failed", "Cancelled", "Reversed"].includes(p.status) && p.status !== undefined)
        );
        serviceAllocatedAmount = verifiedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      }
    }

    // Call Central Financial Calculator for this service
    const metrics = calculateServiceFinancials({
      service: cs,
      serviceInvoices: matchingInvoices,
      serviceAllocatedAmount,
    });

    // Check overdue status on invoices
    const nowStr = new Date().toISOString().split("T")[0];
    const hasOverdueInvoice = matchingInvoices.some(
      (inv) => inv.balanceDue > 0 && inv.dueDate && inv.dueDate < nowStr && inv.status !== "Paid"
    );

    let displayPaymentStatus: "Paid" | "Partially Paid" | "Unpaid" | "Overdue" = "Unpaid";
    if (metrics.paymentStatus === "Paid") {
      displayPaymentStatus = "Paid";
    } else if (metrics.paymentStatus === "Partial") {
      displayPaymentStatus = hasOverdueInvoice ? "Overdue" : "Partially Paid";
    } else {
      displayPaymentStatus = hasOverdueInvoice ? "Overdue" : "Unpaid";
    }

    // Vendor info
    const vendorNames = (cs.vendor_assignments || [])
      .map((va: any) => va.vendor?.name || va.vendor?.company)
      .filter(Boolean)
      .join(", ");

    // Documents
    const docs = (cs.documents || []).map((d: any) => ({
      id: d.id,
      documentType: d.document_type || "Company Document",
      fileName: d.file_name,
      fileUrl: d.file_url,
      uploadedAt: d.created_at,
      status: "Received",
    }));

    // Next Action
    const isCompleted = cs.service_status === "Completed";
    let nextAction = {
      title: metrics.outstandingAmount > 0
        ? "Collect payment of " + formatINR(metrics.outstandingAmount)
        : "Complete service filing and document submission",
      dueDate: cs.expected_completion_date || "2026-12-01",
      status: metrics.outstandingAmount > 0 ? "Due Soon" : "In Progress",
      isCompleted: false,
    };

    if (isCompleted) {
      nextAction = {
        title: "Service completed successfully",
        dueDate: cs.actual_completion_date || cs.updated_at || "-",
        status: "Completed",
        isCompleted: true,
      };
    }

    // Chronological Activity Timeline
    const activities: any[] = [];
    if (cs.created_at) {
      activities.push({
        id: `act-create-${cs.id}`,
        timestamp: cs.created_at,
        title: "Service created",
        description: `${cs.service_name} service created.`,
        type: "create",
      });
    }

    matchingInvoices.forEach((inv) => {
      activities.push({
        id: `act-inv-${inv.id}`,
        timestamp: inv.createdAt || inv.issueDate,
        title: "Invoice generated",
        description: `Invoice ${inv.invoiceNumber} for ${formatINR(inv.totalAmount)} created.`,
        type: "invoice",
      });
    });

    matchingPayments.forEach((p) => {
      activities.push({
        id: `act-pay-${p.id}`,
        timestamp: p.createdAt || p.paymentDate,
        title: "Payment received",
        description: `Payment of ${formatINR(p.allocatedAmount)} received (${p.paymentNumber}).`,
        type: "payment",
      });
    });

    if (isCompleted) {
      activities.push({
        id: `act-comp-${cs.id}`,
        timestamp: cs.actual_completion_date || cs.updated_at || new Date().toISOString(),
        title: "Service completed",
        description: `${cs.service_name} completed and marked as Completed.`,
        type: "status",
      });
    }

    activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      id: cs.id,
      clientId: cs.client_id,
      serviceName: cs.service_name,
      serviceCategory: cs.service_category || "General",
      serviceStatus: cs.service_status || "Pending",
      assignedEmployeeId: cs.assigned_employee_id || null,
      assignedEmployeeName: cs.assigned_profile?.full_name || "Unassigned",
      serviceFee: Number(cs.service_fee) || 0,
      govtFee: Number(cs.govt_fee) || 0,
      totalAmount: metrics.contractValue,
      paymentTerms: "Due on Receipt",
      startDate: cs.start_date,
      expectedCompletionDate: cs.expected_completion_date,
      notes: cs.notes,
      vendorDetails: vendorNames || "None",
      workflowPreset: cs.workflow_preset || null,
      taxRate: cs.tax_rate !== undefined && cs.tax_rate !== null ? Number(cs.tax_rate) : 18,
      fulfillmentStages: cs.fulfillment_stages || null,
      currentStageName: cs.current_stage_name || null,
      currentStageDescription: cs.current_stage_description || null,
      progressPercentage: cs.progress_percentage !== undefined && cs.progress_percentage !== null ? Number(cs.progress_percentage) : null,
      contractValue: metrics.contractValue,
      invoicedAmount: metrics.invoicedAmount,
      collectedAmount: metrics.collectedAmount,
      outstandingAmount: metrics.outstandingAmount,
      paymentProgress: metrics.paymentProgress,
      paymentStatus: displayPaymentStatus,
      hasCommercialMismatch: metrics.hasCommercialMismatch,
      hasIssuedInvoice: metrics.hasIssuedInvoice,
      invoices: matchingInvoices,
      payments: matchingPayments,
      documents: docs,
      nextAction,
      activities,
    };
  });
}

function formatINR(val: number): string {
  return "₹" + (val || 0).toLocaleString("en-IN");
}
