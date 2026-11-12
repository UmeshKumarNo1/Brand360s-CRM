"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchComprehensiveReportsAction,
  ComprehensiveReportData,
} from "@/app/actions/reports";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { ReportStatsCards } from "@/components/reports/ReportStatsCards";
import { ReportsContentTabs } from "@/components/reports/ReportsContentTabs";
import { Calendar, Filter } from "lucide-react";
import { useToast } from "@/components/common/ToastProvider";

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ComprehensiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<
    "this-month" | "last-month" | "last-3-months" | "last-6-months" | "this-year" | "all"
  >("all");

  const { error: toastError, success: toastSuccess } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchComprehensiveReportsAction(dateRange);
      setReportData(data);
    } catch {
      toastError("Error", "Could not load report metrics.");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    if (!reportData) return;

    // Build CSV content
    const rows = [
      ["Metric", "Value"],
      ["Total Contract Revenue", reportData.kpis.totalRevenue.toString()],
      ["Verified Payments Received", reportData.kpis.paymentsReceived.toString()],
      ["Outstanding Receivables", reportData.kpis.outstandingReceivables.toString()],
      ["Total Invoiced", reportData.kpis.totalInvoiced.toString()],
      ["New Clients", reportData.kpis.newClients.toString()],
      ["Active Services", reportData.kpis.activeServices.toString()],
      [],
      ["Billing Month", "Invoiced", "Received", "Outstanding"],
      ...reportData.monthlyRevenue.map((m) => [
        m.month,
        m.invoiced.toString(),
        m.received.toString(),
        m.outstanding.toString(),
      ]),
      [],
      ["Employee", "Assigned Clients", "Total Value", "Collected", "Follow-ups"],
      ...reportData.salespersonPerformance.map((sp) => [
        sp.name,
        sp.clientsAssigned.toString(),
        sp.totalRevenue.toString(),
        sp.collectedRevenue.toString(),
        sp.followupsCount.toString(),
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `brand360s_crm_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toastSuccess("Report Exported", "Summary report CSV generated and downloaded.");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Export */}
      <ReportsHeader
        onRefresh={loadData}
        isLoading={isLoading}
        onExportCsv={handleExportCsv}
      />

      {/* 2. Date Range Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1B3260]">
          <Calendar size={15} className="text-[#0481A2]" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All Time" },
              { key: "this-month", label: "This Month" },
              { key: "last-month", label: "Last Month" },
              { key: "last-3-months", label: "Last 3 Months" },
              { key: "last-6-months", label: "Last 6 Months" },
              { key: "this-year", label: "This Year" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setDateRange(item.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
                dateRange === item.key
                  ? "bg-[#243E76] text-white shadow-2xs font-semibold"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      {reportData && <ReportStatsCards kpis={reportData.kpis} />}

      {/* 4. Categorized Reports Tabs */}
      {reportData && (
        <ReportsContentTabs
          monthlyRevenue={reportData.monthlyRevenue}
          salespersonPerformance={reportData.salespersonPerformance}
          serviceBreakdown={reportData.serviceBreakdown}
          clientGrowth={reportData.clientGrowth}
        />
      )}
    </div>
  );
}
