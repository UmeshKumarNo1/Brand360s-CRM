import { createClient } from "@/lib/supabase/server";
import { CreateNotificationParams, NotificationItem } from "./notification-types";

/**
 * Server-side notification creation utility.
 * Automatically avoids creating duplicates for identical entity & type within a short time window.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Check for duplicate recent notification for the same entity and type (within 24 hours)
    if (params.entity_id && params.entity_type) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_id", params.recipient_id)
        .eq("entity_type", params.entity_type)
        .eq("entity_id", params.entity_id)
        .eq("type", params.type)
        .gt("created_at", yesterday)
        .maybeSingle();

      if (existing) {
        // Prevent duplicate spam
        return false;
      }
    }

    const { error } = await supabase.from("notifications").insert({
      recipient_id: params.recipient_id,
      title: params.title,
      message: params.message,
      type: params.type,
      category: params.category || (params.type.includes("overdue") || params.type.includes("alert") ? "alert" : "update"),
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      action_url: params.action_url || null,
      is_read: false,
    });

    if (error) {
      console.warn("Could not insert notification:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Failed to create notification:", err);
    return false;
  }
}

/**
 * Notify all admins or specific users
 */
export async function notifyAdmins(params: Omit<CreateNotificationParams, "recipient_id">): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await createNotification({
          ...params,
          recipient_id: admin.id,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to notify admins:", err);
  }
}

