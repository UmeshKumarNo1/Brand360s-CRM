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
 * Archives a client (Admin or assigned owner)
 */
export async function archiveClientAction(clientId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, client_code, client_status")
    .eq("id", clientId)
    .single();

  const { error } = await supabase
    .from("clients")
    .update({
      client_status: "Archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorId: user.id,
    action: "ARCHIVE",
    entityType: "client",
    entityId: clientId,
    entityName: client?.company_name,
    details: {
      previous_status: client?.client_status,
      new_status: "Archived",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

