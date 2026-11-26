"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";
import { calculateServiceFinancials } from "@/lib/financial/financial-calculator";

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

  // Fetch invoice payment allocations and invoices to accurately calculate payment status per service
  const serviceIds = services.map((s: any) => s.id);
  const clientIds = Array.from(new Set(services.map((s: any) => s.client_id)));

  const [invoicesRes, allocsRes] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from("invoices")
          .select("id, client_id, subtotal, tax_amount, total_amount, amount_paid, balance_due, status, items:invoice_items(id, unit_price, quantity, tax_amount, total, client_service_id)")
          .in("client_id", clientIds)
          .not("status", "in", '("Draft","Void","Cancelled")')
      : Promise.resolve({ data: [] }),
    serviceIds.length > 0
      ? supabase
          .from("invoice_payment_allocations")
          .select("invoice_id, client_service_id, allocated_amount")
          .in("client_service_id", serviceIds)
      : Promise.resolve({ data: [] }),
  ]);

  const invoices = invoicesRes.data || [];
  const allocations = allocsRes.data || [];

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
      .filter((a: any) => a.client_service_id === s.id || matchingInvIds.has(a.invoice_id))
      .reduce((sum: number, a: any) => sum + (Number(a.allocated_amount) || 0), 0);

    if (serviceAllocatedAmount === 0 && matchingInvoices.length > 0) {
      serviceAllocatedAmount = matchingInvoices.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0);
    }

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
