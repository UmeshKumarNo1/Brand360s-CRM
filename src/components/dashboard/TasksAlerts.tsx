"use client";

import Link from "next/link";
import { 
  AlertTriangle, 
  Calendar, 
  RefreshCw, 
  FileText, 
  ChevronRight 
} from "lucide-react";

interface TasksAlertsProps {
  overdueCount?: number;
  followupsTodayCount?: number;
  renewalsDueCount?: number;
  servicesPendingDocsCount?: number;
}

export function TasksAlerts({ 
  overdueCount = 7,
  followupsTodayCount = 6,
  renewalsDueCount = 4,
  servicesPendingDocsCount = 12,
}: TasksAlertsProps) {
  const alerts = [
    {
      id: "1",
      label: "Overdue Payments & Invoices",
      count: overdueCount,
      href: "/payments",
      icon: AlertTriangle,
      iconColor: "text-rose-600",
      iconBg: "bg-rose-50",
      badgeColor: "bg-rose-100/80 text-rose-700",
    },
    {
      id: "2",
      label: "Follow-ups Due Today",
      count: followupsTodayCount,
      href: "/follow-ups",
      icon: Calendar,
      iconColor: "text-[#0284C7]",
      iconBg: "bg-sky-50",
      badgeColor: "bg-sky-100/80 text-[#0284C7]",
    },
    {
      id: "3",
      label: "Upcoming Service Renewals",
      count: renewalsDueCount,
      href: "/renewals",
      icon: RefreshCw,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      badgeColor: "bg-amber-100/80 text-amber-700",
    },
    {
      id: "4",
      label: "Services Pending Documents",
      count: servicesPendingDocsCount,
      href: "/services",
      icon: FileText,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      badgeColor: "bg-purple-100/80 text-purple-700",
    },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Tasks &amp; Alerts</h3>
        <p className="text-xs text-slate-500">Items requiring immediate attention</p>
      </div>

      {/* 4 Alert Rows */}
      <div className="space-y-2.5 flex-1 flex flex-col justify-around">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <Link
              key={alert.id}
              href={alert.href}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all text-xs group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${alert.iconBg}`}>
                  <Icon size={14} className={alert.iconColor} />
                </div>
                <span className="font-semibold text-slate-800 group-hover:text-slate-900">{alert.label}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] font-sans font-number ${alert.badgeColor}`}>
                  {alert.count}
                </span>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
