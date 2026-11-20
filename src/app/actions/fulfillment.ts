"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";
import { computeServiceFulfillment, FulfillmentStage } from "@/lib/services/fulfillment-workflows";

export interface StageHistoryRecord {
  id: string;
  client_id: string;
  client_service_id: string;
  previous_stage: string | null;
  new_stage: string;
  action_type: "ADVANCE" | "REVERT" | "NOTE" | "COMPLETE";
  notes: string | null;
  progress_percentage: number;
  updated_by: string | null;
  created_at: string;
  updater_name?: string;
}

export interface StageManagementData {
  serviceId: string;
  clientId: string;
  serviceName: string;
  clientName: string;
  serviceCategory: string;
  serviceStatus: string;
  assignedEmployeeName: string;
  currentStageName: string;
  currentStageDescription: string;
  progressPercentage: number;
  stages: FulfillmentStage[];
  history: StageHistoryRecord[];
  canManage: boolean;
  isAdmin: boolean;
}

export interface StageUpdateResponse {
  success: boolean;
  error?: string | null;
  service?: any;
}

/**
 * Fetch complete stage management details and history for a client service
 */
export async function fetchServiceStageDetailsAction(serviceId: string): Promise<StageManagementData | null> {
  if (!serviceId) return null;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // 2. Fetch service with client
  const { data: service, error: svcError } = await supabase
    .from("client_services")
    .select(`
      *,
      assigned_profile:profiles!assigned_employee_id (full_name),
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", serviceId)
    .single();

  if (svcError || !service) {
    console.error("Error fetching service for stage management:", svcError);
    return null;
  }

  const client = Array.isArray(service.client) ? service.client[0] : service.client;
  const isAssigned = service.assigned_employee_id === user.id;
  const isSalesperson = client?.assigned_salesperson === user.id || client?.created_by === user.id;
  const canManage = Boolean(isAdmin || isAssigned || isSalesperson);

  // Compute fulfillment data
  const fulfillment = computeServiceFulfillment(service);

  // 3. Fetch stage history
  let history: StageHistoryRecord[] = [];
  try {
    const { data: historyData, error: histError } = await supabase
      .from("service_stage_history")
      .select(`
        id,
        client_id,
        client_service_id,
        previous_stage,
        new_stage,
        action_type,
        notes,
        progress_percentage,
        updated_by,
        created_at,
        updater:profiles!updated_by (full_name)
      `)
      .eq("client_service_id", serviceId)
      .order("created_at", { ascending: false });

    if (!histError && historyData) {
      history = historyData.map((h: any) => ({
        id: h.id,
        client_id: h.client_id,
        client_service_id: h.client_service_id,
        previous_stage: h.previous_stage,
        new_stage: h.new_stage,
        action_type: h.action_type,
        notes: h.notes,
        progress_percentage: h.progress_percentage,
        updated_by: h.updated_by,
        created_at: h.created_at,
        updater_name: h.updater?.full_name || "System / Admin",
      }));
    }
  } catch (err) {
    console.warn("Could not query service_stage_history:", err);
  }

  return {
    serviceId: service.id,
    clientId: service.client_id,
    serviceName: service.service_name,
    clientName: client?.company_name || "Client",
    serviceCategory: service.service_category || "General",
    serviceStatus: service.service_status || "Pending",
    assignedEmployeeName: service.assigned_profile?.full_name || "Unassigned",
    currentStageName: fulfillment.currentStageName,
    currentStageDescription: fulfillment.currentStageDescription,
    progressPercentage: fulfillment.progressPercentage,
    stages: fulfillment.stages,
    history,
    canManage,
    isAdmin: Boolean(isAdmin),
  };
}

/**
 * Advance, revert, complete, or add note to service fulfillment stage
 */
export async function updateServiceFulfillmentStageAction(params: {
  serviceId: string;
  action: "ADVANCE" | "REVERT" | "COMPLETE" | "NOTE" | "SET_STAGE";
  targetStageIndex?: number;
  notes?: string;
}): Promise<StageUpdateResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required to update fulfillment stage." };

  if (!params.serviceId) {
    return { success: false, error: "Service ID is required." };
  }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // 2. Fetch service & verify RBAC
  const { data: service, error: svcErr } = await supabase
    .from("client_services")
    .select(`
      *,
      client:clients!client_id (
        id,
        company_name,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", params.serviceId)
    .single();

  if (svcErr || !service) {
    return { success: false, error: "Service record not found." };
  }

  const client = Array.isArray(service.client) ? service.client[0] : service.client;
  const isAssigned = service.assigned_employee_id === user.id;
  const isSalesperson = client?.assigned_salesperson === user.id || client?.created_by === user.id;

  if (!isAdmin && !isAssigned && !isSalesperson) {
    return {
      success: false,
      error: "Permission denied. Only authorized assigned employees or administrators can update service fulfillment.",
    };
  }

  // Non-admins cannot revert stages backwards
  if (params.action === "REVERT" && !isAdmin) {
    return {
      success: false,
      error: "Only administrators can revert or correct previous fulfillment stages.",
    };
  }

  // 3. Compute current stage progression
  const currentFulfillment = computeServiceFulfillment(service);
  const stages: FulfillmentStage[] = currentFulfillment.stages.map((s) => ({ ...s }));
  const totalStages = stages.length;

  const currentIdx = stages.findIndex((s) => s.status === "current");
  const previousStageName = currentFulfillment.currentStageName;
  let newStageName = previousStageName;
  let newServiceStatus = service.service_status || "Pending";
  let newStageDescription = currentFulfillment.currentStageDescription;

  if (params.action === "ADVANCE") {
    if (currentIdx === -1 || currentIdx >= totalStages - 1) {
      // Already on final stage, mark complete
      stages.forEach((s) => (s.status = "completed"));
      newStageName = "Completed";
      newServiceStatus = "Completed";
      newStageDescription = "Service deliverable completed";
    } else {
      // Mark current stage completed and next stage current
      stages[currentIdx].status = "completed";
      const nextIdx = currentIdx + 1;
      stages[nextIdx].status = "current";
      for (let i = nextIdx + 1; i < totalStages; i++) {
        stages[i].status = "upcoming";
      }

      newStageName = stages[nextIdx].name;
      newServiceStatus = nextIdx === totalStages - 1 ? "Completed" : "In Progress";
      newStageDescription = nextIdx === totalStages - 1 ? "Final stage completed" : "Work in progress";
    }
  } else if (params.action === "COMPLETE") {
    // Mark all stages as completed
    stages.forEach((s) => (s.status = "completed"));
    newStageName = "Completed";
    newServiceStatus = "Completed";
    newStageDescription = "Deliverable completed & approved";
  } else if (params.action === "SET_STAGE") {
    const targetIdx = params.targetStageIndex !== undefined ? params.targetStageIndex : currentIdx;
    if (targetIdx >= 0 && targetIdx < totalStages) {
      const isMovingBackwards = targetIdx < currentIdx;
      if (isMovingBackwards && !isAdmin) {
        return {
          success: false,
          error: "Only administrators can revert or move back to a previous fulfillment stage.",
        };
      }

      // Preserve completion states of stages that were legitimately completed,
      // and do not automatically mark skipped intermediate stages as completed
      for (let i = 0; i < totalStages; i++) {
        if (i === targetIdx) {
          stages[i].status = "current";
        } else if (i < targetIdx) {
          // If moving forward, keep previously completed stages completed, or mark prior stages if not skipped
          if (stages[i].status !== "completed") {
            // Only stages prior to target keep their state or mark completed up to current
            if (i < currentIdx) {
              stages[i].status = "completed";
            }
          }
        } else {
          // Upcoming stages beyond target
          stages[i].status = "upcoming";
        }
      }

      newStageName = stages[targetIdx]?.name || "Onboarding";
      newServiceStatus = targetIdx === totalStages - 1 ? "Completed" : targetIdx === 0 ? "Pending" : "In Progress";
      newStageDescription = `Stage updated to ${newStageName}`;
    }
  } else if (params.action === "REVERT") {
    // Admin correction: target stage index specified or move back 1 stage
    const targetIdx =
      params.targetStageIndex !== undefined
        ? params.targetStageIndex
        : Math.max(0, currentIdx > 0 ? currentIdx - 1 : 0);

    for (let i = 0; i < totalStages; i++) {
      if (i < targetIdx) {
        stages[i].status = "completed";
      } else if (i === targetIdx) {
        stages[i].status = "current";
      } else {
        stages[i].status = "upcoming";
      }
    }

    newStageName = stages[targetIdx]?.name || "Onboarding";
    newServiceStatus = targetIdx === 0 ? "Pending" : "In Progress";
    newStageDescription = `Reverted to ${newStageName} by admin`;
  } else if (params.action === "NOTE") {
    // Only note added without changing stage
    newStageDescription = params.notes?.trim() || currentFulfillment.currentStageDescription;
  }

  // Recalculate progress percentage
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const isFinalComplete = completedCount === totalStages || newServiceStatus === "Completed";
  const progressPercentage = isFinalComplete
    ? 100
    : Math.min(99, Math.round((completedCount / totalStages) * 100));

  // 4. Update client_services persistent columns
  const updatePayload: any = {
    fulfillment_stages: stages,
    current_stage_name: isFinalComplete ? "Completed" : newStageName,
    current_stage_description: newStageDescription,
    progress_percentage: progressPercentage,
    service_status: newServiceStatus,
    updated_at: new Date().toISOString(),
  };

  if (isFinalComplete && !service.actual_completion_date) {
    updatePayload.actual_completion_date = new Date().toISOString().split("T")[0];
  } else if (!isFinalComplete && service.actual_completion_date && params.action === "REVERT") {
    updatePayload.actual_completion_date = null;
  }

  const { data: updatedService, error: updateError } = await supabase
    .from("client_services")
    .update(updatePayload)
    .eq("id", params.serviceId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating client service fulfillment:", updateError);
    return { success: false, error: updateError.message || "Failed to update fulfillment stage." };
  }

  // 5. Insert stage history audit log entry
  try {
    await supabase.from("service_stage_history").insert({
      client_id: service.client_id,
      client_service_id: service.id,
      previous_stage: previousStageName,
      new_stage: isFinalComplete ? "Completed" : newStageName,
      action_type: params.action,
      notes: params.notes?.trim() || null,
      progress_percentage: progressPercentage,
      updated_by: user.id,
    });
  } catch (histErr) {
    console.warn("Could not record in service_stage_history table:", histErr);
  }

  // 6. Record CRM Audit Log
  await recordAuditLog({
    actorId: user.id,
    action: "UPDATE",
    entityType: "client_service",
    entityId: service.id,
    entityName: `${service.service_name} (${client?.company_name || "Client"})`,
    details: {
      action_type: params.action,
      previous_stage: previousStageName,
      new_stage: isFinalComplete ? "Completed" : newStageName,
      progress_percentage: progressPercentage,
      service_status: newServiceStatus,
      notes: params.notes || null,
    },
  });

  // 7. Touch client record
  await supabase
    .from("clients")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", service.client_id);

  // 8. Revalidate all dependent routes
  revalidatePath("/clients");
  revalidatePath(`/clients/${service.client_id}`);
  revalidatePath("/services");
  revalidatePath("/dashboard");

  return {
    success: true,
    service: updatedService,
  };
}

