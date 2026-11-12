"use client";

import { useState } from "react";
import { formatINR } from "@/lib/utils";
import {
  MonthlyRevenueData,
  SalespersonPerformanceData,
  ServiceBreakdownData,
  ClientGrowthData,
} from "@/app/actions/reports";
import {
  TrendingUp,
  Users,
  Award,
  Layers,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";

interface ReportsContentTabsProps {
  monthlyRevenue: MonthlyRevenueData[];
  salespersonPerformance: SalespersonPerformanceData[];
  serviceBreakdown: ServiceBreakdownData[];
  clientGrowth: ClientGrowthData[];
}

export function ReportsContentTabs({
  monthlyRevenue,
  salespersonPerformance,
  serviceBreakdown,
  clientGrowth,
}: ReportsContentTabsProps) {
  const [activeTab, setActiveTab] = useState<"financial" | "clients" | "employees" | "services">("financial");

  return (
    <div className="space-y-4">
      {/* Navigation Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          onClick={() => setActiveTab("financial")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "financial"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <TrendingUp size={13} />
          <span>Financial Reports</span>
        </button>

        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "clients"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users size={13} />
          <span>Client Growth & Acquisition</span>
        </button>

        <button
          onClick={() => setActiveTab("employees")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "employees"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Award size={13} />
          <span>Employee Sales Performance</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "services"
              ? "bg-[#243E76] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Layers size={13} />
          <span>Services & Fulfillment</span>
        </button>
      </div>

      {/* Tab 1: Financial Reports */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-[#1B3260]">Monthly Collection & Billing Summary</h3>
              <span className="text-xs text-slate-400">Past 6 Months Overview</span>
            </div>
            <div className="overflow-x-auto xl:overflow-x-visible min-w-[700px] xl:min-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#243E76] text-white font-semibold">
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">Total Invoiced</th>
                    <th className="py-3 px-4">Payments Collected</th>
                    <th className="py-3 px-4">Outstanding Variance</th>
                    <th className="py-3 px-4 text-right">Collection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRevenue.map((m) => {
                    const rate = m.invoiced > 0 ? Math.min(100, Math.round((m.received / m.invoiced) * 100)) : 100;
                    return (
                      <tr key={m.month} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{m.month}</td>
                        <td className="py-3 px-4 font-number text-slate-900 font-semibold">{formatINR(m.invoiced)}</td>
                        <td className="py-3 px-4 font-number text-emerald-700 font-semibold">{formatINR(m.received)}</td>
                        <td className="py-3 px-4 font-number text-amber-700">{formatINR(m.outstanding)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            rate >= 80 ? "bg-emerald-50 text-emerald-700" : rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Client Reports */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-[#1B3260]">Monthly Account Onboarding & Retention</h3>
              <span className="text-xs text-slate-400">Total Client Trajectory</span>
            </div>
            <div className="overflow-x-auto xl:overflow-x-visible min-w-[700px] xl:min-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#243E76] text-white font-semibold">
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Active Accounts</th>
                    <th className="py-3 px-4">Archived Accounts</th>
                    <th className="py-3 px-4">Total Accounts Registered</th>
                    <th className="py-3 px-4 text-right">Active Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientGrowth.map((cg) => {
                    const ratio = cg.totalCount > 0 ? Math.round((cg.activeCount / cg.totalCount) * 100) : 100;
                    return (
                      <tr key={cg.month} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{cg.month}</td>
                        <td className="py-3 px-4 font-medium text-emerald-700">{cg.activeCount}</td>
                        <td className="py-3 px-4 font-medium text-slate-400">{cg.archivedCount}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{cg.totalCount}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                            {ratio}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Employee Sales Performance */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-[#1B3260]">Salesperson Client Acquisition & Revenue Collection</h3>
              <span className="text-xs text-slate-400">Individual Performance Metrics</span>
            </div>
            <div className="overflow-x-auto xl:overflow-x-visible min-w-[700px] xl:min-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#243E76] text-white font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Clients Managed</th>
                    <th className="py-3 px-4">Total Contract Value</th>
                    <th className="py-3 px-4">Revenue Collected</th>
                    <th className="py-3 px-4">Follow-ups Logged</th>
                    <th className="py-3 px-4 text-right">Collection Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salespersonPerformance.map((sp) => {
                    const eff = sp.totalRevenue > 0 ? Math.round((sp.collectedRevenue / sp.totalRevenue) * 100) : 0;
                    return (
                      <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{sp.name}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{sp.clientsAssigned} clients</td>
                        <td className="py-3 px-4 font-bold font-number text-slate-800">{formatINR(sp.totalRevenue)}</td>
                        <td className="py-3 px-4 font-bold font-number text-emerald-700">{formatINR(sp.collectedRevenue)}</td>
                        <td className="py-3 px-4 text-slate-600">{sp.followupsCount} tasks</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            eff >= 70 ? "bg-emerald-50 text-emerald-700" : eff >= 40 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {eff}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Service Reports */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-sm text-[#1B3260]">Service Delivery & Renewal Volume</h3>
              <span className="text-xs text-slate-400">All Client Services Breakdown</span>
            </div>
            <div className="overflow-x-auto xl:overflow-x-visible min-w-[700px] xl:min-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#243E76] text-white font-semibold">
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Active Jobs</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">Renewals Due</th>
                    <th className="py-3 px-4 text-right">Cumulative Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No service assignments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    serviceBreakdown.map((s) => (
                      <tr key={s.serviceName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.serviceName}</td>
                        <td className="py-3 px-4 text-slate-500">{s.category}</td>
                        <td className="py-3 px-4 font-medium text-blue-700">{s.activeCount}</td>
                        <td className="py-3 px-4 font-medium text-emerald-700">{s.completedCount}</td>
                        <td className="py-3 px-4 font-medium text-amber-700">{s.renewalsDueCount}</td>
                        <td className="py-3 px-4 text-right font-bold font-number text-slate-900">
                          {formatINR(s.totalValue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
