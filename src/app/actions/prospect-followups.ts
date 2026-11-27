"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revalidatePath } from "next/cache";
import type { ProspectFollowup } from "@/data/mockProspects";

export async function fetchProspectFollowupsAction(): Promise<ProspectFollowup[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .neq("status", "Converted to Client")
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching prospect_follow_ups:", error);
    return [];
  }

  return (data || [])
    .filter((d: any) => !d.converted_client_id)
    .map((d: any) => ({
    id: d.id,
    companyName: d.company_name,
    contactPerson: d.contact_person,
    phone: d.phone || "",
    serviceInterested: d.service_interested || "Pvt. Ltd. Registration",
    title: d.title,
    followUpType: d.follow_up_type || "Phone Call",
    priority: d.priority || "Medium",
    status: d.status || "Due Today",
    dueDate: d.due_date,
    lastFollowup: d.last_follow_up || "Today",
    nextFollowup: d.due_date,
    assignedToName: d.assigned_name || "Assigned Staff",
    assignedStaffInitials: (d.assigned_name || "AS").slice(0, 2).toUpperCase(),
    assignedColor: "bg-blue-100 text-blue-700",
    notes: d.notes || "",
  }));
}

export async function createProspectFollowupAction(input: {
  companyName: string;
  contactPerson: string;
  phone?: string;
  serviceInterested: string;
  title: string;
  followUpType: string;
  priority: string;
  status: string;
  dueDate: string;
  dueTime?: string;
  assignedToId?: string;
  assignedToName?: string;
  notes?: string;
}): Promise<{ data?: ProspectFollowup; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      company_name: input.companyName.trim(),
      contact_person: input.contactPerson.trim(),
      phone: input.phone?.trim() || null,
      service_interested: input.serviceInterested || "Pvt. Ltd. Registration",
      title: input.title.trim(),
      follow_up_type: input.followUpType || "Phone Call",
      priority: input.priority || "Medium",
      status: input.status || "Due Today",
      due_date: input.dueDate,
      due_time: input.dueTime || null,
      last_follow_up: "Today",
      assigned_to: input.assignedToId || user.id,
      assigned_name: input.assignedToName || "Assigned Staff",
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Error creating prospect follow-up:", error);
    return { error: error?.message || "Failed to save prospect follow-up." };
  }

  revalidatePath("/follow-ups");
  return {
    data: {
      id: data.id,
      companyName: data.company_name,
      contactPerson: data.contact_person,
      phone: data.phone || "",
      serviceInterested: data.service_interested,
      title: data.title,
      followUpType: data.follow_up_type,
      priority: data.priority,
      status: data.status,
      dueDate: data.due_date,
      lastFollowup: data.last_follow_up || "Today",
      nextFollowup: data.due_date,
      assignedToName: data.assigned_name || "Assigned Staff",
      assignedStaffInitials: (data.assigned_name || "AS").slice(0, 2).toUpperCase(),
      assignedColor: "bg-blue-100 text-blue-700",
      notes: data.notes || "",
    },
  };
}

export async function updateProspectFollowupAction(
  id: string,
  input: Partial<{
    companyName: string;
    contactPerson: string;
    phone: string;
    serviceInterested: string;
    title: string;
    followUpType: string;
    priority: string;
    status: string;
    dueDate: string;
    dueTime: string;
    assignedToId: string;
    assignedToName: string;
    notes: string;
  }>
): Promise<{ success?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.companyName !== undefined) updatePayload.company_name = input.companyName.trim();
  if (input.contactPerson !== undefined) updatePayload.contact_person = input.contactPerson.trim();
  if (input.phone !== undefined) updatePayload.phone = input.phone.trim() || null;
  if (input.serviceInterested !== undefined) updatePayload.service_interested = input.serviceInterested;
  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.followUpType !== undefined) updatePayload.follow_up_type = input.followUpType;
  if (input.priority !== undefined) updatePayload.priority = input.priority;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.dueDate !== undefined) updatePayload.due_date = input.dueDate;
  if (input.dueTime !== undefined) updatePayload.due_time = input.dueTime || null;
  if (input.assignedToId !== undefined) updatePayload.assigned_to = input.assignedToId || null;
  if (input.assignedToName !== undefined) updatePayload.assigned_name = input.assignedToName;
  if (input.notes !== undefined) updatePayload.notes = input.notes.trim() || null;

  const { error } = await supabase
    .from("follow_ups")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    console.error("Error updating prospect follow-up:", error);
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  return { success: true };
}

export async function fetchProspectFollowupByIdAction(id: string) {
  if (!isSupabaseConfigured() || !id) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    companyName: data.company_name,
    contactPerson: data.contact_person,
    phone: data.phone || "",
    serviceInterested: data.service_interested || "",
    title: data.title || "",
    followUpType: data.follow_up_type || "Phone Call",
    priority: data.priority || "Medium",
    status: data.status || "Due Today",
    dueDate: data.due_date,
    assignedToId: data.assigned_to || "",
    assignedToName: data.assigned_name || "",
    notes: data.notes || "",
    convertedClientId: data.converted_client_id || null,
  };
}

export async function deleteProspectFollowupAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting prospect follow-up:", error);
    return { error: error.message };
  }

  revalidatePath("/follow-ups");
  return { success: true };
}
