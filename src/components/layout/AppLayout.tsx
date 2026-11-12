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
    <div className="min-h-screen bg-[#F4F8FC] flex relative overflow-x-hidden">
      {/* Background Soft Organic Waves (matching the design in the image) */}
      <div className="pointer-events-none fixed top-0 right-0 w-[550px] h-[350px] z-0 overflow-hidden opacity-60">
        <svg
          viewBox="0 0 550 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M550 0H0C80 90 200 130 350 90C450 60 510 130 550 200V0Z"
            fill="url(#topWaveGrad)"
            opacity="0.35"
          />
          <path
            d="M550 0H140C240 70 330 90 420 50C480 20 520 70 550 120V0Z"
            fill="url(#topWaveGrad2)"
            opacity="0.25"
          />
          <defs>
            <linearGradient id="topWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0481A2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#243E76" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="topWaveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0481A2" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="pointer-events-none fixed bottom-0 right-0 w-[600px] h-[300px] z-0 overflow-hidden opacity-50">
        <svg
          viewBox="0 0 600 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M600 300H0C120 220 280 260 420 210C500 180 560 220 600 240V300Z"
            fill="url(#bottomWaveGrad)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="bottomWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0481A2" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block relative z-30">
        <AppSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          userRole={userProfile?.role || "admin"}
          userFullName={userProfile?.fullName || "Uki0070411"}
          userEmail={userProfile?.email || "admin@brand360s.co"}
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
              userRole={userProfile?.role || "admin"}
              userFullName={userProfile?.fullName || "Uki0070411"}
              userEmail={userProfile?.email || "admin@brand360s.co"}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10",
          isCollapsed ? "lg:ml-[72px]" : "lg:ml-[20px]"
        )}
      >
        <TopNavbar
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          userEmail={userProfile?.email || "admin@brand360s.co"}
          userRole={userProfile?.role === "admin" ? "Administrator" : "Employee"}
          userName={userProfile?.fullName || "Uki0070411"}
        />
        <main className="flex-1 px-6 sm:px-8 py-4 sm:py-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
