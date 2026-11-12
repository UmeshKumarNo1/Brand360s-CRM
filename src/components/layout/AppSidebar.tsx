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
        "bg-[#16284F] border-r border-[#1E3567]/80",
        isCollapsed ? "w-20" : "w-64"
      )}
      style={{ height: "100dvh", minHeight: "100vh", backgroundColor: "#16284F" }}
    >
      {/* Brand Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-[#1E3567]/50 relative z-10 shrink-0 bg-[#16284F] transition-all duration-300",
        isCollapsed ? "justify-center px-2 flex-col gap-1 py-2 h-20" : "justify-between px-4 sm:px-5"
      )}>
        <Link 
          href="/dashboard" 
          className="flex items-center justify-center"
          title={isCollapsed ? "Brand 360s Dashboard" : undefined}
        >
          {isCollapsed ? (
            /* Clean Compact Logo Emblem when Sidebar shrinks (ChatGPT web style) */
            <div className="w-8 h-8 rounded-full bg-[#007ea0] flex items-center justify-center shadow-xs overflow-hidden shrink-0 transition-transform hover:scale-105">
              <Image
                src="/brand360s-mark.svg"
                alt="Brand 360s"
                width={32}
                height={32}
                priority
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            /* Full Logo when expanded */
            <div className="relative shrink-0 flex items-center h-10 w-auto">
              <Image
                src="/brand360s-darkmodelogo.svg"
                alt="BRAND 360s"
                width={150}
                height={38}
                priority
                className="h-[36px] w-auto object-left object-contain"
              />
            </div>
          )}
        </Link>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "text-slate-400 hover:text-white rounded-lg hover:bg-[#1E3567]/60 transition-colors shrink-0 cursor-pointer",
            isCollapsed ? "p-1 mt-0.5" : "p-1.5"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links (Scrolls independently if screen height is small) */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto relative z-10 font-sans custom-scrollbar bg-[#16284F]">
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
                  : "text-slate-300 hover:bg-[#1E3567]/60 hover:text-white"
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
                      : "text-slate-300 hover:bg-[#1E3567]/60 hover:text-white"
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

      {/* Pinned Profile Footer with Solid Navy Background */}
      <div 
        className={cn(
          "p-3 border-t border-[#1E3567]/60 relative z-10 mt-auto shrink-0 flex items-center transition-all duration-300",
          isCollapsed ? "justify-center px-1" : "justify-start px-3"
        )}
        style={{ backgroundColor: "#16284F" }}
      >
        <div 
          className="flex items-center gap-2.5 cursor-pointer"
          title={isCollapsed ? `${userFullName} (${userRole})` : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center border border-[#3B5998] shrink-0 shadow-xs">
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
