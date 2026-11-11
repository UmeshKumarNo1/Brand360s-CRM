import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  isWarning?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  isPositive,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  isWarning = false,
}: StatCardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 truncate">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1.5 truncate">
          {value}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span 
            className={cn(
              "font-semibold flex items-center text-[11px]",
              isWarning 
                ? "text-red-600" 
                : isPositive 
                  ? "text-emerald-600" 
                  : "text-red-600"
            )}
          >
            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {change}
          </span>
          <span className="text-slate-400 text-[11px] truncate">{description}</span>
        </div>
      </div>
    </div>
  );
}

