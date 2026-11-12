"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";

export interface FollowupActionState {
  error?: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export interface FollowupItem {
  id: string;
  clientId: string;
  companyName: string;
  clientCode: string;
  contactPerson: string;
  assignedToName: string;
  assignedToId: string;
  title: string;
  followUpType: string;
  type: string;
  dueDate: string;
  dueTime?: string | null;
  priority: string;
  status: string;
  notes?: string | null;
  description?: string | null;
  completionNotes?: string | null;
  completedAt?: string | null;
  completedByName?: string | null;
  reminderSetting?: string | null;
  contactMethod?: string | null;
  isOverdue: boolean;
  overdueDays: number;
}

function normalizeFollowupType(rawType?: string | null): string {
  if (!rawType) return "General";
  const trimmed = rawType.trim();
  switch (trimmed) {
    case "Phone Call":
    case "Call":
      return "Call";
    case "Email":
      return "Email";
    case "Meeting":
    case "Client Consultation":
      return "Meeting";
    case "Document Request":
    case "Document Collection":
      return "Document Collection";
    case "Payment Reminder":
      return "Payment Reminder";
    case "General":
    case "Service Update":
    case "Renewal Reminder":
    case "Other":
    default:
      return "General";
  }
}

function normalizePriority(rawPriority?: string | null): string {
  if (!rawPriority) return "Medium";
  const trimmed = rawPriority.trim();
  if (trimmed === "Urgent" || trimmed === "High") return "High";
  if (trimmed === "Low") return "Low";
  return "Medium";
}
export async function fetchFollowupsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      *,
      client:clients!client_id (id, company_name, client_code, contact_person, client_status),
      assigned_profile:profiles!assigned_to (id, full_name, email)
    `)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching follow-ups:", error);
    return [];
  }

  // Fetch completer names safely if any follow-up is completed
  const completerIds = Array.from(
    new Set((data || []).map((f: any) => f.completed_by).filter(Boolean))
  ) as string[];

  let completerMap: Record<string, string> = {};
  if (completerIds.length > 0) {
    const { data: completers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", completerIds);
    if (completers) {
      completerMap = completers.reduce((acc: any, c: any) => {
        acc[c.id] = c.full_name;
        return acc;
      }, {});
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (data || []).map((f: any) => {
    const isCompletedOrCancelled = f.status === "Completed" || f.status === "Cancelled";
    const isOverdue = !isCompletedOrCancelled && f.due_date < todayStr;
    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(f.due_date).getTime());
    const overdueDays = isOverdue ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    return {
      id: f.id,
      clientId: f.client?.id || f.client_id,
      companyName: f.client?.company_name || "Unknown Company",
      clientCode: f.client?.client_code || "B360-1000",
      clientStatus: f.client?.client_status || "Active",
      contactPerson: f.contact_person || f.client?.contact_person || "-",
      assignedToName: f.assigned_profile?.full_name || "Assigned Staff",
      assignedToId: f.assigned_to,
      title: f.title,
      followUpType: f.follow_up_type || "General",
      type: f.follow_up_type || "General",
      dueDate: f.due_date,
      dueTime: f.due_time || null,
      priority: f.priority || "Medium",
      status: f.status || "Pending",
      notes: f.notes,
      description: f.notes,
      completionNotes: f.completion_notes || null,
      completedAt: f.completed_at ? new Date(f.completed_at).toLocaleString("en-IN") : null,
      completedByName: f.completed_by ? completerMap[f.completed_by] || null : null,
      reminderSetting: f.reminder_setting || "none",
      contactMethod: f.contact_method || "Phone",
      isOverdue,
      overdueDays,
    };
  });
}

/**
 * Create a new follow-up
 */
export async function createFollowupAction(
  prevState: FollowupActionState | null,
  formData: FormData
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to create follow-up." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  const clientId = formData.get("client_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const followUpType = normalizeFollowupType(formData.get("follow_up_type") as string);
  const dueDate = formData.get("due_date") as string;
  const dueTime = (formData.get("due_time") as string) || null;
  const priority = normalizePriority(formData.get("priority") as string);
  const status = (formData.get("status") as string) || "Pending";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const contactPerson = (formData.get("contact_person") as string)?.trim() || null;
  const contactMethod = (formData.get("contact_method") as string) || "Phone";
  const reminderSetting = (formData.get("reminder_setting") as string) || "none";

  // Assignment logic
  let assignedTo = user.id;
  if (isAdmin) {
    const selectedAssigned = formData.get("assigned_to") as string;
    if (selectedAssigned) {
      assignedTo = selectedAssigned;
    }
  }

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Follow-up title is required.";
  if (!clientId) fieldErrors.client_id = "Please select a client.";
  if (!dueDate) fieldErrors.due_date = "Due date is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  // Check if client is archived (Admins can override, salespersons cannot)
  const { data: clientData } = await supabase
    .from("clients")
    .select("company_name, client_status")
    .eq("id", clientId)
    .single();

  if (clientData?.client_status === "Archived" && !isAdmin) {
    return { error: "Cannot create follow-ups for archived clients." };
  }

  const { data: created, error } = await supabase
    .from("follow_ups")
    .insert({
      client_id: clientId,
      assigned_to: assignedTo,
      title,
      follow_up_type: followUpType,
      due_date: dueDate,
      due_time: dueTime,
      priority,
      status,
      notes,
      contact_person: contactPerson,
      contact_method: contactMethod,
      reminder_setting: reminderSetting,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  await recordAuditLog({
    actorId: user.id,
    action: "CREATE",
    entityType: "follow_up",
    entityId: created.id,
    entityName: title,
    details: {
      client_id: clientId,
      client_name: clientData?.company_name,
      assigned_to: assignedTo,
      due_date: dueDate,
      priority,
    },
  });

  revalidatePath("/follow-ups");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Update an existing follow-up
 */
export async function updateFollowupAction(
  prevState: FollowupActionState | null,
  formData: FormData
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to update follow-up." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  const id = formData.get("id") as string;
  const clientId = formData.get("client_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const followUpType = normalizeFollowupType(formData.get("follow_up_type") as string);
  const dueDate = formData.get("due_date") as string;
  const dueTime = (formData.get("due_time") as string) || null;
  const priority = normalizePriority(formData.get("priority") as string);
  const status = (formData.get("status") as string) || "Pending";
  const notes = (formData.get("notes") as string)?.trim() || null;
  const contactPerson = (formData.get("contact_person") as string)?.trim() || null;
  const contactMethod = (formData.get("contact_method") as string) || "Phone";
  const reminderSetting = (formData.get("reminder_setting") as string) || "none";

  if (!id) return { error: "Follow-up ID is required." };
  if (!title || !dueDate) return { error: "Title and due date are required." };

  // Fetch existing follow-up
  const { data: existing, error: fetchErr } = await supabase
    .from("follow_ups")
    .select("*, client:clients(company_name)")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return { error: "Follow-up not found." };

  // Non-admin can only edit if assigned to them
  if (!isAdmin && existing.assigned_to !== user.id) {
    return { error: "You are not authorized to edit this follow-up." };
  }

  // Determine assigned_to: Admins can reassign; employees preserve existing assignment
  let assignedTo = existing.assigned_to;
  if (isAdmin) {
    const selectedAssigned = formData.get("assigned_to") as string;
    if (selectedAssigned && selectedAssigned.trim() !== "") {
      assignedTo = selectedAssigned;
    }
  }

  const updatePayload: Record<string, any> = {
    title,
    follow_up_type: followUpType,
    due_date: dueDate,
    due_time: dueTime,
    priority,
    status,
    notes,
    assigned_to: assignedTo,
    contact_person: contactPerson,
    contact_method: contactMethod,
    reminder_setting: reminderSetting,
    updated_at: new Date().toISOString(),
  };

  if (clientId) {
    updatePayload.client_id = clientId;
  }

  // If status is transitioning to Completed
  if (status === "Completed" && existing.status !== "Completed") {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = user.id;
  } else if (status !== "Completed" && existing.status === "Completed") {
    // Reopening
    updatePayload.completed_at = null;
    updatePayload.completed_by = null;
  }

  const { error: updateErr } = await supabase
    .from("follow_ups")
    .update(updatePayload)
    .eq("id", id);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await recordAuditLog({
    actorId: user.id,
    action: status === "Completed" ? "COMPLETED" : "UPDATE",
    entityType: "follow_up",
    entityId: id,
    entityName: title,
    details: {
      previous_status: existing.status,
      new_status: status,
      previous_due_date: existing.due_date,
      new_due_date: dueDate,
      previous_assigned_to: existing.assigned_to,
      new_assigned_to: assignedTo,
    },
  });

  revalidatePath("/follow-ups");
  if (clientId || existing.client_id) {
    revalidatePath(`/clients/${clientId || existing.client_id}`);
  }
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Complete a follow-up with optional completion notes
 */
export async function completeFollowupAction(
  followupId: string,
  completionNotes?: string
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication required." };

  const { data: existing } = await supabase
    .from("follow_ups")
    .select("title, client_id, assigned_to")
    .eq("id", followupId)
    .single();

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "Completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      completion_notes: completionNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", followupId);

  if (error) return { error: error.message };

  await recordAuditLog({
    actorId: user.id,
    action: "COMPLETED",
    entityType: "follow_up",
    entityId: followupId,
    entityName: existing?.title || "Follow-up",
    details: { completion_notes: completionNotes },
  });

  revalidatePath("/follow-ups");
  if (existing?.client_id) revalidatePath(`/clients/${existing.client_id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Cancel a follow-up
 */
export async function cancelFollowupAction(followupId: string): Promise<FollowupActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", followupId);

  if (error) return { error: error.message };

  await recordAuditLog({
    actorId: user.id,
    action: "CANCEL",
    entityType: "follow_up",
    entityId: followupId,
  });

  revalidatePath("/follow-ups");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Mark in-progress
 */
export async function markInProgressFollowupAction(followupId: string): Promise<FollowupActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({
      status: "In Progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", followupId);

  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  return { success: true };
}

/**
 * Delete a follow-up (Admin or user's own Pending task)
 */
export async function deleteFollowupAction(
  followupId: string,
  clientId?: string
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  const { data: existing } = await supabase
    .from("follow_ups")
    .select("title, assigned_to, status")
    .eq("id", followupId)
    .single();

  // If not admin, can only delete own pending follow-up
  if (!isAdmin) {
    if (!existing || existing.assigned_to !== user.id || existing.status !== "Pending") {
      return { error: "You can only delete your own pending follow-ups." };
    }
  }

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followupId);

  if (error) return { error: error.message };

  await recordAuditLog({
    actorId: user.id,
    action: "DELETE",
    entityType: "follow_up",
    entityId: followupId,
    entityName: existing?.title,
  });

  revalidatePath("/follow-ups");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Fetch follow-ups for a specific client
 */
export async function fetchClientFollowupsAction(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      *,
      assigned_profile:profiles!assigned_to (id, full_name, email)
    `)
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) return [];
  const todayStr = new Date().toISOString().split("T")[0];

  return (data || []).map((f: any) => ({
    ...f,
    type: f.follow_up_type,
    description: f.notes,
    assignedToName: f.assigned_profile?.full_name || "Assigned Staff",
    assignedToId: f.assigned_to,
    isOverdue: f.status !== "Completed" && f.status !== "Cancelled" && f.due_date < todayStr,
  }));
}

/**
 * Legacy status toggle helper for backwards compatibility
 */
export async function updateFollowupStatusAction(
  followupId: string,
  newStatus: string,
  clientId?: string
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", followupId);

  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
