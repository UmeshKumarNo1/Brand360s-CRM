"use client";

import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight } from "lucide-react";

interface ServiceStatusChartProps {
  data?: { name: string; count: number; pct: string; color: string }[];
  totalTrackedServices?: number;
}

export function ServiceStatusChart({ 
  data = [], 
  totalTrackedServices = 186 
}: ServiceStatusChartProps) {
  // Fallback data matching the design if empty
  const chartData = data.length > 0 ? data : [
    { name: "Completed", count: 82, pct: "44.1%", color: "#16A34A" },
    { name: "Processing", count: 46, pct: "24.7%", color: "#0284C7" },
    { name: "Documents Pending", count: 22, pct: "11.8%", color: "#F59E0B" },
    { name: "Waiting for Approval", count: 12, pct: "6.5%", color: "#8B5CF6" },
    { name: "On Hold", count: 10, pct: "5.4%", color: "#94A3B8" },
    { name: "Cancelled", count: 14, pct: "7.5%", color: "#EF4444" },
  ];

  const total = totalTrackedServices > 0 
    ? totalTrackedServices 
    : chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Service Status</h3>
          <p className="text-xs text-slate-500">{total} total services</p>
        </div>

        <Link
          href="/services"
          className="text-xs font-semibold text-[#0481A2] hover:text-[#036c88] flex items-center gap-1 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Side-by-side content: Donut on Left, Vertical Legend on Right */}
      <div className="flex items-center justify-between gap-2 flex-1 my-1">
        {/* Left: Donut Chart with Center Text */}
        <div className="relative w-[160px] h-[160px] sm:w-[170px] sm:h-[170px] shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="count"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} services`, name]}
                contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-sans font-number">{total}</span>
            <span className="text-[11px] text-slate-400 font-medium -mt-0.5">Services</span>
          </div>
        </div>

        {/* Right: Vertical Legend List */}
        <div className="flex-1 space-y-1.5 pl-2 text-xs">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate text-[11.5px] font-medium">{item.name}</span>
              </div>
              <span className="font-bold text-slate-900 ml-2 font-sans font-number text-[11.5px] whitespace-nowrap">
                {item.count} <span className="font-normal text-slate-400 text-[10.5px]">({item.pct})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
