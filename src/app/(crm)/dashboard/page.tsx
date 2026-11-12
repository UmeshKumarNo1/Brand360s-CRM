import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKpiRow } from "@/components/dashboard/DashboardKpiRow";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceStatusChart } from "@/components/dashboard/ServiceStatusChart";
import { UpcomingFollowups } from "@/components/dashboard/UpcomingFollowups";
import { RecentClientsTable } from "@/components/dashboard/RecentClientsTable";
import { TasksAlerts } from "@/components/dashboard/TasksAlerts";
import { getCurrentUserProfileAction } from "@/app/actions/profile";
import { fetchClientsAction } from "@/app/actions/clients";
import { fetchRenewalsAction } from "@/app/actions/renewals";
import { fetchFollowupsAction } from "@/app/actions/followups";

export default async function DashboardPage() {
  const [profile, rawClients, renewals, followups] = await Promise.all([
    getCurrentUserProfileAction(),
    fetchClientsAction(),
    fetchRenewalsAction(),
    fetchFollowupsAction(),
  ]);

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "User";
  const userRole = profile?.role === "admin" ? "Administrator" : "Employee";

  // Calculate actual statistics from user's visible clients (enforced by RLS)
  const totalClients = rawClients.length;
  const totalContract = rawClients.reduce((sum, c) => sum + (Number(c.contract_value) || 0), 0);
  const totalReceived = rawClients.reduce((sum, c) => sum + (Number(c.payments_received) || 0), 0);
  const totalOutstanding = rawClients.reduce((sum, c) => sum + (Number(c.balance_receivable) || 0), 0);
  const overdueCount = rawClients.filter((c) => c.payment_status === "Overdue").length;

  const renewalsDueCount = renewals.filter((r) => r.status === "Due Soon" || r.status === "Overdue").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const followupsTodayCount = followups.filter((f) => f.dueDate === todayStr && f.status !== "Completed").length;

  return (
    <div className="space-y-5">
      {/* Header with real user greeting */}
      <DashboardHeader userName={userName} userRole={userRole} />

      {/* KPI Cards calculated from real database records */}
      <DashboardKpiRow 
        totalClients={totalClients}
        paymentsReceived={totalReceived}
        outstanding={totalOutstanding}
      />

      {/* 3-column charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <RevenueChart invoiced={totalContract} received={totalReceived} />
        </div>
        <div className="lg:col-span-4">
          <ServiceStatusChart clientsCount={totalClients} />
        </div>
        <div className="lg:col-span-3">
          <UpcomingFollowups />
        </div>
      </div>

      {/* 2-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <RecentClientsTable clients={rawClients.slice(0, 5)} />
        </div>
        <div className="lg:col-span-5">
          <TasksAlerts 
            overdueCount={overdueCount} 
            renewalsDueCount={renewalsDueCount}
            followupsTodayCount={followupsTodayCount}
          />
        </div>
      </div>
    </div>
  );
}
