"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { computeServiceFulfillment } from "@/lib/services/fulfillment-workflows";

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
          .select("id, client_id, total_amount, amount_paid, balance_due, status")
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

  // Map allocations by service
  const paidByService: Record<string, number> = {};
  allocations.forEach((a: any) => {
    if (a.client_service_id) {
      paidByService[a.client_service_id] =
        (paidByService[a.client_service_id] || 0) + (Number(a.allocated_amount) || 0);
    }
  });

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

    const contractVal =
      Number(s.total_amount) ||
      (Number(s.service_fee) || 0) + (Number(s.govt_fee) || 0);

    const amountPaid = paidByService[s.id] || 0;
    const outstanding = Math.max(0, contractVal - amountPaid);

    // Compute live fulfillment & stages
    const fulfillment = computeServiceFulfillment(s);

    // Determine payment status
    let paymentStatus: AssignedServiceItem["paymentStatus"] = "Unpaid";
    if (amountPaid >= contractVal - 0.01 && contractVal > 0) {
      paymentStatus = "Paid";
    } else if (amountPaid > 0.01) {
      paymentStatus = "Partially Paid";
    } else if (client?.payment_status === "Overdue") {
      paymentStatus = "Overdue";
    } else {
      paymentStatus = "Unpaid";
    }

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
      contractValue: contractVal,
      paymentStatus,
      invoicedAmount: contractVal,
      amountPaid,
      outstandingAmount: outstanding,
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
