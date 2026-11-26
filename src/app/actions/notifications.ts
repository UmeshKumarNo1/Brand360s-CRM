"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import { NotificationItem, NotificationType, NotificationCounts } from "@/lib/notifications/notification-types";

// In-memory set for notifications marked as read during the session
const sessionReadNotifications = new Set<string>();

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, { auth: { persistSession: false } });
}

/**
 * Fetch current user notifications with category filter & limit.
 * Dynamically computes real-time service deadlines (overdue, due today, 1-3d, 4-7d)
 * and follow-up reminders directly from database records, merged with persisted notifications.
 */
export async function fetchNotificationsAction(
  category: "all" | "alert" | "update" = "all",
  limit: number = 30
): Promise<{ notifications: NotificationItem[]; unreadCount: number; counts: NotificationCounts }> {
  if (!isSupabaseConfigured()) {
    return { notifications: [], unreadCount: 0, counts: { all: 0, alert: 0, update: 0, unread: 0 } };
  }

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { notifications: [], unreadCount: 0, counts: { all: 0, alert: 0, update: 0, unread: 0 } };

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
        let badgeColor: "red" | "orange" | "yellow" | "green" = "green";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Service: ${serviceName}`;
          message = `${clientName} • ${serviceName} is ${overdueDays} day${overdueDays > 1 ? "s" : ""} past target date (${formattedTarget}).`;
          notifType = "service_deadline_overdue";
          badgeColor = "red";
        } else if (diffDays === 0) {
          title = `Service Deadline Today: ${serviceName}`;
          message = `${clientName} • ${serviceName} target date is today (${formattedTarget}).`;
          notifType = "service_deadline_today";
          badgeColor = "red";
        } else if (diffDays <= 3) {
          title = `Upcoming Deadline (in ${diffDays}d): ${serviceName}`;
          message = `${clientName} • Target date is approaching on ${formattedTarget} (${diffDays} day${diffDays > 1 ? "s" : ""} left).`;
          notifType = "service_deadline_upcoming";
          badgeColor = "orange";
        } else if (diffDays <= 7) {
          title = `Upcoming Deadline: ${serviceName}`;
          message = `${clientName} • Target delivery date is scheduled for ${formattedTarget} (${diffDays} days remaining).`;
          notifType = "service_deadline_upcoming";
          badgeColor = "green";
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
          badge_label: "Service",
          badge_color: badgeColor,
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
        let badgeColor: "red" | "orange" = "orange";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Follow-up: ${f.title}`;
          message = `${priorityLabel}${clientName} • Client follow-up overdue by ${overdueDays}d (${formattedDueDate}). Please complete the pending follow-up.`;
          notifType = "followup_overdue";
          badgeColor = "red";
        } else if (diffDays === 0) {
          title = `Follow-up Due Today: ${f.title}`;
          message = `${priorityLabel}${clientName} • ${f.follow_up_type || "Follow-up"} is scheduled for today (${formattedDueDate}).`;
          notifType = "followup_due";
          badgeColor = "red";
        } else {
          title = `Upcoming Follow-up: ${f.title}`;
          message = `${priorityLabel}${clientName} • Reminder due on ${formattedDueDate} (${diffDays} days left).`;
          notifType = "followup_due";
          badgeColor = "orange";
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
          badge_label: "Follow-up",
          badge_color: badgeColor,
          entity_type: "follow_ups",
          entity_id: f.id,
          action_url: "/follow-ups",
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          created_at: f.created_at || new Date().toISOString(),
        });
      }
    }

    // 3. Fetch Invoices Alerts (Overdue or Due within next 7 days with outstanding balance)
    let invoicesQuery = supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        client_id,
        due_date,
        status,
        balance_due,
        total_amount,
        created_at,
        client:clients!client_id (
          id,
          company_name,
          assigned_salesperson
        )
      `)
      .gt("balance_due", 0)
      .not("due_date", "is", null)
      .lte("due_date", sevenDaysAheadStr);

    if (!isAdmin) {
      invoicesQuery = invoicesQuery.eq("client.assigned_salesperson", currentUserId);
    }

    const { data: invoices } = await invoicesQuery;

    if (invoices && invoices.length > 0) {
      for (const inv of invoices) {
        const client = inv.client as any;
        if (!isAdmin && client?.assigned_salesperson !== currentUserId) {
          continue;
        }

        const dueDateStr = inv.due_date?.includes("T") ? inv.due_date.split("T")[0] : inv.due_date;
        if (!dueDateStr) continue;

        const [iy, im, id] = dueDateStr.split("-").map(Number);
        const dueDateObj = new Date(iy, im - 1, id);
        const diffDays = Math.round((dueDateObj.getTime() - todayKolkata.getTime()) / (1000 * 60 * 60 * 24));

        let formattedDueDate = dueDateStr;
        try {
          formattedDueDate = dueDateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {}

        const clientName = client?.company_name || "Client";
        const balanceFmt = `₹${Number(inv.balance_due).toLocaleString("en-IN")}`;

        let title = "";
        let message = "";
        let notifType: NotificationType = "payment_due";
        let badgeColor: "red" | "orange" = "orange";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Payment: ${inv.invoice_number}`;
          message = `${clientName} • Invoice is ${overdueDays} day${overdueDays > 1 ? "s" : ""} overdue with balance ${balanceFmt}.`;
          notifType = "payment_overdue";
          badgeColor = "red";
        } else if (diffDays === 0) {
          title = `Payment Due Today: ${inv.invoice_number}`;
          message = `${clientName} • Payment of ${balanceFmt} is due today (${formattedDueDate}).`;
          notifType = "payment_due";
          badgeColor = "red";
        } else {
          title = `Payment Due Soon: ${inv.invoice_number}`;
          message = `${clientName} • Outstanding balance of ${balanceFmt} due on ${formattedDueDate} (${diffDays} days left).`;
          notifType = "payment_due";
          badgeColor = "orange";
        }

        const notifId = `inv-due-${inv.id}-${dueDateStr}`;
        const isRead = sessionReadNotifications.has(notifId);

        dynamicAlerts.push({
          id: notifId,
          recipient_id: currentUserId,
          title,
          message,
          type: notifType,
          category: "alert",
          badge_label: "Payment",
          badge_color: badgeColor,
          entity_type: "invoices",
          entity_id: inv.id,
          action_url: "/payments",
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          created_at: inv.created_at || new Date().toISOString(),
        });
      }
    }

    // 4. Fetch Renewals Alerts (Renewal reminder due or overdue)
    let renewalsQuery = supabase
      .from("renewals")
      .select(`
        id,
        client_id,
        service_name_snapshot,
        renewal_date,
        reminder_date,
        renewal_status,
        renewal_amount,
        created_at,
        client:clients!client_id (
          id,
          company_name,
          assigned_salesperson
        )
      `)
      .not("renewal_status", "in", '("Renewed","Cancelled")')
      .not("renewal_date", "is", null)
      .lte("renewal_date", sevenDaysAheadStr);

    if (!isAdmin) {
      renewalsQuery = renewalsQuery.eq("client.assigned_salesperson", currentUserId);
    }

    const { data: renewals } = await renewalsQuery;

    if (renewals && renewals.length > 0) {
      for (const ren of renewals) {
        const client = ren.client as any;
        if (!isAdmin && client?.assigned_salesperson !== currentUserId) {
          continue;
        }

        const renewalDateStr = ren.renewal_date?.includes("T") ? ren.renewal_date.split("T")[0] : ren.renewal_date;
        if (!renewalDateStr) continue;

        const [ry, rm, rd] = renewalDateStr.split("-").map(Number);
        const renewalDateObj = new Date(ry, rm - 1, rd);
        const diffDays = Math.round((renewalDateObj.getTime() - todayKolkata.getTime()) / (1000 * 60 * 60 * 24));

        let formattedRenewalDate = renewalDateStr;
        try {
          formattedRenewalDate = renewalDateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {}

        const clientName = client?.company_name || "Client";
        const serviceName = ren.service_name_snapshot || "Service";

        let title = "";
        let message = "";
        let notifType: NotificationType = "renewal_due";
        let badgeColor: "purple" | "red" = "purple";

        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          title = `Overdue Renewal: ${serviceName}`;
          message = `${clientName} • Renewal was due ${overdueDays} day${overdueDays > 1 ? "s" : ""} ago (${formattedRenewalDate}).`;
          notifType = "renewal_overdue";
          badgeColor = "red";
        } else {
          title = `Renewal Approaching: ${serviceName}`;
          message = `${clientName} • Service renewal due on ${formattedRenewalDate} (${diffDays} days left).`;
          notifType = "renewal_due";
          badgeColor = "purple";
        }

        const notifId = `ren-due-${ren.id}-${renewalDateStr}`;
        const isRead = sessionReadNotifications.has(notifId);

        dynamicAlerts.push({
          id: notifId,
          recipient_id: currentUserId,
          title,
          message,
          type: notifType,
          category: "alert",
          badge_label: "Renewal",
          badge_color: badgeColor,
          entity_type: "renewals",
          entity_id: ren.id,
          action_url: "/renewals",
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          created_at: ren.created_at || new Date().toISOString(),
        });
      }
    }

    // 5. Fetch Real-time CRM Activity Updates from audit_logs using elevated reader
    const dynamicUpdates: NotificationItem[] = [];
    try {
      const adminClient = getAdminClient() || supabase;
      const { data: recentAudits } = await adminClient
        .from("audit_logs")
        .select(`
          id,
          actor_id,
          action,
          entity_type,
          entity_id,
          entity_name,
          details,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (recentAudits && recentAudits.length > 0) {
        for (const log of recentAudits) {
          const notifId = `audit-${log.id}`;
          const isRead = sessionReadNotifications.has(notifId);

          let title = "";
          let message = "";
          let notifType: NotificationType = "system_alert";
          let actionUrl: string = "/clients";
          let badgeLabel = "Activity";
          let badgeColor: "blue" | "green" | "purple" | "slate" = "blue";

          const entityName = log.entity_name || "Record";
          const actionWord = log.action === "CREATE" ? "created" : log.action === "UPDATE" ? "updated" : log.action === "DELETE" ? "removed" : log.action.toLowerCase();

          switch (log.entity_type) {
            case "client":
              notifType = log.action === "CREATE" ? "client_created" : "client_updated";
              title = log.action === "CREATE" ? `New Client: ${entityName}` : `Client Updated: ${entityName}`;
              message = `Client account ${entityName} was successfully ${actionWord}.`;
              actionUrl = log.entity_id ? `/clients/${log.entity_id}` : "/clients";
              badgeLabel = "Client";
              badgeColor = "green";
              break;
            case "client_service":
              notifType = log.action === "CREATE" ? "service_assigned" : "service_updated";
              title = log.action === "CREATE" ? `Service Assigned: ${entityName}` : `Service Updated: ${entityName}`;
              message = `Service details for ${entityName} were ${actionWord}.`;
              actionUrl = "/clients";
              badgeLabel = "Service";
              badgeColor = "blue";
              break;
            case "payment":
              notifType = "payment_received";
              title = `Payment Recorded: ${entityName}`;
              message = `Payment transaction for ${entityName} was recorded.`;
              actionUrl = "/payments";
              badgeLabel = "Payment";
              badgeColor = "green";
              break;
            case "invoice":
              notifType = log.action === "CREATE" ? "invoice_created" : "invoice_updated";
              title = `Invoice ${log.action === "CREATE" ? "Generated" : "Updated"}: ${entityName}`;
              message = `Invoice ${entityName} was ${actionWord}.`;
              actionUrl = "/payments";
              badgeLabel = "Invoice";
              badgeColor = "blue";
              break;
            case "follow_up":
              notifType = log.action === "CREATE" ? "followup_created" : "followup_completed";
              title = `Follow-up ${log.action === "CREATE" ? "Added" : "Updated"}: ${entityName}`;
              message = `Follow-up ${entityName} was ${actionWord}.`;
              actionUrl = "/follow-ups";
              badgeLabel = "Follow-up";
              badgeColor = "slate";
              break;
            case "renewal":
              notifType = "renewal_completed";
              title = `Renewal ${actionWord}: ${entityName}`;
              message = `Renewal cycle for ${entityName} was ${actionWord}.`;
              actionUrl = "/renewals";
              badgeLabel = "Renewal";
              badgeColor = "purple";
              break;
            default:
              title = `${log.entity_type || "CRM"} ${actionWord}: ${entityName}`;
              message = `Activity logged on ${entityName}.`;
              actionUrl = "/clients";
              badgeLabel = "Activity";
              badgeColor = "slate";
              break;
          }

          dynamicUpdates.push({
            id: notifId,
            recipient_id: currentUserId,
            title,
            message,
            type: notifType,
            category: "update",
            badge_label: badgeLabel,
            badge_color: badgeColor,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            action_url: actionUrl,
            is_read: isRead,
            read_at: isRead ? new Date().toISOString() : null,
            created_at: log.created_at || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Graceful fallback
    }

    // 6. Fetch from persisted notifications table (if table exists)
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
      // Gracefully ignore
    }

    // 7. Merge, deduplicate by ID, and filter by category
    const combined = [...dynamicAlerts, ...dynamicUpdates, ...persistedNotifs];
    const uniqueMap = new Map<string, NotificationItem>();
    combined.forEach((n) => {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    });

    const allItems = Array.from(uniqueMap.values());

    // Calculate actual category counts before filtering
    const counts: NotificationCounts = {
      all: allItems.length,
      alert: allItems.filter((n) => n.category === "alert").length,
      update: allItems.filter((n) => n.category === "update").length,
      unread: allItems.filter((n) => !n.is_read).length,
    };

    let result = allItems;
    if (category !== "all") {
      result = result.filter((n) => n.category === category);
    }

    // Sort by unread first, then date
    result.sort((a, b) => {
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const unreadCount = result.filter((n) => !n.is_read).length;

    return {
      notifications: result.slice(0, limit),
      unreadCount,
      counts,
    };
  } catch (err) {
    console.error("Error in fetchNotificationsAction:", err);
    return { notifications: [], unreadCount: 0, counts: { all: 0, alert: 0, update: 0, unread: 0 } };
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
    const isDynamic =
      notificationId.startsWith("svc-deadline-") ||
      notificationId.startsWith("followup-") ||
      notificationId.startsWith("inv-due-") ||
      notificationId.startsWith("ren-due-") ||
      notificationId.startsWith("audit-");

    if (user && !isDynamic) {
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

