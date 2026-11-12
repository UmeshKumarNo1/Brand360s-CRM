"use client";

import { useState } from "react";
import { Search, LogOut, Settings as SettingsIcon, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationBellDropdown } from "@/components/notifications/NotificationBellDropdown";

interface TopNavbarProps {
  onMobileMenuToggle: () => void;
  userEmail?: string;
  userRole?: string;
  userName?: string;
}

export function TopNavbar({ 
  onMobileMenuToggle,
  userEmail = "user@brand360s.co",
  userRole = "Administrator",
  userName = "Uki0070411"
}: TopNavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const initials = userName 
    ? userName.slice(0, 2).toUpperCase() 
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="h-[76px] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 bg-transparent">
      {/* Search Input Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Pill Bar matching design */}
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients, invoices, services..."
            className="w-full pl-10 pr-12 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-full focus:outline-none focus:border-[#0481A2] focus:ring-2 focus:ring-[#0481A2]/20 transition-all text-slate-800 placeholder:text-slate-400 shadow-2xs"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right controls: Notifications & User profile */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Dynamic Notification Bell Dropdown */}
        <NotificationBellDropdown />

        {/* Separator line */}
        <div className="h-6 w-px bg-slate-200/80" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-white/60 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center shadow-xs">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="font-bold text-slate-800 text-sm leading-tight">{userName}</p>
              <p className="text-slate-400 text-xs font-medium">{userRole}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="font-bold text-slate-800 text-sm">{userName}</p>
                <p className="text-slate-400 text-xs truncate">{userEmail}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-[#243E76] rounded-md text-[10px] font-semibold">
                  {userRole}
                </span>
              </div>
              {userRole === "Administrator" && (
                <a href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors">
                  <SettingsIcon size={14} /> Account Settings
                </a>
              )}
              <div className="border-t border-slate-100 my-1" />
              <button 
                onClick={async () => {
                  await logoutAction();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 text-left font-medium cursor-pointer transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
