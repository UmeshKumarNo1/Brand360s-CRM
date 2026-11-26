"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { calculateServiceFinancials } from "@/lib/financial/financial-calculator";
import { fetchAuthorizedClientsFinancialRecords } from "@/lib/financial/financial-data-fetcher";

export interface AssignedServiceItem {
  id: string;
  clientId: string;
  clientName: string;
  clientTradeName?: string | null;
  clientCode: string;
  clientSalespersonName: string;
  clientSalespersonId: string | null;
  serviceName: string;
  serviceCategory: string;
  contractValue: number;
  paymentStatus: "Paid" | "Partially Paid" | "Unpaid" | "Not Invoiced" | "Overdue";
  invoicedAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  progressPercentage: number;
  currentStageName: string;
  currentStageDescription?: string | null;
  startDate: string | null;
  expectedCompletionDate: string | null;
  serviceStatus: string;
  nextAction: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string;
}

/**
 * Server action to fetch services assigned to the logged-in employee or all services for Admin.
 * Strictly uses the individual service assignee relationship (assigned_employee_id),
 * not the client salesperson relationship.
 */
export async function fetchAssignedServicesAction(): Promise<AssignedServiceItem[]> {
  const supabase = await createClient();
  const profile = await getCurrentUserProfileAction();

  if (!profile) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const isAdmin = profile.role === "admin";

  // Build query:
  // Admins see all assigned services.
  // Employees see only services where assigned_employee_id === user.id.
  let query = supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_category,
      service_fee,
      govt_fee,
      total_amount,
      service_status,
      start_date,
      expected_completion_date,
      current_stage_name,
      current_stage_description,
      progress_percentage,
      fulfillment_stages,
      workflow_preset,
      assigned_employee_id,
      client:clients!client_id (
        id,
        company_name,
        trade_name,
        client_code,
        client_status,
        payment_status,
        assigned_salesperson,
        salesperson_profile:profiles!assigned_salesperson (
          id,
          full_name,
          email
        )
      ),
      assigned_profile:profiles!assigned_employee_id (
        id,
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("assigned_employee_id", user.id);
  }

  const { data: services, error } = await query;

  if (error || !services) {
    console.error("Error fetching assigned services:", error);
    return [];
  }

  // Fetch invoices, payments, and payment allocations using shared financial data fetcher
  const clientIds = Array.from(new Set(services.map((s: any) => s.client_id)));
  const { invoices, payments, allocations } = await fetchAuthorizedClientsFinancialRecords(
    supabase,
    clientIds
  );

  const validPaymentIds = new Set(
    payments
      .filter((p: any) => !["Reversed", "Failed", "Cancelled", "Deleted", "Rejected"].includes(p.status))
      .map((p: any) => p.id)
  );

  return services.map((s: any) => {
    const client = Array.isArray(s.client) ? s.client[0] : s.client;
    const salespersonProfile = client?.salesperson_profile
      ? Array.isArray(client.salesperson_profile)
        ? client.salesperson_profile[0]
        : client.salesperson_profile
      : null;
    const assignedProfile = s.assigned_profile
      ? Array.isArray(s.assigned_profile)
        ? s.assigned_profile[0]
        : s.assigned_profile
      : null;

    // Filter matching invoices for this service
    const matchingInvoices = invoices.filter((inv: any) => {
      if (inv.client_id !== s.client_id) return false;
      if (inv.items && inv.items.some((it: any) => it.client_service_id === s.id)) return true;
      // Single service fallback
      const otherServices = services.filter((os: any) => os.client_id === s.client_id && os.id !== s.id);
      if (otherServices.length === 0 && !inv.items?.some((it: any) => it.client_service_id && it.client_service_id !== s.id)) {
        return true;
      }
      return false;
    });

    const matchingInvIds = new Set(matchingInvoices.map((i: any) => i.id));
    let serviceAllocatedAmount = allocations
      .filter(
        (a: any) =>
          (!a.payment_id || validPaymentIds.has(a.payment_id)) &&
          (a.client_service_id === s.id || matchingInvIds.has(a.invoice_id))
      )
      .reduce((sum: number, a: any) => sum + (Number(a.allocated_amount) || 0), 0);

    const metrics = calculateServiceFinancials({
      service: s,
      serviceInvoices: matchingInvoices,
      serviceAllocatedAmount,
    });

    // Compute live fulfillment & stages
    const fulfillment = computeServiceFulfillment(s);

    // Determine dynamic next action
    let nextAction = "Review Deliverables";
    if (s.service_status === "Completed") {
      nextAction = "Completed";
    } else if (fulfillment.currentStageName) {
      nextAction = `Execute: ${fulfillment.currentStageName}`;
    } else if (s.expected_completion_date) {
      nextAction = `Target: ${s.expected_completion_date}`;
    }

    return {
      id: s.id,
      clientId: s.client_id,
      clientName: client?.company_name || "Unknown Client",
      clientTradeName: client?.trade_name || null,
      clientCode: client?.client_code || "N/A",
      clientSalespersonName: salespersonProfile?.full_name || "Unassigned",
      clientSalespersonId: client?.assigned_salesperson || null,
      serviceName: s.service_name,
      serviceCategory: s.service_category || "General",
      contractValue: metrics.contractValue,
      paymentStatus: (metrics.paymentStatus === "Partial" ? "Partially Paid" : metrics.paymentStatus) as AssignedServiceItem["paymentStatus"],
      invoicedAmount: metrics.invoicedAmount,
      amountPaid: metrics.collectedAmount,
      outstandingAmount: metrics.outstandingAmount,
      progressPercentage: fulfillment.progressPercentage,
      currentStageName: fulfillment.currentStageName || s.current_stage_name || "In Progress",
      currentStageDescription: s.current_stage_description || null,
      startDate: s.start_date || null,
      expectedCompletionDate: s.expected_completion_date || null,
      serviceStatus: s.service_status || "Pending",
      nextAction,
      assignedEmployeeId: s.assigned_employee_id,
      assignedEmployeeName: assignedProfile?.full_name || "Unassigned",
    };
  });
}
