"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";

export interface DiscountRequestItem {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  serviceName: string;
  serviceFee: number;
  govtFee: number;
  additionalFee: number;
  requestedPct: number;
  requestedAmount: number;
  approvedPct: number;
  discountReason: string;
  discountStatus: "Not Requested" | "Pending Approval" | "Approved" | "Rejected";
  requestedByName: string;
  requestedAt: string | null;
  approvalNotes: string | null;
}

export async function fetchDiscountRequestsAction(): Promise<DiscountRequestItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return [];

  const { data, error } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      service_name,
      service_fee,
      govt_fee,
      additional_fee,
      discount_requested_pct,
      discount_approved_pct,
      discount_reason,
      discount_status,
      discount_requested_at,
      discount_approval_notes,
      client:clients!client_id (id, company_name, client_code),
      requester:profiles!discount_requested_by (full_name)
    `)
    .neq("discount_status", "Not Requested")
    .order("discount_requested_at", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
    const serviceFee = Number(row.service_fee) || 0;
    const requestedPct = Number(row.discount_requested_pct) || 0;
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.company_name || "Unknown Client",
      clientCode: client?.client_code || "N/A",
      serviceName: row.service_name,
      serviceFee,
      govtFee: Number(row.govt_fee) || 0,
      additionalFee: Number(row.additional_fee) || 0,
      requestedPct,
      requestedAmount: Math.round(serviceFee * (requestedPct / 100) * 100) / 100,
      approvedPct: Number(row.discount_approved_pct) || 0,
      discountReason: row.discount_reason || "",
      discountStatus: row.discount_status || "Not Requested",
      requestedByName: requester?.full_name || "Sales Executive",
      requestedAt: row.discount_requested_at || null,
      approvalNotes: row.discount_approval_notes || null,
    };
  });
}

export async function approveDiscountRequestAction(
  serviceId: string,
  approvedPct: number,
  approvalNotes?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false || profile.role !== "admin") {
    return { error: "Only an active Admin/CEO can approve discount requests." };
  }

  const pct = Math.max(0, Math.min(100, Number(approvedPct) || 0));

  const { data: svc, error: fetchErr } = await supabase
    .from("client_services")
    .select("id, client_id, service_name, service_fee, govt_fee, additional_fee")
    .eq("id", serviceId)
    .single();

  if (fetchErr || !svc) {
    return { error: "Service record not found." };
  }

  const serviceFee = Number(svc.service_fee) || 0;
  const govtFee = Number(svc.govt_fee) || 0;
  const additionalFee = Number(svc.additional_fee) || 0;
  const discountAmount = Math.round(serviceFee * (pct / 100) * 100) / 100;
  const newTotal = Math.max(0, Math.round((serviceFee + govtFee + additionalFee - discountAmount) * 100) / 100);

  const { error: updateErr } = await supabase
    .from("client_services")
    .update({
      discount_approved_pct: pct,
      discount: discountAmount,
      total_amount: newTotal,
      discount_status: "Approved",
      discount_approved_by: user.id,
      discount_approved_at: new Date().toISOString(),
      discount_approval_notes: approvalNotes?.trim() || null,
    })
    .eq("id", serviceId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await recordAuditLog({
    actorId: user.id,
    action: "UPDATE",
    entityType: "client_service",
    entityId: serviceId,
    entityName: svc.service_name,
    details: {
      discount_status: "Approved",
      discount_approved_pct: pct,
      discount_amount: discountAmount,
      approval_notes: approvalNotes?.trim() || null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${svc.client_id}`);
  revalidatePath("/services");
  return { success: true };
}

export async function rejectDiscountRequestAction(
  serviceId: string,
  approvalNotes?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false || profile.role !== "admin") {
    return { error: "Only an active Admin/CEO can reject discount requests." };
  }

  const { data: svc } = await supabase
    .from("client_services")
    .select("id, client_id, service_name, service_fee, govt_fee, additional_fee")
    .eq("id", serviceId)
    .single();

  if (!svc) return { error: "Service record not found." };

  const restoredTotal =
    (Number(svc.service_fee) || 0) +
    (Number(svc.govt_fee) || 0) +
    (Number(svc.additional_fee) || 0);

  const { error: updateErr } = await supabase
    .from("client_services")
    .update({
      discount_approved_pct: 0,
      discount: 0,
      total_amount: restoredTotal,
      discount_status: "Rejected",
      discount_approved_by: user.id,
      discount_approved_at: new Date().toISOString(),
      discount_approval_notes: approvalNotes?.trim() || null,
    })
    .eq("id", serviceId);

  if (updateErr) return { error: updateErr.message };

  await recordAuditLog({
    actorId: user.id,
    action: "UPDATE",
    entityType: "client_service",
    entityId: serviceId,
    entityName: svc.service_name,
    details: {
      discount_status: "Rejected",
      approval_notes: approvalNotes?.trim() || null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${svc.client_id}`);
  revalidatePath("/services");
  return { success: true };
}

