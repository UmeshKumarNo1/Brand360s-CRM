"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ServiceStatusChartProps {
  clientsCount?: number;
}

export function ServiceStatusChart({ clientsCount = 322 }: ServiceStatusChartProps) {
  const data = [
    { name: "Completed", value: Math.max(1, Math.round(clientsCount * 0.55)), color: "#16A34A", pct: "55%" },
    { name: "Processing", value: Math.max(1, Math.round(clientsCount * 0.21)), color: "#0284C7", pct: "21%" },
    { name: "Documents Pending", value: Math.max(0, Math.round(clientsCount * 0.11)), color: "#F59E0B", pct: "11%" },
    { name: "Waiting for Approval", value: Math.max(0, Math.round(clientsCount * 0.07)), color: "#8B5CF6", pct: "7%" },
    { name: "On Hold", value: Math.max(0, Math.round(clientsCount * 0.03)), color: "#94A3B8", pct: "3%" },
    { name: "Cancelled", value: Math.max(0, Math.round(clientsCount * 0.03)), color: "#EF4444", pct: "3%" },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-slate-900">Service Status</h3>
        <span className="text-xs text-slate-400">Total active: {clientsCount}</span>
      </div>

      <div className="relative h-[190px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
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
          <span className="text-xl font-bold text-slate-900">{clientsCount}</span>
          <span className="text-[10px] text-slate-400 font-medium">Services</span>
        </div>
      </div>

      {/* Custom Legend */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 truncate">{item.name}</span>
            </div>
            <span className="font-semibold text-slate-800 ml-1">{item.value} ({item.pct})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
