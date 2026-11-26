"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Maximize2 } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface RevenueChartProps {
  data?: { interval: string; invoiced: number; received: number }[];
  periodLabel?: string;
  totalInvoiced?: number;
  totalReceived?: number;
}

export function RevenueChart({ 
  data = [], 
  periodLabel = "This Month",
  totalInvoiced = 5840000,
  totalReceived = 4275000,
}: RevenueChartProps) {
  // Fallback intervals matching the design if no data
  const chartData = data.length > 0 ? data : [
    { interval: "1 - 7 Jan", invoiced: 840000, received: 500000 },
    { interval: "8 - 14 Jan", invoiced: 950000, received: 720000 },
    { interval: "15 - 21 Jan", invoiced: 1620000, received: 1350000 },
    { interval: "22 - 28 Jan", invoiced: 1980000, received: 1650000 },
    { interval: "29 - 31 Jan", invoiced: 850000, received: 550000 },
  ];

  const calcTotalInvoiced = totalInvoiced > 0 
    ? totalInvoiced 
    : chartData.reduce((sum, d) => sum + d.invoiced, 0);

  const calcTotalReceived = totalReceived > 0 
    ? totalReceived 
    : chartData.reduce((sum, d) => sum + d.received, 0);

  const formatYAxis = (value: number) => {
    if (value === 0) return "₹0";
    if (value >= 100000) return `₹${Math.round(value / 100000)}L`;
    return `₹${Math.round(value / 1000)}k`;
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Revenue Trend</h3>
          <p className="text-xs text-slate-500">Invoiced vs. Payments Received</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#0481A2] bg-[#E0F2F7] border border-[#CBE5ED] px-2.5 py-1 rounded-lg">
            {periodLabel}
          </span>
          <button 
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            title="Expand"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[210px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="interval" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: "#64748B" }} 
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: "#64748B" }} 
            />
            <Tooltip
              formatter={(value: any) => [`₹${(Number(value) || 0).toLocaleString('en-IN')}`, ""]}
              contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            />
            <Bar dataKey="invoiced" name="Invoiced Amount" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={13} />
            <Bar dataKey="received" name="Payments Received" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={13} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Bottom Legend matching image */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shrink-0" />
          <span>Invoiced Amount ({formatINR(calcTotalInvoiced)})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A] shrink-0" />
          <span>Payments Received ({formatINR(calcTotalReceived)})</span>
        </div>
      </div>
    </div>
  );
}
