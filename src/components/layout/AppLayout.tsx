"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopNavbar } from "./TopNavbar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  userProfile?: {
    id: string;
    email: string;
    fullName: string;
    role: "admin" | "employee";
  };
}

export function AppLayout({ children, userProfile }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          userRole={userProfile?.role || "employee"}
          userFullName={userProfile?.fullName}
          userEmail={userProfile?.email}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="relative z-10 w-[240px]">
            <AppSidebar 
              isCollapsed={false} 
              setIsCollapsed={() => setMobileMenuOpen(false)}
              userRole={userProfile?.role || "employee"}
              userFullName={userProfile?.fullName}
              userEmail={userProfile?.email}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isCollapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
        )}
      >
        <TopNavbar 
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          userEmail={userProfile?.email || "user@brand360s.co"}
          userRole={userProfile?.role === "admin" ? "Administrator" : "Employee"}
          userName={userProfile?.fullName || "User"}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
