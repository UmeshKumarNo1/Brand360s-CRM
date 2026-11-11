import Link from "next/link";
import { 
  FileWarning, 
  CalendarCheck, 
  FileText, 
  CheckCircle2, 
  Trophy, 
  ChevronRight 
} from "lucide-react";

interface TasksAlertsProps {
  overdueCount?: number;
}

export function TasksAlerts({ overdueCount = 0 }: TasksAlertsProps) {
  const alerts = [
    {
      id: "1",
      label: "Overdue Invoices",
      count: overdueCount,
      href: "/invoices?status=overdue",
      icon: FileWarning,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      id: "2",
      label: "Follow-ups Due Today",
      count: 0,
      href: "/follow-ups?filter=today",
      icon: CalendarCheck,
      iconColor: "text-[#077EA1]",
      iconBg: "bg-sky-50",
      badgeColor: "bg-sky-100 text-[#077EA1]",
    },
    {
      id: "3",
      label: "Pending Document Submission",
      count: 0,
      href: "/services?status=documents-pending",
      icon: FileText,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      badgeColor: "bg-amber-100 text-amber-700",
    },
    {
      id: "4",
      label: "Service Completion (This Week)",
      count: 0,
      href: "/services?filter=completion-week",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      badgeColor: "bg-emerald-100 text-emerald-700",
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
