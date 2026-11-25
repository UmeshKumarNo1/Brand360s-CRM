"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import { NotificationItem, NotificationType } from "@/lib/notifications/notification-types";

// In-memory set for notifications marked as read during the session
const sessionReadNotifications = new Set<string>();

/**
 * Fetch current user notifications with category filter & limit.
 * Dynamically computes real-time service deadlines (overdue, due today, 1-3d, 4-7d)
 * and follow-up reminders directly from database records, merged with persisted notifications.
 */
export async function fetchNotificationsAction(
  category: "all" | "alert" | "update" = "all",
  limit: number = 30
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  if (!isSupabaseConfigured()) {
    return { notifications: [], unreadCount: 0 };
  }

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { notifications: [], unreadCount: 0 };

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const currentUserId = user.id;

    // Timezone safe calculations based on Asia/Kolkata
    const kolkataNowStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const [ky, km, kd] = kolkataNowStr.split("-").map(Number);
    const todayKolkata = new Date(ky, km - 1, kd);

    const sevenDaysAheadDate = new Date(todayKolkata.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAheadStr = `${sevenDaysAheadDate.getFullYear()}-${String(sevenDaysAheadDate.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAheadDate.getDate()).padStart(2, "0")}`;

    const dynamicAlerts: NotificationItem[] = [];

    // 1. Fetch Service Deadlines (Overdue and within next 7 days)
    let servicesQuery = supabase
      .from("client_services")
      .select(`
        id,
        client_id,
        service_name,
        service_status,
        expected_completion_date,
        assigned_employee_id,
        created_at,
        client:clients!client_id (
          id,
          company_name,
          assigned_salesperson
        )
      `)
      .not("expected_completion_date", "is", null)
      .not("service_status", "in", '("Completed","Cancelled")')
      .lte("expected_completion_date", sevenDaysAheadStr);

    // Role-based filter for services
    if (!isAdmin) {
      servicesQuery = servicesQuery.or(
        `assigned_employee_id.eq.${currentUserId},clients.assigned_salesperson.eq.${currentUserId}`
      );
    }

    const { data: services } = await servicesQuery;

    if (services && services.length > 0) {
      for (const s of services) {
        const client = s.client as any;
        // Strict role check in case OR query on joined table returned broader results
        if (!isAdmin && s.assigned_employee_id !== currentUserId && client?.assigned_salesperson !== currentUserId) {
          continue;
        }

        const targetDateStr = s.expected_completion_date?.includes("T")
          ? s.expected_completion_date.split("T")[0]
          : s.expected_completion_date;
        if (!targetDateStr) continue;

        const [ty, tm, td] = targetDateStr.split("-").map(Number);
        const targetDateObj = new Date(ty, tm - 1, td);
        const diffDays = Math.round((targetDateObj.getTime() - todayKolkata.getTime()) / (1000 * 60 * 60 * 24));

        let formattedTarget = targetDateStr;
        try {
          formattedTarget = targetDateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {}

        const clientName = client?.company_name || "Client";
        const serviceName = s.service_name;

        let title = "";
        let message = "";
        let notifType: NotificationType = "service_deadline_upcoming";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Service: ${serviceName}`;
          message = `${clientName} • ${serviceName} is ${overdueDays} day${overdueDays > 1 ? "s" : ""} past target date (${formattedTarget}).`;
          notifType = "service_deadline_overdue";
        } else if (diffDays === 0) {
          title = `Service Deadline Today: ${serviceName}`;
          message = `${clientName} • ${serviceName} target date is today (${formattedTarget}).`;
          notifType = "service_deadline_today";
        } else if (diffDays <= 3) {
          title = `Upcoming Deadline (in ${diffDays}d): ${serviceName}`;
          message = `${clientName} • Target date is approaching on ${formattedTarget} (${diffDays} day${diffDays > 1 ? "s" : ""} left).`;
          notifType = "service_deadline_upcoming";
        } else if (diffDays <= 7) {
          title = `Upcoming Deadline: ${serviceName}`;
          message = `${clientName} • Target delivery date is scheduled for ${formattedTarget} (${diffDays} days remaining).`;
          notifType = "service_deadline_upcoming";
        } else {
          continue;
        }

        const notifId = `svc-deadline-${s.id}-${targetDateStr}`;
        const isRead = sessionReadNotifications.has(notifId);

        dynamicAlerts.push({
          id: notifId,
          recipient_id: currentUserId,
          title,
          message,
          type: notifType,
          category: "alert",
          entity_type: "client_services",
          entity_id: s.id,
          action_url: `/clients/${s.client_id}?tab=services&serviceId=${s.id}`,
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          created_at: s.created_at || new Date().toISOString(),
        });
      }
    }

    // 2. Fetch Pending Follow-ups (Due today, overdue, or due within next 7 days)
    let followupsQuery = supabase
      .from("follow_ups")
      .select(`
        id,
        client_id,
        title,
        follow_up_type,
        due_date,
        due_time,
        priority,
        status,
        assigned_to,
        created_at,
        client:clients!client_id (
          id,
          company_name
        )
      `)
      .not("status", "ilike", "%completed%")
      .lte("due_date", sevenDaysAheadStr);

    if (!isAdmin) {
      followupsQuery = followupsQuery.eq("assigned_to", currentUserId);
    }

    const { data: followups } = await followupsQuery;

    if (followups && followups.length > 0) {
      for (const f of followups) {
        const dueDateStr = f.due_date?.includes("T") ? f.due_date.split("T")[0] : f.due_date;
        if (!dueDateStr) continue;

        const [fy, fm, fd] = dueDateStr.split("-").map(Number);
        const dueDateObj = new Date(fy, fm - 1, fd);
        const diffDays = Math.round((dueDateObj.getTime() - todayKolkata.getTime()) / (1000 * 60 * 60 * 24));

        let formattedDueDate = dueDateStr;
        try {
          formattedDueDate = dueDateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {}

        const clientName = (f.client as any)?.company_name || "Client";
        const priorityLabel = f.priority ? `[${f.priority}] ` : "";

        let title = "";
        let message = "";
        let notifType: NotificationType = "followup_due";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Follow-up: ${f.title}`;
          message = `${priorityLabel}${clientName} • ${f.follow_up_type || "Follow-up"} was due ${overdueDays} day${overdueDays > 1 ? "s" : ""} ago (${formattedDueDate}).`;
          notifType = "followup_overdue";
        } else if (diffDays === 0) {
          title = `Follow-up Due Today: ${f.title}`;
          message = `${priorityLabel}${clientName} • ${f.follow_up_type || "Follow-up"} is scheduled for today (${formattedDueDate}).`;
          notifType = "followup_due";
        } else {
          title = `Upcoming Follow-up (in ${diffDays}d): ${f.title}`;
          message = `${priorityLabel}${clientName} • Reminder due on ${formattedDueDate} (${diffDays} days left).`;
          notifType = "followup_due";
        }

        const notifId = `followup-${f.id}-${dueDateStr}`;
        const isRead = sessionReadNotifications.has(notifId);

        dynamicAlerts.push({
          id: notifId,
          recipient_id: currentUserId,
          title,
          message,
          type: notifType,
          category: "alert",
          entity_type: "follow_ups",
          entity_id: f.id,
          action_url: "/follow-ups",
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          created_at: f.created_at || new Date().toISOString(),
        });
      }
    }

    // 3. Fetch from persisted notifications table (if table exists)
    let persistedNotifs: NotificationItem[] = [];
    try {
      const { data: dbNotifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (dbNotifs) persistedNotifs = dbNotifs as NotificationItem[];
    } catch {
      // Table doesn't exist or error, gracefully ignore
    }

    // 4. Merge, deduplicate by ID, and filter by category
    const combined = [...dynamicAlerts, ...persistedNotifs];
    const uniqueMap = new Map<string, NotificationItem>();
    combined.forEach((n) => {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    });

    let result = Array.from(uniqueMap.values());

    if (category !== "all") {
      result = result.filter((n) => n.category === category);
    }

    // Sort by unread first, then urgency/date
    result.sort((a, b) => {
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const unreadCount = result.filter((n) => !n.is_read).length;

    return {
      notifications: result.slice(0, limit),
      unreadCount,
    };
  } catch (err) {
    console.error("Error in fetchNotificationsAction:", err);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  sessionReadNotifications.add(notificationId);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !notificationId.startsWith("svc-deadline-") && !notificationId.startsWith("followup-")) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("recipient_id", user.id);
    }
  } catch {
    // Ignore db write failure for dynamic IDs
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
    }
  } catch {
    // Ignore
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Delete a specific notification
 */
export async function deleteNotificationAction(notificationId: string): Promise<{ success: boolean }> {
  sessionReadNotifications.add(notificationId);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("recipient_id", user.id);
    }
  } catch {
    // Ignore
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Clear all read notifications
 */
export async function clearReadNotificationsAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", user.id)
        .eq("is_read", true);
    }
  } catch {
    // Ignore
  }

  revalidatePath("/notifications");
  return { success: true };
}

