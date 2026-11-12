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

  const initials = userFullName 
    ? userFullName.slice(0, 2).toUpperCase() 
    : (userEmail ? userEmail.slice(0, 2).toUpperCase() : "AD");

  return (
    <aside 
      className={cn(
        "relative flex flex-col justify-between transition-all duration-300 select-none shrink-0 shadow-xl overflow-hidden h-full min-h-screen",
        "bg-[#14244B] border-r border-[#1B2F5B]/80",
        isCollapsed ? "w-20" : "w-64"
      )}
      style={{ height: "100dvh", minHeight: "100vh" }}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 h-20 border-b border-[#1E3567]/50 relative z-10 shrink-0">
        <Link href="/dashboard" className="flex items-center">
          <div className={cn(
            "relative shrink-0 flex items-center transition-all duration-300",
            isCollapsed ? "h-9 w-9 overflow-hidden" : "h-10 w-auto"
          )}>
            <Image
              src="/brand360s-darkmodelogo.svg"
              alt="BRAND 360s"
              width={160}
              height={42}
              priority
              className={cn(
                "object-contain transition-all duration-300",
                isCollapsed ? "h-9 w-auto max-w-none object-left" : "h-[38px] w-auto object-left"
              )}
            />
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1E3567]/60 transition-colors shrink-0 cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links (Scrolls independently if screen height is small) */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto relative z-10 font-sans custom-scrollbar">
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

      {/* Decorative Cyan / Teal Curved Waves at bottom of sidebar (contained within background) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 overflow-hidden z-0 opacity-70">
        <svg 
          viewBox="0 0 240 180" 
          className="absolute bottom-0 left-0 w-full h-full"
          preserveAspectRatio="none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0 80 C80 120, 160 50, 240 90 L240 180 L0 180 Z" 
            fill="#1B3E75" 
            opacity="0.6" 
          />
          <path 
            d="M-20 120 C60 70, 140 160, 240 110 L240 180 L-20 180 Z" 
            fill="#0481A2" 
            opacity="0.35" 
          />
          <path 
            d="M-10 145 C50 115, 120 170, 240 135 L240 180 L-10 180 Z" 
            fill="#0481A2" 
            opacity="0.6" 
          />
          <path 
            d="M-20 165 C40 140, 100 175, 200 160 L200 180 L-20 180 Z" 
            fill="#0696BC" 
            opacity="0.75" 
          />
        </svg>
      </div>

      {/* Pinned Profile Footer */}
      <div className="p-3 border-t border-[#1E3567]/60 bg-[#0F1C3C]/80 relative z-10 backdrop-blur-xs mt-auto shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center border border-[#3B5998] shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="text-xs truncate min-w-0">
              <p className="font-semibold text-white truncate">{userFullName}</p>
              <p className="text-slate-400 text-[11px] truncate capitalize">{userRole}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
