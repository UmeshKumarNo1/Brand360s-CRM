"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdminSession, recordAuditLog } from "@/lib/audit/audit-logger";

export interface DeleteClientCheckResult {
  canDelete: boolean;
  reason?: string;
  invoicesCount: number;
  paymentsCount: number;
  installmentsCount: number;
  servicesCount: number;
  followupsCount: number;
}

/**
 * Checks whether a client is safe to delete or has financial dependencies
 */
export async function checkClientDependenciesAction(clientId: string): Promise<DeleteClientCheckResult> {
  const supabase = await createClient();

  const [invoicesRes, paymentsRes, installmentsRes, servicesRes, followupsRes] = await Promise.all([
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("installment_schedules").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("client_services").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  const invoicesCount = invoicesRes.count || 0;
  const paymentsCount = paymentsRes.count || 0;
  const installmentsCount = installmentsRes.count || 0;
  const servicesCount = servicesRes.count || 0;
  const followupsCount = followupsRes.count || 0;

  if (invoicesCount > 0 || paymentsCount > 0) {
    return {
      canDelete: false,
      reason: `Client has ${invoicesCount} invoice(s) and ${paymentsCount} payment record(s). Financial records cannot be permanently purged to preserve audit compliance. Please archive the client instead.`,
      invoicesCount,
      paymentsCount,
      installmentsCount,
      servicesCount,
      followupsCount,
    };
  }

  return {
    canDelete: true,
    invoicesCount,
    paymentsCount,
    installmentsCount,
    servicesCount,
    followupsCount,
  };
}

/**
 * Deletes a client permanently if no financial dependencies exist (Admin only)
 */
export async function deleteClientAction(clientId: string): Promise<{ success: boolean; error?: string }> {
  const { authorized, error: authError, user, profile } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, error: authError || "Only an authorized Admin can delete clients." };
  }

  const supabase = await createClient();

  // Fetch client details for audit
  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select("id, company_name, client_code")
    .eq("id", clientId)
    .single();

  if (fetchErr || !client) {
    return { success: false, error: "Client not found." };
  }

  // Check dependencies
  const check = await checkClientDependenciesAction(clientId);
  if (!check.canDelete) {
    return { success: false, error: check.reason };
  }

  // Perform deletion
  const { error: deleteError } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Record audit log
  await recordAuditLog({
    actorId: user?.id,
    action: "DELETE",
    entityType: "client",
    entityId: clientId,
    entityName: client.company_name,
    details: {
      client_code: client.client_code,
      deleted_by_name: profile?.full_name,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Archives a client (Admin only)
 */
export async function archiveClientAction(
  clientId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, error: authError || "Only an authorized Admin can archive clients." };
  }

  const supabase = await createClient();

  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select("company_name, client_code, client_status")
    .eq("id", clientId)
    .single();

  if (fetchErr || !client) {
    return { success: false, error: "Client not found." };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      client_status: "Archived",
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
      archive_reason: reason || "Archived by Admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorId: user?.id,
    action: "ARCHIVE",
    entityType: "client",
    entityId: clientId,
    entityName: client.company_name,
    details: {
      client_code: client.client_code,
      previous_status: client.client_status,
      new_status: "Archived",
      reason: reason || "Archived by Admin",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Restores an archived client back to Active status (Admin only)
 */
export async function restoreClientAction(clientId: string): Promise<{ success: boolean; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, error: authError || "Only an authorized Admin can restore archived clients." };
  }

  const supabase = await createClient();

  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select("company_name, client_code, client_status")
    .eq("id", clientId)
    .single();

  if (fetchErr || !client) {
    return { success: false, error: "Client not found." };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      client_status: "Active",
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorId: user?.id,
    action: "RESTORE",
    entityType: "client",
    entityId: clientId,
    entityName: client.company_name,
    details: {
      client_code: client.client_code,
      previous_status: "Archived",
      new_status: "Active",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Reassigns a client to another salesperson (Admin only)
 */
export async function reassignClientAction(
  clientId: string,
  newSalespersonId: string
): Promise<{ success: boolean; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, error: authError || "Only an authorized Admin can reassign clients." };
  }

  const supabase = await createClient();

  // Get current client details
  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select("company_name, client_code, assigned_salesperson")
    .eq("id", clientId)
    .single();

  if (fetchErr || !client) {
    return { success: false, error: "Client not found." };
  }

  // Get new salesperson name
  const { data: newSalesperson } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", newSalespersonId)
    .single();

  const { error } = await supabase
    .from("clients")
    .update({
      assigned_salesperson: newSalespersonId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorId: user?.id,
    action: "REASSIGN",
    entityType: "client",
    entityId: clientId,
    entityName: client.company_name,
    details: {
      client_code: client.client_code,
      previous_salesperson_id: client.assigned_salesperson,
      new_salesperson_id: newSalespersonId,
      new_salesperson_name: newSalesperson?.full_name || "Salesperson",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Bulk reassigns multiple clients to a salesperson (Admin only)
 */
export async function bulkReassignClientsAction(
  clientIds: string[],
  newSalespersonId: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, updatedCount: 0, error: authError || "Only an authorized Admin can perform bulk reassignment." };
  }

  if (!clientIds || clientIds.length === 0) {
    return { success: false, updatedCount: 0, error: "No clients selected." };
  }

  const supabase = await createClient();

  const { data: newSalesperson } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", newSalespersonId)
    .single();

  const { error } = await supabase
    .from("clients")
    .update({
      assigned_salesperson: newSalespersonId,
      updated_at: new Date().toISOString(),
    })
    .in("id", clientIds);

  if (error) {
    return { success: false, updatedCount: 0, error: error.message };
  }

  // Record audit log
  await recordAuditLog({
    actorId: user?.id,
    action: "REASSIGN",
    entityType: "client",
    entityId: "bulk",
    entityName: `Bulk Reassigned ${clientIds.length} Clients`,
    details: {
      client_ids: clientIds,
      new_salesperson_id: newSalespersonId,
      new_salesperson_name: newSalesperson?.full_name,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true, updatedCount: clientIds.length };
}

/**
 * Bulk archives multiple clients (Admin only)
 */
export async function bulkArchiveClientsAction(
  clientIds: string[],
  reason?: string
): Promise<{ success: boolean; archivedCount: number; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, archivedCount: 0, error: authError || "Only an authorized Admin can bulk archive clients." };
  }

  if (!clientIds || clientIds.length === 0) {
    return { success: false, archivedCount: 0, error: "No clients selected." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      client_status: "Archived",
      archived_at: new Date().toISOString(),
      archived_by: user?.id,
      archive_reason: reason || "Bulk archived by Admin",
      updated_at: new Date().toISOString(),
    })
    .in("id", clientIds);

  if (error) {
    return { success: false, archivedCount: 0, error: error.message };
  }

  await recordAuditLog({
    actorId: user?.id,
    action: "ARCHIVE",
    entityType: "client",
    entityId: "bulk",
    entityName: `Bulk Archived ${clientIds.length} Clients`,
    details: {
      client_ids: clientIds,
      reason: reason || "Bulk archived by Admin",
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true, archivedCount: clientIds.length };
}

/**
 * Bulk restores multiple archived clients back to Active (Admin only)
 */
export async function bulkRestoreClientsAction(
  clientIds: string[]
): Promise<{ success: boolean; restoredCount: number; error?: string }> {
  const { authorized, error: authError, user } = await verifyAdminSession();
  if (!authorized) {
    return { success: false, restoredCount: 0, error: authError || "Only an authorized Admin can bulk restore clients." };
  }

  if (!clientIds || clientIds.length === 0) {
    return { success: false, restoredCount: 0, error: "No clients selected." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      client_status: "Active",
      archived_at: null,
      archived_by: null,
      archive_reason: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", clientIds);

  if (error) {
    return { success: false, restoredCount: 0, error: error.message };
  }

  await recordAuditLog({
    actorId: user?.id,
    action: "RESTORE",
    entityType: "client",
    entityId: "bulk",
    entityName: `Bulk Restored ${clientIds.length} Clients`,
    details: {
      client_ids: clientIds,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true, restoredCount: clientIds.length };
}

/**
 * Fetches the audit / activity history for a specific client
 */
export async function fetchClientActivityHistoryAction(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      entity_name,
      details,
      created_at,
      actor:profiles!actor_id (full_name, email, role)
    `)
    .or(`entity_id.eq.${clientId},details->client_ids.cs.["${clientId}"]`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching client activity:", error);
    return [];
  }

  return (data || []).map((log: any) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityName: log.entity_name,
    details: log.details || {},
    createdAt: log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "-",
    actorName: log.actor?.full_name || "System Admin",
    actorEmail: log.actor?.email,
    actorRole: log.actor?.role,
  }));
}
