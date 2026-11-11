"use server";

import { createClient } from "@/lib/supabase/server";

export interface LogAuditParams {
  actorId?: string;
  action: "DELETE" | "ARCHIVE" | "VOID" | "CANCEL" | "UPDATE" | "CREATE";
  entityType:
    | "client"
    | "employee"
    | "vendor"
    | "follow_up"
    | "client_service"
    | "payment"
    | "invoice"
    | "installment"
    | "incentive";
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
}

/**
 * Inserts a permanent audit record into public.audit_logs
 */
export async function recordAuditLog(params: LogAuditParams) {
  try {
    const supabase = await createClient();

    let actor = params.actorId;
    if (!actor) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      actor = user?.id;
    }

    await supabase.from("audit_logs").insert({
      actor_id: actor || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName || null,
      details: params.details || {},
    });
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
}

/**
 * Checks whether the current session user is an active Admin
 */
export async function verifyAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Authentication required.", user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    return {
      authorized: false,
      error: "Admin authorization required for this action.",
      user,
      profile,
    };
  }

  return { authorized: true, error: null, user, profile };
}

