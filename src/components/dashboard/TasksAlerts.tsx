import Link from "next/link";
import { 
  FileWarning, 
  CalendarCheck, 
  RefreshCw, 
  Clock, 
  ChevronRight 
} from "lucide-react";

interface TasksAlertsProps {
  overdueCount?: number;
  renewalsDueCount?: number;
  followupsTodayCount?: number;
}

export function TasksAlerts({ 
  overdueCount = 0,
  renewalsDueCount = 0,
  followupsTodayCount = 0
}: TasksAlertsProps) {
  const alerts = [
    {
      id: "1",
      label: "Overdue Payments & Invoices",
      count: overdueCount,
      href: "/payments?status=Overdue",
      icon: FileWarning,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      id: "2",
      label: "Follow-ups Due Today",
      count: followupsTodayCount,
      href: "/follow-ups",
      icon: CalendarCheck,
      iconColor: "text-[#0481A2]",
      iconBg: "bg-sky-50",
      badgeColor: "bg-sky-100 text-[#0481A2]",
    },
    {
      id: "3",
      label: "Upcoming Service Renewals",
      count: renewalsDueCount,
      href: "/renewals",
      icon: RefreshCw,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      badgeColor: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Tasks & Alerts</h3>
        <p className="text-xs text-slate-500">Items requiring immediate attention</p>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <Link
              key={alert.id}
              href={alert.href}
              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${alert.iconBg}`}>
                  <Icon size={15} className={alert.iconColor} />
                </div>
                <span className="font-medium text-slate-800">{alert.label}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${alert.badgeColor}`}>
                  {alert.count}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
