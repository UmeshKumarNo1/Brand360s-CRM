"use client";

import { Menu } from "lucide-react";
import { NotificationBellDropdown } from "@/components/notifications/NotificationBellDropdown";

interface TopNavbarProps {
  onMobileMenuToggle: () => void;
  userEmail?: string;
  userRole?: string;
  userName?: string;
}

export function TopNavbar({ 
  onMobileMenuToggle,
}: TopNavbarProps) {
  return (
    <header className="lg:hidden h-14 px-4 flex items-center justify-between sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-2xs">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
        aria-label="Toggle mobile menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile notification bell */}
      <NotificationBellDropdown
        triggerClassName="p-2 text-slate-600 hover:text-[#243E76] rounded-full relative cursor-pointer"
      />
    </header>
  );
}
