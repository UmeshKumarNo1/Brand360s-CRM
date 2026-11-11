"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UsersRound, 
  CreditCard, 
  RotateCw, 
  CheckSquare, 
  BarChart3, 
  Layers, 
  FileText, 
  Store, 
  Trophy, 
  UserRound, 
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  userRole?: "admin" | "employee";
  userFullName?: string;
  userEmail?: string;
}

export function AppSidebar({ 
  isCollapsed, 
  setIsCollapsed,
  userRole = "employee",
  userFullName = "User",
  userEmail = "user@brand360s.co"
}: AppSidebarProps) {
  const pathname = usePathname();
  const isClientsView = pathname.startsWith("/clients");

  // Modules available to all authenticated CRM users
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Clients", href: "/clients", icon: UsersRound },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Renewals", href: "/services", icon: RotateCw },
    { label: "Follow-ups", href: "/follow-ups", icon: CheckSquare },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Vendors", href: "/vendors", icon: Store },
    { label: "Sales Incentives", href: "/sales-incentives", icon: Trophy },
  ];

  // Admin-only management modules
  const adminItems = [
    { label: "Employees", href: "/employees", icon: UserRound },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const initials = userFullName 
    ? userFullName.slice(0, 2).toUpperCase() 
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-[#0F172A] text-slate-300 border-r border-slate-800 transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div className="h-[68px] flex items-center justify-between px-5 border-b border-slate-800/80">
        {!isCollapsed ? (
          <div>
            <div className="flex items-center space-x-1.5 font-bold tracking-tight">
              <span className="text-white text-lg tracking-wide">BRAND</span>
              <span className="text-[#00A3C4] text-lg font-extrabold">360s</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              {isClientsView ? "Client Hub" : "CRM"}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center">
            <span className="text-[#00A3C4] font-black text-lg">360</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive 
                  ? item.href === "/clients"
                    ? "bg-[#077EA1] text-white shadow-sm font-semibold"
                    : "bg-[#243E76] text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className={cn("shrink-0", isActive ? "text-white" : "text-slate-400")} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin only items */}
        {userRole === "admin" && (
          <>
            <div className="pt-4 pb-2">
              <div className="border-t border-slate-800" />
            </div>

            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive 
                      ? "bg-[#243E76] text-white shadow-sm font-semibold" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0 text-slate-400" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* User Footer Indicator */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center border border-slate-700">
              {initials}
            </div>
            <div className="text-xs truncate">
              <p className="font-semibold text-white truncate">{userFullName}</p>
              <p className="text-slate-400 text-[11px] truncate capitalize">{userRole}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
