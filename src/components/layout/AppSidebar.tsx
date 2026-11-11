"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  RefreshCw, 
  Calendar, 
  BarChart3, 
  FileText, 
  Truck, 
  Award,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AppSidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void | React.Dispatch<React.SetStateAction<boolean>>;
  userRole?: string;
  userFullName?: string;
  userEmail?: string;
}

export function AppSidebar({ 
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed,
  userRole = "admin", 
  userFullName = "Uki0070411",
  userEmail,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = (val: boolean) => {
    if (externalSetIsCollapsed) {
      externalSetIsCollapsed(val);
    } else {
      setInternalIsCollapsed(val);
    }
  };

  // CRM Navigation Menu items matching Brand360s mock design
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Clients", href: "/clients", icon: Users },
    { label: "Payments", href: "/payments", icon: CreditCard },
    { label: "Renewals", href: "/renewals", icon: RefreshCw },
    { label: "Follow-ups", href: "/follow-ups", icon: Calendar },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Invoices", href: "/invoices", icon: FileText },
    { label: "Vendors", href: "/vendors", icon: Truck },
    { label: "Sales Incentives", href: "/sales-incentives", icon: Award },
  ];

  // Admin items
  const adminItems = [
    { label: "Employees", href: "/employees", icon: UserCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "relative flex flex-col justify-between transition-all duration-300 select-none shrink-0 shadow-xl overflow-hidden",
        "bg-[#14244B] border-r border-[#1B2F5B]/80",
        isCollapsed ? "w-20" : "w-64"
      )}
      style={{ minHeight: "100vh" }}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-[#1E3567]/50 relative z-10">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="relative h-9 w-36 shrink-0 flex items-center">
            <Image
              src="/brand360s-darkmodelogo.svg"
              alt="BRAND 360s"
              width={140}
              height={36}
              priority
              className="object-contain object-left h-8 w-auto"
            />
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1E3567]/60 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto relative z-10 font-sans">
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

      {/* Decorative Crescent Swoosh at bottom-left matching original design mock */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-60 overflow-hidden z-0">
        <svg 
          viewBox="0 0 260 260" 
          className="absolute bottom-0 left-0 w-full h-full"
          preserveAspectRatio="none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="crescentGradDeep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0481A2" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#02566D" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0B1A3A" stopOpacity="0.9" />
            </linearGradient>

            <linearGradient id="crescentGradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#0481A2" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#02566D" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="crescentGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#06B6D4" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0481A2" stopOpacity="0.2" />
            </linearGradient>

            <radialGradient id="cornerAmbientGlow" cx="15%" cy="85%" r="70%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0481A2" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#14244B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient background glow in corner */}
          <rect width="260" height="260" fill="url(#cornerAmbientGlow)" />

          {/* Outer sweeping curved crescent */}
          <path 
            d="M -20 100 C 60 65, 170 115, 270 230 L 270 280 L -20 280 Z" 
            fill="url(#crescentGradDeep)" 
          />

          {/* Main vibrant teal crescent swoosh rising from bottom-left */}
          <path 
            d="M -20 155 C 45 110, 135 150, 230 270 L -20 270 Z" 
            fill="url(#crescentGradTeal)" 
          />

          {/* Glowing cyan inner crescent accent */}
          <path 
            d="M -20 188 C 35 145, 105 180, 175 270 L -20 270 Z" 
            fill="url(#crescentGradCyan)" 
          />
        </svg>
      </div>
    </aside>
  );
}
