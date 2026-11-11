"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Home,
  Users, 
  CreditCard, 
  RotateCw, 
  CalendarCheck, 
  BarChart2, 
  FileText, 
  UsersRound, 
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
  userFullName = "Uki0070411",
  userEmail = "user@brand360s.co"
}: AppSidebarProps) {
  const pathname = usePathname();

  // Navigation items matching the CRM layout in the design
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Clients", href: "/clients", icon: Users },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Renewals", href: "/services", icon: RotateCw },
    { label: "Follow-ups", href: "/follow-ups", icon: CalendarCheck },
    { label: "Reports", href: "/reports", icon: BarChart2 },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Vendors", href: "/vendors", icon: UsersRound },
    { label: "Sales Incentives", href: "/sales-incentives", icon: Trophy },
  ];

  // Admin items
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
        "fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-[#0F1E3D] text-slate-300 border-r border-[#1B2F5B]/80 transition-all duration-300 overflow-hidden",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div className="h-[76px] flex items-center justify-between px-5 relative z-10">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/brand360s-darkmodelogo.svg"
              alt="BRAND 360s"
              width={145}
              height={45}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto flex flex-col items-center">
            <Image
              src="/brand360s-darkmodelogo.svg"
              alt="BRAND 360s"
              width={40}
              height={30}
              className="h-6 w-auto object-contain"
              priority
            />
          </Link>
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
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 relative z-10">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative",
                isActive 
                  ? "bg-[#0481A2] text-white shadow-md font-semibold"
                  : "text-slate-300 hover:bg-[#1B2F5B]/60 hover:text-white"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className={cn("shrink-0", isActive ? "text-white" : "text-slate-300")} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin only items */}
        {userRole === "admin" && (
          <>
            <div className="pt-3 pb-2 px-2">
              <div className="border-t border-[#1E3567]/60" />
            </div>

            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive 
                      ? "bg-[#0481A2] text-white shadow-md font-semibold" 
                      : "text-slate-300 hover:bg-[#1B2F5B]/60 hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0 text-slate-300" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* Decorative Cyan / Teal Curved Waves at bottom of sidebar */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 overflow-hidden z-0">
        <svg 
          viewBox="0 0 240 180" 
          className="absolute bottom-0 left-0 w-full h-full"
          preserveAspectRatio="none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Deep Navy wave */}
          <path 
            d="M0 80 C80 120, 160 50, 240 90 L240 180 L0 180 Z" 
            fill="#142852" 
            opacity="0.8" 
          />
          {/* Teal blue wave */}
          <path 
            d="M-20 120 C60 70, 140 160, 240 110 L240 180 L-20 180 Z" 
            fill="#0481A2" 
            opacity="0.45" 
          />
          {/* Bright Cyan accent wave */}
          <path 
            d="M-10 145 C50 115, 120 170, 240 135 L240 180 L-10 180 Z" 
            fill="#0481A2" 
            opacity="0.85" 
          />
          <path 
            d="M-20 165 C40 140, 100 175, 200 160 L200 180 L-20 180 Z" 
            fill="#0696BC" 
            opacity="0.9" 
          />
        </svg>
      </div>

      {/* User Footer Indicator */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#1B2F5B]/70 bg-[#0B1730]/60 relative z-10 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center border border-[#3B5998]">
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
