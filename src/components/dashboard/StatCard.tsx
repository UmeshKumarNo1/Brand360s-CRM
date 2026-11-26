import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: string | null;
  isPositive?: boolean;
  isWarning?: boolean;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function StatCard({
  label,
  value,
  change,
  isPositive = true,
  isWarning = false,
  icon: Icon,
  iconColor,
  iconBg,
}: StatCardProps) {
  // If isWarning is set, upward change is colored red
  const textColor = isWarning
    ? "text-rose-600"
    : isPositive
    ? "text-emerald-600"
    : "text-rose-600";

  const arrow = isWarning ? "▲" : isPositive ? (change?.includes("-") ? "▼" : "▲") : "▼";

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
      {/* Top Row: Icon on left, Label next to it */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={15} className={iconColor} />
        </div>
        <span className="text-xs font-semibold text-slate-700 truncate">{label}</span>
      </div>

      {/* Main Metric Value */}
      <div className="text-xl sm:text-2xl xl:text-[26px] font-bold tracking-tight text-slate-900 my-1 truncate font-sans font-number">
        {value}
      </div>

      {/* Trend Subtitle */}
      {change ? (
        <div className="flex items-center gap-1.5 text-xs font-sans mt-0.5">
          <span className={cn("font-semibold flex items-center gap-1 text-[11px] font-sans font-number", textColor)}>
            <span className="text-[9px]">{arrow}</span>
            <span>{change}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
