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

      {/* Decorative Cyan / Teal Curved Waves at bottom of sidebar */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 overflow-hidden z-0">
        <svg 
          viewBox="0 0 240 180" 
          className="absolute bottom-0 left-0 w-full h-full"
          preserveAspectRatio="none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="waveGradTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0481A2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#02566D" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="waveGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00BCD4" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#0481A2" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#02566D" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="waveGradSoft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1B3E75" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0E2147" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Layer 1: Deep Navy/Blue smooth underlay wave */}
          <path 
            d="M -10 75 C 65 118, 145 48, 250 88 L 250 190 L -10 190 Z" 
            fill="url(#waveGradSoft)" 
          />

          {/* Layer 2: Mid-Teal sweeping ocean wave */}
          <path 
            d="M -10 108 C 65 72, 145 148, 250 105 L 250 190 L -10 190 Z" 
            fill="#0481A2" 
            opacity="0.5" 
          />

          {/* Layer 3: Vibrant Teal accent wave */}
          <path 
            d="M -10 132 C 60 105, 135 160, 250 122 L 250 190 L -10 190 Z" 
            fill="url(#waveGradTeal)" 
          />

          {/* Layer 4: Bright Cyan flowing crest - smoothly spans full width */}
          <path 
            d="M -10 152 C 50 128, 125 165, 250 142 L 250 190 L -10 190 Z" 
            fill="url(#waveGradCyan)" 
          />
        </svg>
      </div>
    </aside>
  );
}
