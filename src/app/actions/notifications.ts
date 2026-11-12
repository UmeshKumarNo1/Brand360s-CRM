"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NotificationItem } from "@/lib/notifications/notification-types";

/**
 * Fetch current user notifications with category filter & limit
 */
export async function fetchNotificationsAction(
  category: "all" | "alert" | "update" = "all",
  limit: number = 30
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  // 1. Fetch unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  // 2. Fetch list
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], unreadCount: unreadCount || 0 };
  }

  return {
    notifications: (data || []) as NotificationItem[],
    unreadCount: unreadCount || 0,
  };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("Error marking notification read:", error);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all read:", error);
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Delete a specific notification
 */
export async function deleteNotificationAction(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) {
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Clear all read notifications
 */
export async function clearReadNotificationsAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("recipient_id", user.id)
    .eq("is_read", true);

  if (error) {
    return { success: false };
  }

  revalidatePath("/notifications");
  return { success: true };
}

