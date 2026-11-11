"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

interface RevenueChartProps {
  invoiced?: number;
  received?: number;
}

export function RevenueChart({ invoiced = 3120000, received = 2480000 }: RevenueChartProps) {
  const data = [
    { month: "Aug", invoiced: Math.round(invoiced * 0.5), received: Math.round(received * 0.55) },
    { month: "Sep", invoiced: Math.round(invoiced * 0.6), received: Math.round(received * 0.65) },
    { month: "Oct", invoiced: Math.round(invoiced * 0.7), received: Math.round(received * 0.75) },
    { month: "Nov", invoiced: Math.round(invoiced * 0.8), received: Math.round(received * 0.85) },
    { month: "Dec", invoiced: Math.round(invoiced * 0.9), received: Math.round(received * 0.9) },
    { month: "Jan", invoiced: invoiced || 3120000, received: received || 2480000 },
  ];

  const formatYAxis = (value: number) => {
    if (value === 0) return "₹0";
    if (value >= 100000) return `₹${Math.round(value / 100000)}L`;
    return `₹${Math.round(value / 1000)}k`;
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Monthly Revenue</h3>
          <p className="text-xs text-slate-500">Invoiced vs Received collections</p>
        </div>
        <span className="text-xs font-semibold text-[#0481A2] bg-sky-50 px-2 py-0.5 rounded">
          Last 6 Months
        </span>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
            <YAxis tickFormatter={formatYAxis} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
            <Tooltip
              formatter={(value: any) => [`₹${(Number(value)).toLocaleString('en-IN')}`, ""]}
              contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            />
            <Legend 
              iconType="circle"
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
            />
            <Bar dataKey="invoiced" name="Invoiced Amount" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="received" name="Payments Received" fill="#243E76" radius={[4, 4, 0, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
