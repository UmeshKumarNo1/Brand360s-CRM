"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  CreditCard,
  FileText,
  RefreshCw,
  Calendar,
  AlertTriangle,
  UserPlus,
  Info,
  Clock,
} from "lucide-react";
import {
  fetchNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/app/actions/notifications";
import { NotificationItem, NotificationType } from "@/lib/notifications/notification-types";
import { createClient } from "@/lib/supabase/client";

export function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "alert" | "update">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsAction(activeTab, 20);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription using Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationAsReadAction(notif.id);
    }

    setIsOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "payment_received":
      case "installment_due":
      case "installment_overdue":
        return <CreditCard size={14} className="text-[#0481A2]" />;
      case "invoice_created":
      case "invoice_overdue":
        return <FileText size={14} className="text-[#243E76]" />;
      case "renewal_due":
      case "renewal_overdue":
      case "renewal_completed":
        return <RefreshCw size={14} className="text-teal-600" />;
      case "followup_due":
      case "followup_overdue":
        return <Calendar size={14} className="text-blue-600" />;
      case "client_created":
      case "client_updated":
        return <UserPlus size={14} className="text-emerald-600" />;
      case "system_alert":
      default:
        return <AlertTriangle size={14} className="text-amber-600" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-600 hover:text-[#243E76] hover:bg-white rounded-full transition-colors relative cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs animate-in zoom-in duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#0481A2] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Category Tabs: All, Alerts, Updates */}
          <div className="flex border-b border-slate-100 bg-slate-50/40 px-3 pt-1.5 gap-1 text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "border-[#0481A2] text-[#0481A2]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("alert")}
              className={`px-3 py-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "alert"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab("update")}
              className={`px-3 py-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "update"
                  ? "border-[#243E76] text-[#243E76]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Updates
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <RefreshCw size={16} className="animate-spin mx-auto text-[#0481A2] mb-1.5" />
                <span className="text-[11px]">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400">
                <Bell size={24} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-600 text-xs">No notifications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are all caught up with alerts and activities.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                    !notif.is_read ? "bg-sky-50/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                      notif.category === "alert"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-blue-50 text-[#0481A2]"
                    } shadow-2xs mt-0.5`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 text-xs truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator pip */}
                  {!notif.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0481A2] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with "View All" */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] font-semibold">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[#0481A2] hover:underline flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink size={11} />
            </Link>

            <span className="text-slate-400 font-normal">BRAND 360s CRM</span>
          </div>
        </div>
      )}
    </div>
  );
}

