"use server";

import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit/audit-logger";
import { revalidatePath } from "next/cache";

export interface ContractAmendmentRecord {
  id: string;
  clientId: string;
  previousContractValue: number;
  additionalAmount: number;
  revisedContractValue: number;
  reason: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvalDate: string;
  createdAt: string;
}

export interface ContractAmendmentState {
  success?: boolean;
  error?: string | null;
  amendment?: ContractAmendmentRecord;
}

/**
 * Fetch all contract amendments for a client
 */
export async function fetchContractAmendmentsAction(
  clientId: string
): Promise<ContractAmendmentRecord[]> {
  try {
    const supabase = await createClient();

    // 1. Try querying public.contract_amendments
    const { data, error } = await supabase
      .from("contract_amendments")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((d: any) => ({
        id: d.id,
        clientId: d.client_id,
        previousContractValue: Number(d.previous_contract_value) || 0,
        additionalAmount: Number(d.additional_amount) || 0,
        revisedContractValue: Number(d.revised_contract_value) || 0,
        reason: d.reason,
        approvedBy: d.approved_by,
        approvedByName: d.approved_by_name || "Admin",
        approvalDate: d.approval_date || d.created_at,
        createdAt: d.created_at,
      }));
    }

    // 2. Fallback to audit_logs where action = 'UPDATE' and entity_type = 'client' with amendment details
    const { data: auditData } = await supabase
      .from("audit_logs")
      .select("*, actor:profiles!actor_id(full_name)")
      .eq("entity_id", clientId)
      .eq("entity_type", "client")
      .order("created_at", { ascending: false });

    const amendmentsFromAudit: ContractAmendmentRecord[] = [];
    (auditData || []).forEach((log: any) => {
      const details = log.details || {};
      if (details.type === "CONTRACT_AMENDMENT" || details.additionalAmount !== undefined) {
        amendmentsFromAudit.push({
          id: log.id,
          clientId,
          previousContractValue: Number(details.previousContractValue) || 0,
          additionalAmount: Number(details.additionalAmount) || 0,
          revisedContractValue: Number(details.revisedContractValue) || 0,
          reason: details.reason || "Approved contract scope increase",
          approvedBy: log.actor_id,
          approvedByName: log.actor?.full_name || "Admin",
          approvalDate: log.created_at,
          createdAt: log.created_at,
        });
      }
    });

    return amendmentsFromAudit;
  } catch (err: any) {
    console.warn("fetchContractAmendmentsAction error:", err);
    return [];
  }
}

/**
 * Record an approved contract scope increase / contract amendment
 */
export async function createContractAmendmentAction(params: {
  clientId: string;
  additionalAmount: number;
  reason: string;
}): Promise<ContractAmendmentState> {
  const { clientId, additionalAmount, reason } = params;

  if (!clientId || !additionalAmount || additionalAmount <= 0) {
    return { error: "Please enter a valid positive amendment amount." };
  }

  if (!reason || reason.trim().length < 5) {
    return { error: "Please provide a detailed justification for the contract amendment (at least 5 characters)." };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required to amend contract value." };
    }

    // Role check: Only admin can amend contract value
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { error: "Only an authorized Administrator can approve contract amendments." };
    }

    // Fetch existing client
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("id, company_name, contract_value, balance_receivable, payments_received")
      .eq("id", clientId)
      .single();

    if (cErr || !client) {
      return { error: "Client record not found." };
    }

    const previousContractValue = Number(client.contract_value) || 0;
    const revisedContractValue = previousContractValue + Number(additionalAmount);
    const revisedBalance = (Number(client.balance_receivable) || 0) + Number(additionalAmount);

    // 1. Update clients table
    const { error: updateErr } = await supabase
      .from("clients")
      .update({
        contract_value: revisedContractValue,
        balance_receivable: revisedBalance,
        next_payment_due_amount: revisedBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (updateErr) {
      return { error: updateErr.message || "Failed to update client contract value." };
    }

    // 2. Try inserting into contract_amendments table
    let amendmentRecord: any = null;
    const { data: inserted, error: tableErr } = await supabase
      .from("contract_amendments")
      .insert({
        client_id: clientId,
        previous_contract_value: previousContractValue,
        additional_amount: additionalAmount,
        revised_contract_value: revisedContractValue,
        reason: reason.trim(),
        approved_by: user.id,
        approved_by_name: profile.full_name || "Admin",
      })
      .select()
      .maybeSingle();

    if (!tableErr && inserted) {
      amendmentRecord = inserted;
    }

    // 3. Write permanent audit log
    await recordAuditLog({
      actorId: user.id,
      action: "UPDATE",
      entityType: "client",
      entityId: clientId,
      entityName: client.company_name,
      details: {
        type: "CONTRACT_AMENDMENT",
        previousContractValue,
        additionalAmount,
        revisedContractValue,
        reason: reason.trim(),
        approvedBy: profile.full_name || "Admin",
        approvedAt: new Date().toISOString(),
      },
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/edit`);
    revalidatePath("/clients");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return {
      success: true,
      amendment: {
        id: amendmentRecord?.id || "audit-" + Date.now(),
        clientId,
        previousContractValue,
        additionalAmount,
        revisedContractValue,
        reason: reason.trim(),
        approvedBy: user.id,
        approvedByName: profile.full_name || "Admin",
        approvalDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error("createContractAmendmentAction error:", err);
    return { error: err.message || "An unexpected error occurred while amending contract." };
  }
}

