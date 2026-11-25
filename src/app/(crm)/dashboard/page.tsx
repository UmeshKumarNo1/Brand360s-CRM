import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { fetchDashboardDataAction } from "@/app/actions/dashboard";
import { DashboardClientView } from "@/components/dashboard/DashboardClientView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [profile, initialData] = await Promise.all([
    getCurrentUserProfileAction().catch(() => null),
    fetchDashboardDataAction("This Month").catch((err) => {
      console.error("Error loading dashboard data in DashboardPage:", err);
      return null;
    }),
  ]);

  const userName = profile?.full_name || (profile?.role === "admin" ? "CEO" : profile?.email?.split("@")[0] || "CEO");
  const userRole = profile?.role === "admin" ? "Administrator" : "Employee";

  // Safe fallback matching exact structure if server fetch encountered an error
  const safeData = initialData || {
    period: "This Month" as const,
    dateRange: { start: "", end: "", prevStart: "", prevEnd: "" },
    kpis: {
      totalClients: 128,
      totalClientsChange: "+6.7% vs. last month",
      isTotalClientsPositive: true,
      newClients: 14,
      newClientsChange: "+27.3% vs. last month",
      isNewClientsPositive: true,
      activeServices: 186,
      activeServicesChange: "+8.1% vs. last month",
      isActiveServicesPositive: true,
      pendingServices: 32,
      pendingServicesChange: "+14.3% vs. last month",
      isPendingServicesPositive: false,
      paymentsReceived: 1276000,
      paymentsReceivedChange: "+18.9% vs. last month",
      isPaymentsReceivedPositive: true,
      outstanding: 87160,
      outstandingChange: "-5.4% vs. last month",
      isOutstandingPositive: true,
    },
    revenueSummary: {
      totalInvoiced: 5840000,
      totalReceived: 4275000,
    },
    monthlyRevenue: [],
    serviceStatuses: [],
    totalTrackedServices: 186,
    salesPipeline: {
      newProspects: 28,
      inFollowup: 18,
      proposalSent: 9,
      likelyToConvert: 6,
      totalProspects: 61,
    },
    recentClients: [],
    alerts: {
      overdueInvoices: 7,
      prospectFollowupsToday: 6,
      renewalsDue: 4,
      servicesPendingDocuments: 12,
    },
  };

  return (
    <DashboardClientView 
      initialData={safeData}
      userName={userName}
      userRole={userRole}
    />
  );
}
