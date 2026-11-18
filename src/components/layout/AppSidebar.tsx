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
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { logoutAction } from "@/app/actions/auth";

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const displayRole =
    userRole?.toLowerCase() === "admin" || userRole === "Administrator"
      ? "Administrator"
      : (userRole || "Employee");
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
        isCollapsed ? "flex-row items-center justify-between px-3 h-16" : "justify-between px-4 sm:px-5"
      )}>
        <Link
          href="/dashboard"
          className="flex items-center justify-center shrink-0"
          title={isCollapsed ? "Brand 360s Dashboard" : undefined}
        >
          {isCollapsed ? (
            /* Fully visible Avatar Image when Sidebar shrinks */
            <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform hover:scale-105">
              <Image
                src="/avatar.webp"
                alt="Brand 360s"
                width={32}
                height={32}
                priority
                className="w-full h-full object-contain"
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
            isCollapsed ? "p-1 ml-auto" : "p-1.5"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={18} />}
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
        ref={profileMenuRef}
        className={cn(
          "p-2.5 sm:p-3 border-t border-[#1E3567]/60 relative z-10 mt-auto shrink-0 flex items-center transition-all duration-300",
          isCollapsed ? "justify-center px-1" : "justify-between px-3"
        )}
        style={{ backgroundColor: "#16284F" }}
      >
        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div
            className={cn(
              "absolute bottom-full mb-2 bg-[#1A2E5A] border border-[#243E76] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150",
              isCollapsed ? "left-2 w-52" : "left-2 right-2"
            )}
          >
            <div className="px-3 py-2 border-b border-[#243E76]/80 text-white">
              <p className="font-bold text-sm truncate">{userFullName}</p>
              {userEmail && <p className="text-slate-300 text-[11px] truncate mt-0.5">{userEmail}</p>}
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#0481A2]/30 text-[#38BDF8] rounded-md text-[10px] font-semibold border border-[#0481A2]/40">
                {displayRole}
              </span>
            </div>
            {userRole === "admin" && (
              <Link
                href="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-[#243E76] rounded-xl transition-colors mt-1 font-medium"
              >
                <Settings size={14} className="text-[#38BDF8]" />
                <span>Account Settings</span>
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await logoutAction();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/15 rounded-xl text-left font-medium cursor-pointer transition-colors mt-0.5"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        )}

        {/* User Card trigger */}
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={cn(
            "flex items-center gap-2.5 cursor-pointer rounded-xl hover:bg-[#1E3567]/60 p-1 transition-colors min-w-0 flex-1",
            isCollapsed && "justify-center p-1.5"
          )}
          title={isCollapsed ? `${userFullName} (${displayRole})` : "View Profile & Settings"}
        >
          <div className="w-8 h-8 rounded-full bg-[#0481A2] text-white text-xs font-bold flex items-center justify-center border border-[#38BDF8]/40 shrink-0 shadow-xs">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="text-xs truncate min-w-0 flex-1">
              <p className="font-semibold text-white truncate leading-tight">{userFullName}</p>
              <p className="text-slate-400 text-[11px] truncate mt-0.5">{displayRole}</p>
            </div>
          )}
        </div>

        {/* Quick Sign out button when expanded */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await logoutAction();
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#1E3567]/80 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
