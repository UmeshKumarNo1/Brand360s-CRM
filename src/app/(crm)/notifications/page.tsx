"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  CreditCard,
  FileText,
  RefreshCw,
  Calendar,
  AlertTriangle,
  UserPlus,
  Filter,
  Check,
  Search,
} from "lucide-react";
import {
  fetchNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
  clearReadNotificationsAction,
} from "@/app/actions/notifications";
import { NotificationItem, NotificationType } from "@/lib/notifications/notification-types";
import { useToast } from "@/components/common/ToastProvider";

export default function NotificationsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "alert" | "update">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsAction(activeTab, 100);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      toastError("Error", "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, toastError]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === "unread" && n.is_read) return false;
      if (statusFilter === "read" && !n.is_read) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notifications, statusFilter, searchQuery]);

  const handleMarkAsRead = async (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationAsReadAction(notif.id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
    success("Completed", "All notifications marked as read.");
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotificationAction(id);
    success("Deleted", "Notification removed.");
  };

  const handleClearRead = async () => {
    if (!confirm("Are you sure you want to clear all read notifications?")) return;
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    await clearReadNotificationsAction();
    success("Cleared", "Read notifications cleared.");
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "payment_received":
      case "installment_due":
      case "installment_overdue":
        return <CreditCard size={16} className="text-[#0481A2]" />;
      case "invoice_created":
      case "invoice_overdue":
        return <FileText size={16} className="text-[#243E76]" />;
      case "renewal_due":
      case "renewal_overdue":
      case "renewal_completed":
        return <RefreshCw size={16} className="text-teal-600" />;
      case "followup_due":
      case "followup_overdue":
        return <Calendar size={16} className="text-blue-600" />;
      case "client_created":
      case "client_updated":
        return <UserPlus size={16} className="text-emerald-600" />;
      case "system_alert":
      default:
        return <AlertTriangle size={16} className="text-amber-600" />;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Notification & Alert Center</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System announcements, approaching deadlines, and activity updates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCheck size={14} className="text-[#0481A2]" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={handleClearRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear read</span>
          </button>

          <button
            onClick={loadNotifications}
            className="p-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-600 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-[#0481A2]" : ""} />
          </button>
        </div>
      </div>

      {/* Control Bar: Categories, Filter, and Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "all" ? "bg-white text-[#243E76] shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("alert")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "alert" ? "bg-white text-red-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab("update")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "update" ? "bg-white text-[#0481A2] shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Updates
          </button>
        </div>

        {/* Read / Unread Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0481A2] text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0481A2] text-slate-800"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100">
        {isLoading && notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto text-[#0481A2] mb-2" />
            <p className="text-xs font-semibold text-slate-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-400">
            <Bell size={32} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="font-bold text-slate-700 text-sm">No notifications found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              There are no pending alerts or activity updates in this view.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex items-start gap-4 hover:bg-slate-50/70 transition-colors ${
                !notif.is_read ? "bg-sky-50/30" : ""
              }`}
            >
              {/* Type Icon */}
              <div
                className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${
                  notif.category === "alert"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-blue-50 text-[#0481A2]"
                } shadow-2xs mt-0.5`}
              >
                {getNotificationIcon(notif.type)}
              </div>

              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#0481A2] shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono shrink-0">
                    {new Date(notif.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  {notif.message}
                </p>

                {/* Bottom Actions */}
                <div className="flex items-center gap-3 mt-2.5">
                  {notif.action_url && (
                    <Link
                      href={notif.action_url}
                      onClick={() => handleMarkAsRead(notif)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0481A2] hover:underline"
                    >
                      <span>Open Page</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}

                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Mark as read
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

