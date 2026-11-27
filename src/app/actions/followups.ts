"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  phone?: string | null;
  hasActivityLogged?: boolean;
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
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      *,
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

    let parsedNotes: any = {};
    try {
      if (f.notes && typeof f.notes === "string" && f.notes.startsWith("{")) {
        parsedNotes = JSON.parse(f.notes);
      }
    } catch {}

    const hasActivityLogged =
      (f.last_follow_up !== "Imported" &&
        f.last_follow_up !== null &&
        f.last_follow_up !== undefined &&
        f.last_follow_up !== "New") ||
      (Array.isArray(parsedNotes.history) && parsedNotes.history.length > 0);

    return {
      id: f.id,
      clientId: f.converted_client_id || f.client_id || null,
      companyName: f.company_name || f.client?.company_name || "Unknown Company",
      clientCode: f.converted_client_id ? "Client" : "Lead",
      clientStatus: f.status === "Converted to Client" ? "Active" : "Lead",
      contactPerson: f.contact_person || "-",
      phone: f.phone || "-",
      assignedToName: f.assigned_name || f.assigned_profile?.full_name || "Assigned Staff",
      assignedToId: f.assigned_to,
      title: f.title || `Follow-up: ${f.company_name}`,
      followUpType: f.follow_up_type || "General",
      type: f.follow_up_type || "General",
      dueDate: f.due_date,
      dueTime: f.due_time || null,
      priority: f.priority || "Medium",
      status: f.status || "Pending",
      lastFollowUp: f.last_follow_up || "-",
      notes: f.notes,
      description: f.notes,
      completionNotes: f.completion_notes || null,
      completedAt: f.completed_at ? new Date(f.completed_at).toLocaleString("en-IN") : null,
      completedByName: f.completed_by ? completerMap[f.completed_by] || null : null,
      reminderSetting: f.reminder_setting || "none",
      contactMethod: f.contact_method || "Phone",
      isOverdue,
      overdueDays,
      isLead: !f.converted_client_id,
      hasActivityLogged,
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
      converted_client_id: clientId,
      company_name: clientData?.company_name || null,
      assigned_to: assignedTo,
      title,
      follow_up_type: followUpType,
      due_date: dueDate,
      due_time: dueTime,
      priority,
      status,
      notes,
      contact_person: contactPerson,
      last_follow_up: "Created",
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
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return { error: "Follow-up not found." };

  // Non-admin can only edit if assigned to them
  if (!isAdmin && existing.assigned_to !== user.id) {
    return { error: "You are not authorized to edit this follow-up." };
  }

  // Determine assigned_to: Admins can reassign; employees preserve existing assignment
  let assignedTo = existing.assigned_to;
  let assignedName = existing.assigned_name;
  if (isAdmin) {
    const selectedAssigned = formData.get("assigned_to") as string;
    if (selectedAssigned && selectedAssigned.trim() !== "") {
      assignedTo = selectedAssigned;
      const { data: assigneeProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", assignedTo)
        .single();
      if (assigneeProfile?.full_name) {
        assignedName = assigneeProfile.full_name;
      }
    }
  }

  let notesToSave = notes;
  if (existing.notes && typeof existing.notes === "string" && existing.notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(existing.notes.trim());
      parsed.userNotes = notes || "";
      parsed.notes = notes || "";
      if (contactMethod) parsed.contactMethod = contactMethod;
      if (reminderSetting) parsed.reminderSetting = reminderSetting;
      notesToSave = JSON.stringify(parsed);
    } catch {
      notesToSave = notes;
    }
  }

  const updatePayload: Record<string, any> = {
    title,
    follow_up_type: followUpType,
    due_date: dueDate,
    due_time: dueTime,
    priority,
    status,
    notes: notesToSave,
    assigned_to: assignedTo,
    assigned_name: assignedName,
    contact_person: contactPerson,
    last_follow_up: "Updated",
    updated_at: new Date().toISOString(),
  };

  if (clientId && clientId.trim() !== "") {
    updatePayload.converted_client_id = clientId;
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

export interface CompleteAndScheduleInput {
  followupId: string;
  outcome: string; // 'Interested' | 'Not Interested' | 'No Answer' | 'Call Back Requested' | 'Proposal Requested' | 'Meeting Scheduled' | 'Other'
  discussionNotes?: string;
  actualCompletedAt?: string;
  scheduleNext: boolean;
  nextTitle?: string;
  nextFollowUpType?: string;
  nextDueDate?: string;
  nextDueTime?: string | null;
  nextAssignedTo?: string;
  nextPriority?: string;
  nextReminderSetting?: string;
  nextActionNotes?: string;
}

/**
 * Atomic Server Action: Complete existing follow-up AND schedule next follow-up task
 * Both activities are stored as separate database records.
 */
export async function completeAndScheduleFollowupAction(
  input: CompleteAndScheduleInput
): Promise<FollowupActionState & { nextFollowupId?: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";

  const { data: existing, error: fetchErr } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("id", input.followupId)
    .single();

  if (fetchErr || !existing) return { error: "Follow-up record not found." };

  if (!isAdmin && existing.assigned_to !== user.id) {
    return { error: "You are not authorized to complete this follow-up." };
  }

  const recordedDate = input.actualCompletedAt
    ? new Date(input.actualCompletedAt).toISOString()
    : new Date().toISOString();
  const recorderName = currentProfile?.full_name || user.email || "Representative";

  // Parse existing JSON metadata if present
  let parsedMetadata: any = null;
  if (existing.notes && typeof existing.notes === "string" && existing.notes.trim().startsWith("{")) {
    try {
      parsedMetadata = JSON.parse(existing.notes.trim());
    } catch {
      parsedMetadata = null;
    }
  }

  const historyEntry = {
    date: recordedDate,
    outcome: input.outcome || "Completed",
    notes: input.discussionNotes || "",
    recordedBy: recorderName,
    action: "Completed",
    followupTitle: existing.title,
    followupType: existing.follow_up_type,
    scheduledNext: !!input.scheduleNext,
  };

  let completedNotesStr = existing.notes;
  if (parsedMetadata) {
    if (!Array.isArray(parsedMetadata.history)) {
      parsedMetadata.history = [];
    }
    parsedMetadata.history.unshift(historyEntry);
    parsedMetadata.userNotes = input.discussionNotes || "";
    parsedMetadata.lastOutcome = input.outcome;
    parsedMetadata.completedAt = recordedDate;
    parsedMetadata.completedBy = user.id;
    completedNotesStr = JSON.stringify(parsedMetadata);
  } else {
    const textEntry = `[${new Date(recordedDate).toLocaleDateString("en-IN")} - ${input.outcome}]: ${
      input.discussionNotes || "No notes provided."
    }`;
    completedNotesStr = existing.notes ? `${existing.notes}\n\n${textEntry}` : textEntry;
  }

  // 1. Update existing follow-up (Record 1: Completed)
  const { error: updateErr } = await supabase
    .from("follow_ups")
    .update({
      status: "Completed",
      notes: completedNotesStr,
      last_follow_up: input.outcome || "Completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.followupId);

  if (updateErr) {
    return { error: `Failed to complete follow-up: ${updateErr.message}` };
  }

  let newFollowupId: string | null = null;

  // 2. If next follow-up scheduling is enabled, create Record 2
  if (input.scheduleNext) {
    if (!input.nextDueDate) {
      // Revert completion
      await supabase
        .from("follow_ups")
        .update({
          status: existing.status,
          notes: existing.notes,
          last_follow_up: existing.last_follow_up,
          updated_at: existing.updated_at,
        })
        .eq("id", input.followupId);
      return { error: "Please select a valid date for the next follow-up." };
    }

    let targetAssignedTo = existing.assigned_to;
    let targetAssignedName = existing.assigned_name;
    if (isAdmin && input.nextAssignedTo && input.nextAssignedTo !== existing.assigned_to) {
      targetAssignedTo = input.nextAssignedTo;
      const { data: assigneeProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", targetAssignedTo)
        .single();
      if (assigneeProfile?.full_name) {
        targetAssignedName = assigneeProfile.full_name;
      }
    }

    let nextNotesStr = input.nextActionNotes || "";
    if (parsedMetadata) {
      const nextMetadata = {
        ...parsedMetadata,
        userNotes: input.nextActionNotes || "",
        previousFollowupId: existing.id,
        reminderSetting: input.nextReminderSetting || "none",
      };
      nextNotesStr = JSON.stringify(nextMetadata);
    } else {
      nextNotesStr = input.nextActionNotes
        ? `${input.nextActionNotes}\n\n[Previous task: ${existing.title}]`
        : `[Previous task: ${existing.title}]`;
    }

    const { data: newFollowup, error: insertErr } = await supabase
      .from("follow_ups")
      .insert({
        company_name: existing.company_name,
        contact_person: existing.contact_person,
        phone: existing.phone,
        service_interested: existing.service_interested,
        converted_client_id: existing.converted_client_id || null,
        assigned_to: targetAssignedTo,
        assigned_name: targetAssignedName,
        title: input.nextTitle || `Follow-up - ${existing.company_name || existing.title}`,
        follow_up_type: normalizeFollowupType(input.nextFollowUpType),
        due_date: input.nextDueDate,
        due_time: input.nextDueTime || null,
        priority: normalizePriority(input.nextPriority),
        status: "Pending",
        notes: nextNotesStr,
        last_follow_up: "Scheduled",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr) {
      // Revert completion of Record 1 for transactional integrity
      await supabase
        .from("follow_ups")
        .update({
          status: existing.status,
          notes: existing.notes,
          last_follow_up: existing.last_follow_up,
          updated_at: existing.updated_at,
        })
        .eq("id", input.followupId);

      return { error: `Failed to schedule next follow-up: ${insertErr.message}` };
    }

    newFollowupId = newFollowup?.id || null;
  }

  // Audit Logs
  await recordAuditLog({
    actorId: user.id,
    action: "COMPLETED",
    entityType: "follow_up",
    entityId: input.followupId,
    entityName: existing.title,
    details: {
      outcome: input.outcome,
      discussionNotes: input.discussionNotes,
      actualCompletedAt: recordedDate,
      nextScheduled: input.scheduleNext,
      nextFollowupId: newFollowupId,
    },
  });

  if (newFollowupId) {
    await recordAuditLog({
      actorId: user.id,
      action: "CREATE",
      entityType: "follow_up",
      entityId: newFollowupId,
      entityName: input.nextTitle || `Follow-up - ${existing.company_name}`,
      details: {
        previousFollowupId: existing.id,
        dueDate: input.nextDueDate,
        priority: input.nextPriority,
      },
    });
  }

  revalidatePath("/follow-ups");
  if (existing.converted_client_id) {
    revalidatePath(`/clients/${existing.converted_client_id}`);
  }
  revalidatePath("/dashboard");

  return { success: true, nextFollowupId: newFollowupId };
}

/**
 * Complete a follow-up with optional completion notes (legacy wrapper)
 */
export async function completeFollowupAction(
  followupId: string,
  completionNotes?: string
): Promise<FollowupActionState> {
  return completeAndScheduleFollowupAction({
    followupId,
    outcome: "Completed",
    discussionNotes: completionNotes,
    scheduleNext: false,
  });
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
    .eq("converted_client_id", clientId)
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

/**
 * Lightweight action to fetch only pending followups for clients next-action enrichment
 * Avoids full profile joins, historical notes, completed items, and completers lookup.
 */
export async function fetchPendingClientFollowupsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select("converted_client_id, title, follow_up_type, due_date")
    .eq("status", "Pending")
    .order("due_date", { ascending: true });

  if (error || !data) {
    return {};
  }

  // Map first upcoming followup by converted_client_id
  const nextByClient: Record<string, { title: string; dueDate: string }> = {};
  for (const f of data) {
    if (f.converted_client_id && !nextByClient[f.converted_client_id]) {
      nextByClient[f.converted_client_id] = {
        title: f.title || f.follow_up_type || "Follow-up required",
        dueDate: f.due_date,
      };
    }
  }

  return nextByClient;
}

/**
 * Highly optimized lightweight action to fetch only pending followups count
 * for dashboard/clients header stats without fetching all rows.
 */
export async function fetchPendingFollowupsCountAction(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending")
      .neq("last_follow_up", "Imported");

    if (error) {
      console.error("Error fetching pending followups count:", error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error("Exception in fetchPendingFollowupsCountAction:", err);
    return 0;
  }
}
