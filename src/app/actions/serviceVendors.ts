"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface VendorAssignmentActionState {
  error?: string | null;
  success?: boolean;
  assignment?: any;
}

/**
 * Fetch all vendor assignments for a specific client service,
 * including joined vendor contact and category information.
 */
export async function fetchServiceVendorsAction(clientServiceId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("service_vendors")
      .select(`
        id,
        client_service_id,
        vendor_id,
        agreed_cost,
        payment_status,
        notes,
        created_at,
        vendor:vendors!vendor_id (
          id,
          name,
          company,
          contact_person,
          phone,
          email,
          category,
          status
        )
      `)
      .eq("client_service_id", clientServiceId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching service vendors:", error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Failed to load vendor assignments." };
  }
}

/**
 * Assign a vendor to a client service.
 * Enforces role-based ownership: Admin has full access; Employee can only assign
 * if they are the assigned salesperson or creator of the client.
 * Also prevents duplicate assignment of the same vendor to the same service.
 */
export async function assignVendorToClientServiceAction(
  prevState: VendorAssignmentActionState | null,
  formData: FormData
): Promise<VendorAssignmentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required to assign vendors." };

  const clientServiceId = formData.get("client_service_id") as string;
  const vendorId = formData.get("vendor_id") as string;
  const agreedCostRaw = formData.get("agreed_cost") as string;
  const paymentStatus = (formData.get("payment_status") as string) || "Pending";
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!clientServiceId || !vendorId) {
    return { error: "Client service and vendor are required." };
  }

  const agreedCost = parseFloat(agreedCostRaw);
  if (isNaN(agreedCost) || agreedCost < 0) {
    return { error: "Please enter a valid non-negative agreed cost (₹)." };
  }

  // 1. Verify access permissions on client_service
  const { data: serviceRecord, error: srvErr } = await supabase
    .from("client_services")
    .select(`
      id,
      client_id,
      client:clients!client_id (
        id,
        assigned_salesperson,
        created_by
      )
    `)
    .eq("id", clientServiceId)
    .single();

  if (srvErr || !serviceRecord) {
    return { error: "Service record not found." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";
  const client = Array.isArray(serviceRecord.client) ? serviceRecord.client[0] : serviceRecord.client;
  const isAuthorized = isAdmin || (client && (client.assigned_salesperson === user.id || client.created_by === user.id));

  if (!isAuthorized) {
    return { error: "Unauthorized: You can only assign vendors to services of your assigned clients." };
  }

  // 2. Prevent duplicate vendor assignment for the same service
  const { data: existingAssignment } = await supabase
    .from("service_vendors")
    .select("id")
    .eq("client_service_id", clientServiceId)
    .eq("vendor_id", vendorId)
    .limit(1);

  if (existingAssignment && existingAssignment.length > 0) {
    return { error: "This vendor is already assigned to this service." };
  }

  // 3. Insert assignment
  const { data, error } = await supabase
    .from("service_vendors")
    .insert({
      client_service_id: clientServiceId,
      vendor_id: vendorId,
      agreed_cost: agreedCost,
      payment_status: paymentStatus,
      notes,
    })
    .select(`
      id,
      client_service_id,
      vendor_id,
      agreed_cost,
      payment_status,
      notes,
      created_at,
      vendor:vendors!vendor_id (
        id,
        name,
        company,
        contact_person,
        phone,
        email,
        category,
        status
      )
    `)
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/clients/${serviceRecord.client_id}`);
  revalidatePath("/vendors");
  return { success: true, assignment: data };
}

/**
 * Update an existing vendor assignment (agreed cost, payment status, notes)
 */
export async function updateVendorAssignmentAction(
  prevState: VendorAssignmentActionState | null,
  formData: FormData
): Promise<VendorAssignmentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const assignmentId = formData.get("assignment_id") as string;
  const agreedCostRaw = formData.get("agreed_cost") as string;
  const paymentStatus = (formData.get("payment_status") as string) || "Pending";
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!assignmentId) {
    return { error: "Assignment ID is required." };
  }

  const agreedCost = parseFloat(agreedCostRaw);
  if (isNaN(agreedCost) || agreedCost < 0) {
    return { error: "Please enter a valid non-negative agreed cost." };
  }

  // Authorization check
  const { data: existing, error: fetchErr } = await supabase
    .from("service_vendors")
    .select(`
      id,
      client_service:client_services!client_service_id (
        id,
        client_id,
        client:clients!client_id (
          id,
          assigned_salesperson,
          created_by
        )
      )
    `)
    .eq("id", assignmentId)
    .single();

  if (fetchErr || !existing) {
    return { error: "Assignment not found." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";
  const clientService: any = existing.client_service;
  const client = Array.isArray(clientService?.client) ? clientService.client[0] : clientService?.client;
  const isAuthorized = isAdmin || (client && (client.assigned_salesperson === user.id || client.created_by === user.id));

  if (!isAuthorized) {
    return { error: "Unauthorized: You can only edit assignments for your assigned clients." };
  }

  const { data, error } = await supabase
    .from("service_vendors")
    .update({
      agreed_cost: agreedCost,
      payment_status: paymentStatus,
      notes,
    })
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  if (clientService?.client_id) {
    revalidatePath(`/clients/${clientService.client_id}`);
  }
  revalidatePath("/vendors");
  return { success: true, assignment: data };
}

/**
 * Delete a vendor assignment from a service without deleting the vendor or service.
 */
export async function removeVendorAssignmentAction(assignmentId: string): Promise<VendorAssignmentActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: existing, error: fetchErr } = await supabase
    .from("service_vendors")
    .select(`
      id,
      client_service:client_services!client_service_id (
        id,
        client_id,
        client:clients!client_id (
          id,
          assigned_salesperson,
          created_by
        )
      )
    `)
    .eq("id", assignmentId)
    .single();

  if (fetchErr || !existing) {
    return { error: "Assignment not found." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "admin";
  const clientService: any = existing.client_service;
  const client = Array.isArray(clientService?.client) ? clientService.client[0] : clientService?.client;
  const isAuthorized = isAdmin || (client && (client.assigned_salesperson === user.id || client.created_by === user.id));

  if (!isAuthorized) {
    return { error: "Unauthorized: You cannot remove vendor assignments from this client." };
  }

  const { error } = await supabase
    .from("service_vendors")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return { error: error.message };
  }

  if (clientService?.client_id) {
    revalidatePath(`/clients/${clientService.client_id}`);
  }
  revalidatePath("/vendors");
  return { success: true };
}

