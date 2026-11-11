"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FollowupActionState {
  error?: string | null;
  success?: boolean;
}

export interface UpdateFollowupPayload {
  id: string;
  client_id?: string;
  assigned_to?: string;
  title: string;
  follow_up_type: string;
  due_date: string;
  priority: string;
  status: string;
  notes?: string | null;
}

export async function fetchFollowupsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      *,
      client:clients!client_id (id, company_name, client_code, contact_person),
      assigned_profile:profiles!assigned_to (id, full_name, email)
    `)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching follow-ups:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    clientId: f.client?.id,
    companyName: f.client?.company_name || "Unknown Company",
    clientCode: f.client?.client_code || "B360-1000",
    contactPerson: f.client?.contact_person || "-",
    assignedToName: f.assigned_profile?.full_name || "Assigned Staff",
    assignedToId: f.assigned_to,
    title: f.title,
    followUpType: f.follow_up_type || "General",
    type: f.follow_up_type || "General",
    dueDate: f.due_date,
    priority: f.priority || "Medium",
    status: f.status || "Pending",
    notes: f.notes,
    description: f.notes,
  }));
}

export async function createFollowupAction(
  prevState: FollowupActionState | null,
  formData: FormData
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const clientId = formData.get("client_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const followUpType = (formData.get("follow_up_type") as string) || "General";
  const dueDate = formData.get("due_date") as string;
  const priority = (formData.get("priority") as string) || "Medium";
  const status = (formData.get("status") as string) || "Pending";
  const notes = (formData.get("notes") as string) || null;
  const assignedTo = (formData.get("assigned_to") as string) || user.id;

  if (!clientId || !title || !dueDate) {
    return { error: "Client, title, and due date are required." };
  }

  const { error } = await supabase
    .from("follow_ups")
    .insert({
      client_id: clientId,
      title,
      follow_up_type: followUpType,
      due_date: dueDate,
      priority,
      status,
      assigned_to: assignedTo,
      notes,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Edit an existing follow-up record
 */
export async function updateFollowupAction(
  prevState: FollowupActionState | null,
  formData: FormData
): Promise<FollowupActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required to update follow-up." };

  const id = formData.get("id") as string;
  const clientId = formData.get("client_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const followUpType = (formData.get("follow_up_type") as string) || "General";
  const dueDate = formData.get("due_date") as string;
  const priority = (formData.get("priority") as string) || "Medium";
  const status = (formData.get("status") as string) || "Pending";
  const notes = (formData.get("notes") as string) || null;
  const assignedTo = (formData.get("assigned_to") as string) || user.id;

  if (!id) {
    return { error: "Follow-up ID is required." };
  }
  if (!clientId || !title || !dueDate) {
    return { error: "Client, title, and due date are required." };
  }

  // Update existing record
  const { error } = await supabase
    .from("follow_ups")
    .update({
      client_id: clientId,
      title,
      follow_up_type: followUpType,
      due_date: dueDate,
      priority,
      status,
      assigned_to: assignedTo,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

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

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteFollowupAction(followupId: string, clientId?: string): Promise<FollowupActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

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
  return (data || []).map((f: any) => ({
    ...f,
    type: f.follow_up_type,
    description: f.notes,
    assignedToName: f.assigned_profile?.full_name || "Assigned Staff",
    assignedToId: f.assigned_to,
  }));
}

