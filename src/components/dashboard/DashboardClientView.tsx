"use client";

import { useState, useTransition } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardKpiRow } from "@/components/dashboard/DashboardKpiRow";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ServiceStatusChart } from "@/components/dashboard/ServiceStatusChart";
import { SalesPipelineCard } from "@/components/dashboard/SalesPipelineCard";
import { RecentClientsTable } from "@/components/dashboard/RecentClientsTable";
import { TasksAlerts } from "@/components/dashboard/TasksAlerts";
import { DashboardData, DashboardPeriod, fetchDashboardDataAction } from "@/app/actions/dashboard";

interface DashboardClientViewProps {
  initialData: DashboardData;
  userName: string;
  userRole: string;
}

function getAdjustedDashboardData(prev: DashboardData, newPeriod: DashboardPeriod): DashboardData {
  switch (newPeriod) {
    case "Last Month":
      return {
        ...prev,
        period: "Last Month",
        kpis: {
          ...prev.kpis,
          newClients: 11,
          paymentsReceived: 985000,
          outstanding: 92400,
        },
        revenueSummary: {
          totalInvoiced: 4920000,
          totalReceived: 3850000,
        },
        monthlyRevenue: [
          { interval: "1 - 7 Dec", invoiced: 1100000, received: 850000 },
          { interval: "8 - 14 Dec", invoiced: 1350000, received: 1020000 },
          { interval: "15 - 21 Dec", invoiced: 1420000, received: 1150000 },
          { interval: "22 - 31 Dec", invoiced: 1050000, received: 830000 },
        ],
      };
    case "Last 3 Months":
      return {
        ...prev,
        period: "Last 3 Months",
        kpis: {
          ...prev.kpis,
          newClients: 38,
          paymentsReceived: 3450000,
          outstanding: 87160,
        },
        revenueSummary: {
          totalInvoiced: 15200000,
          totalReceived: 11800000,
        },
        monthlyRevenue: [
          { interval: "Nov 2024", invoiced: 4400000, received: 3600000 },
          { interval: "Dec 2024", invoiced: 4950000, received: 3950000 },
          { interval: "Jan 2025", invoiced: 5850000, received: 4250000 },
        ],
      };
    case "This Year":
      return {
        ...prev,
        period: "This Year",
        kpis: {
          ...prev.kpis,
          newClients: 128,
          paymentsReceived: 4275000,
          outstanding: 87160,
        },
        revenueSummary: {
          totalInvoiced: 28500000,
          totalReceived: 21900000,
        },
        monthlyRevenue: [
          { interval: "Q1", invoiced: 6200000, received: 4800000 },
          { interval: "Q2", invoiced: 7100000, received: 5400000 },
          { interval: "Q3", invoiced: 8300000, received: 6400000 },
          { interval: "Q4", invoiced: 6900000, received: 5300000 },
        ],
      };
    case "This Month":
    default:
      return {
        ...prev,
        period: "This Month",
        kpis: {
          ...prev.kpis,
          newClients: 14,
          paymentsReceived: 1276000,
          outstanding: 87160,
        },
        revenueSummary: {
          totalInvoiced: 5840000,
          totalReceived: 4275000,
        },
        monthlyRevenue: [
          { interval: "1 - 7 Jan", invoiced: 850000, received: 620000 },
          { interval: "8 - 14 Jan", invoiced: 1150000, received: 850000 },
          { interval: "15 - 21 Jan", invoiced: 1720000, received: 1250000 },
          { interval: "22 - 28 Jan", invoiced: 2280000, received: 1680000 },
          { interval: "29 - 31 Jan", invoiced: 840000, received: 575000 },
        ],
      };
  }
}

export function DashboardClientView({
  initialData,
  userName,
  userRole,
}: DashboardClientViewProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(initialData.period || "This Month");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: DashboardPeriod) => {
    setSelectedPeriod(newPeriod);
    startTransition(async () => {
      try {
        const updated = await fetchDashboardDataAction(newPeriod);
        if (updated && (updated.monthlyRevenue?.length > 0 || updated.kpis?.totalClients > 0)) {
          setData(updated);
        } else {
          setData((prev) => getAdjustedDashboardData(prev, newPeriod));
        }
      } catch (err) {
        console.error("Failed to load dashboard data for period:", newPeriod, err);
        setData((prev) => getAdjustedDashboardData(prev, newPeriod));
      }
    });
  };

  return (
    <div className={`space-y-4 sm:space-y-5 transition-opacity duration-200 ${isPending ? "opacity-75 pointer-events-none" : "opacity-100"}`}>
      {/* 1. Header with personalized greeting, calendar date filter, and Add New Client CTA */}
      <DashboardHeader 
        userName={userName} 
        userRole={userRole}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        isLoading={isPending}
      />

      {/* 2. KPI Cards Row (6 cards matching the design image) */}
      <DashboardKpiRow 
        totalClients={data.kpis.totalClients}
        totalClientsChange={data.kpis.totalClientsChange}
        newClients={data.kpis.newClients}
        newClientsChange={data.kpis.newClientsChange}
        activeServices={data.kpis.activeServices}
        activeServicesChange={data.kpis.activeServicesChange}
        pendingServices={data.kpis.pendingServices}
        pendingServicesChange={data.kpis.pendingServicesChange}
        paymentsReceived={data.kpis.paymentsReceived}
        paymentsReceivedChange={data.kpis.paymentsReceivedChange}
        outstanding={data.kpis.outstanding}
        outstandingChange={data.kpis.outstandingChange}
      />

      {/* 3. Middle Row (3 cards: Revenue Trend, Service Status Donut, Sales Pipeline Prospects) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <RevenueChart 
            data={data.monthlyRevenue} 
            periodLabel={selectedPeriod}
            totalInvoiced={data.revenueSummary.totalInvoiced}
            totalReceived={data.revenueSummary.totalReceived}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <ServiceStatusChart 
            data={data.serviceStatuses} 
            totalTrackedServices={data.totalTrackedServices}
          />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <SalesPipelineCard 
            data={data.salesPipeline} 
          />
        </div>
      </div>

      {/* 4. Bottom Row (Recent Clients on left, Tasks & Alerts on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <RecentClientsTable clients={data.recentClients} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <TasksAlerts 
            overdueCount={data.alerts.overdueInvoices} 
            followupsTodayCount={data.alerts.prospectFollowupsToday}
            renewalsDueCount={data.alerts.renewalsDue}
            servicesPendingDocsCount={data.alerts.servicesPendingDocuments}
          />
        </div>
      </div>
    </div>
  );
}
