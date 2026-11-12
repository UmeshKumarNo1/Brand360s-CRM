"use server";

import { createClient } from "@/lib/supabase/server";

export interface ReportSummaryKpis {
  totalRevenue: number;
  paymentsReceived: number;
  outstandingReceivables: number;
  totalInvoiced: number;
  newClients: number;
  activeServices: number;
}

export interface MonthlyRevenueData {
  month: string;
  invoiced: number;
  received: number;
  outstanding: number;
}

export interface SalespersonPerformanceData {
  id: string;
  name: string;
  clientsAssigned: number;
  totalRevenue: number;
  collectedRevenue: number;
  followupsCount: number;
}

export interface ServiceBreakdownData {
  serviceName: string;
  category: string;
  activeCount: number;
  completedCount: number;
  pendingCount: number;
  renewalsDueCount: number;
  totalValue: number;
}

export interface ClientGrowthData {
  month: string;
  activeCount: number;
  archivedCount: number;
  totalCount: number;
}

export interface ComprehensiveReportData {
  kpis: ReportSummaryKpis;
  monthlyRevenue: MonthlyRevenueData[];
  salespersonPerformance: SalespersonPerformanceData[];
  serviceBreakdown: ServiceBreakdownData[];
  clientGrowth: ClientGrowthData[];
}

export async function fetchComprehensiveReportsAction(
  dateRange: "this-month" | "last-month" | "last-3-months" | "last-6-months" | "this-year" | "all" = "all"
): Promise<ComprehensiveReportData> {
  const supabase = await createClient();

  // Determine date boundary
  const now = new Date();
  let fromDate: Date | null = null;

  if (dateRange === "this-month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateRange === "last-month") {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (dateRange === "last-3-months") {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  } else if (dateRange === "last-6-months") {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  } else if (dateRange === "this-year") {
    fromDate = new Date(now.getFullYear(), 0, 1);
  }

  // Fetch all primary datasets with RLS respecting current user permissions
  const [
    { data: clients },
    { data: payments },
    { data: invoices },
    { data: services },
    { data: followups },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("payments").select("*").eq("is_verified", true),
    supabase.from("invoices").select("*"),
    supabase.from("client_services").select("*"),
    supabase.from("follow_ups").select("*"),
    supabase.from("profiles").select("id, full_name, email, role"),
  ]);

  const allClients = clients || [];
  const allPayments = payments || [];
  const allInvoices = invoices || [];
  const allServices = services || [];
  const allFollowups = followups || [];
  const allProfiles = profiles || [];

  // Filter items by fromDate if selected
  const filteredClients = fromDate
    ? allClients.filter((c) => new Date(c.created_at) >= fromDate!)
    : allClients;

  const filteredPayments = fromDate
    ? allPayments.filter((p) => new Date(p.payment_date || p.created_at) >= fromDate!)
    : allPayments;

  const filteredInvoices = fromDate
    ? allInvoices.filter((i) => new Date(i.issue_date || i.created_at) >= fromDate!)
    : allInvoices;

  // 1. KPI Calculations
  const totalRevenue = allClients.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0);
  const paymentsReceived = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
  const outstandingReceivables = allClients.reduce((sum, c) => sum + (Number(c.balance_receivable) || 0), 0);
  const newClients = filteredClients.length;
  const activeServices = allServices.filter((s) => s.service_status === "Processing" || s.service_status === "New").length;

  const kpis: ReportSummaryKpis = {
    totalRevenue,
    paymentsReceived,
    outstandingReceivables,
    totalInvoiced,
    newClients,
    activeServices,
  };

  // 2. Monthly Revenue Trend (Last 6 Months)
  const monthlyRevenueMap: Record<string, { invoiced: number; received: number; outstanding: number }> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyRevenueMap[key] = { invoiced: 0, received: 0, outstanding: 0 };
  }

  allInvoices.forEach((inv) => {
    const d = new Date(inv.issue_date || inv.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (monthlyRevenueMap[key]) {
      monthlyRevenueMap[key].invoiced += Number(inv.total_amount) || 0;
    }
  });

  allPayments.forEach((pmt) => {
    const d = new Date(pmt.payment_date || pmt.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (monthlyRevenueMap[key]) {
      monthlyRevenueMap[key].received += Number(pmt.amount) || 0;
    }
  });

  const monthlyRevenue: MonthlyRevenueData[] = Object.entries(monthlyRevenueMap).map(
    ([month, val]) => ({
      month,
      invoiced: val.invoiced,
      received: val.received,
      outstanding: Math.max(0, val.invoiced - val.received),
    })
  );

  // 3. Salesperson Performance
  const salespersonPerformance: SalespersonPerformanceData[] = allProfiles.map((p) => {
    const assignedClients = allClients.filter((c) => c.assigned_salesperson === p.id);
    const clientIds = new Set(assignedClients.map((c) => c.id));
    const totalRev = assignedClients.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0);
    const collectedRev = allPayments
      .filter((pmt) => clientIds.has(pmt.client_id))
      .reduce((sum, pmt) => sum + (Number(pmt.amount) || 0), 0);
    const followupsCount = allFollowups.filter((f) => f.assigned_to === p.id).length;

    return {
      id: p.id,
      name: p.full_name || p.email.split("@")[0],
      clientsAssigned: assignedClients.length,
      totalRevenue: totalRev,
      collectedRevenue: collectedRev,
      followupsCount,
    };
  });

  // 4. Service Breakdown
  const serviceMap: Record<string, ServiceBreakdownData> = {};
  allServices.forEach((s) => {
    const sName = s.service_name || "General Service";
    if (!serviceMap[sName]) {
      serviceMap[sName] = {
        serviceName: sName,
        category: s.service_category || "General",
        activeCount: 0,
        completedCount: 0,
        pendingCount: 0,
        renewalsDueCount: 0,
        totalValue: 0,
      };
    }

    serviceMap[sName].totalValue += Number(s.total_amount || s.service_fee || 0);

    if (s.service_status === "Completed") {
      serviceMap[sName].completedCount++;
    } else if (s.service_status === "Processing" || s.service_status === "Waiting for Approval") {
      serviceMap[sName].activeCount++;
    } else {
      serviceMap[sName].pendingCount++;
    }

    if (s.renewal_date) {
      const renDate = new Date(s.renewal_date);
      const diffDays = Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        serviceMap[sName].renewalsDueCount++;
      }
    }
  });

  const serviceBreakdown = Object.values(serviceMap);

  // 5. Client Growth Data
  const clientGrowthMap: Record<string, { active: number; archived: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    clientGrowthMap[key] = { active: 0, archived: 0 };
  }

  allClients.forEach((c) => {
    const d = new Date(c.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (clientGrowthMap[key]) {
      if (c.client_status === "Archived") {
        clientGrowthMap[key].archived++;
      } else {
        clientGrowthMap[key].active++;
      }
    }
  });

  const clientGrowth: ClientGrowthData[] = Object.entries(clientGrowthMap).map(
    ([month, val]) => ({
      month,
      activeCount: val.active,
      archivedCount: val.archived,
      totalCount: val.active + val.archived,
    })
  );

  return {
    kpis,
    monthlyRevenue,
    salespersonPerformance,
    serviceBreakdown,
    clientGrowth,
  };
}
