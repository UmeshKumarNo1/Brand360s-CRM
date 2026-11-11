"use client";

import { useState } from "react";
import { Search, Bell, HelpCircle, User, LogOut, Settings as SettingsIcon, Menu } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

interface TopNavbarProps {
  onMobileMenuToggle: () => void;
  userEmail?: string;
  userRole?: string;
  userName?: string;
}

export function TopNavbar({ 
  onMobileMenuToggle,
  userEmail = "user@brand360s.co",
  userRole = "Employee",
  userName = "User"
}: TopNavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const initials = userName 
    ? userName.slice(0, 2).toUpperCase() 
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="h-[68px] bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients, invoices, services..."
            className="w-full pl-9 pr-12 py-2 text-sm bg-slate-50 border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#077EA1] focus:ring-1 focus:ring-[#077EA1] transition-all text-slate-800 placeholder:text-slate-400"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Help Icon */}
        <button 
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors relative"
          title="Help & Documentation"
        >
          <HelpCircle size={18} />
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100 font-semibold text-slate-800 flex justify-between items-center">
                <span>Notifications</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">System Alert</span>
              </div>
              <div className="p-4 text-center text-slate-500">
                No pending notifications
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#243E76] text-white text-xs font-bold flex items-center justify-center">
              {initials}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-tight">{userName}</p>
              <p className="text-slate-500 text-[11px] font-medium">{userRole}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">{userName}</p>
                <p className="text-slate-500 text-[11px] truncate">{userEmail}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                  {userRole}
                </span>
              </div>
              {userRole === "Administrator" && (
                <a href="/settings" className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50">
                  <SettingsIcon size={14} /> Account Settings
                </a>
              )}
              <div className="border-t border-slate-100 my-1" />
              <button 
                onClick={async () => {
                  await logoutAction();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-left font-medium cursor-pointer"
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
