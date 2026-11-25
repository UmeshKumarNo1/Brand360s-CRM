"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit/audit-logger";

export interface EmployeeActionState {
  error?: string | null;
  success?: boolean;
  unassignedServicesCount?: number;
}

// Dedicated server-only helper to get the Supabase Auth Admin client
function getAdminAuthClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (serviceKey && !serviceKey.includes("your-service-role-key") && !serviceKey.includes("placeholder")) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return null;
}

export async function fetchEmployeesAction() {
  if (!isSupabaseConfigured()) {
    return [
      { id: "00000000-0000-0000-0000-000000000001", full_name: "Admin User", email: "admin@brand360s.com", role: "admin", is_active: true, created_at: new Date().toISOString(), assigned_clients_count: 5 },
      { id: "00000000-0000-0000-0000-000000000002", full_name: "Employee1", email: "sales1@brand360s.com", role: "employee", is_active: true, created_at: new Date().toISOString(), assigned_clients_count: 3 },
      { id: "00000000-0000-0000-0000-000000000003", full_name: "Employee2", email: "sales2@brand360s.com", role: "employee", is_active: true, created_at: new Date().toISOString(), assigned_clients_count: 2 },
    ];
  }

  const supabase = await createClient();

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return [];
  }

  // Fetch all profiles along with their assigned client counts
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      is_active,
      phone,
      created_at,
      clients:clients!assigned_salesperson(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employees:", error);
    return [];
  }

  return (profiles || []).map((p: any) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    isActive: p.is_active,
    phone: p.phone || "-",
    createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "-",
    clientsCount: p.clients?.[0]?.count || 0,
  }));
}

export async function createEmployeeAction(
  prevState: EmployeeActionState | null,
  formData: FormData
): Promise<EmployeeActionState> {
  const supabase = await createClient();

  // 1. Verify that current user is an authenticated Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin" || !currentProfile.is_active) {
    return { error: "Only active administrators can onboard new employees." };
  }

  const full_name = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const role = (formData.get("role") as string) || "employee";
  const password = formData.get("password") as string;

  if (!full_name || !email || !password) {
    return { error: "Please provide employee full name, work email, and a temporary password." };
  }

  if (password.length < 6) {
    return { error: "Temporary password must be at least 6 characters." };
  }

  const adminAuth = getAdminAuthClient();

  // If SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local, inform the Admin with clear instructions
  if (!adminAuth) {
    return { 
      error: "SUPABASE_SERVICE_ROLE_KEY is missing in server environment (.env.local). Please paste your Supabase Project Settings -> API -> service_role key into .env.local to enable server-side auth user creation." 
    };
  }

  // 2. Check if email already exists in profiles or auth.users (Account Reconciliation)
  const { data: existingProfile } = await (adminAuth as any)
    .from("profiles")
    .select("id, email, is_active, full_name, role")
    .eq("email", email)
    .maybeSingle();

  // Also check if user exists in Supabase Auth
  const { data: userListData } = await adminAuth.auth.admin.listUsers();
  const existingAuthUser = (userListData?.users || []).find(
    (u: any) => u.email?.toLowerCase() === email
  );

  // If user already exists in both Auth and Profiles
  if (existingProfile && existingAuthUser) {
    if (!existingProfile.is_active) {
      return {
        error: "An employee account with this email already exists but is currently deactivated. Please reactivate it from the employee directory instead of creating a duplicate.",
      };
    }
    return { error: "An active employee account with this email address already exists." };
  }

  // Reconciliation Case 1: Auth user exists, but Profile is missing
  if (existingAuthUser && !existingProfile) {
    // Update Auth user metadata
    await adminAuth.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      user_metadata: {
        full_name,
        name: full_name,
        role: role === "admin" ? "admin" : "employee",
        phone,
      },
    });

    // Recreate profile matching the exact Auth UID
    const { error: profileRecreateError } = await adminAuth
      .from("profiles")
      .upsert({
        id: existingAuthUser.id,
        email,
        full_name,
        role: role === "admin" ? "admin" : "employee",
        is_active: true,
        phone,
        updated_at: new Date().toISOString(),
      });

    if (profileRecreateError) {
      return { error: `Failed to restore missing profile for existing user: ${profileRecreateError.message}` };
    }

    revalidatePath("/employees");
    return { success: true };
  }

  // Reconciliation Case 2: Profile exists, but Auth user is missing
  if (existingProfile && !existingAuthUser) {
    // Recreate Auth user with the profile ID
    const { data: createdAuthUser, error: authRecreateError } = await adminAuth.auth.admin.createUser({
      id: existingProfile.id,
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        name: full_name,
        role: role === "admin" ? "admin" : "employee",
        phone,
      },
    });

    if (authRecreateError) {
      return { error: `Failed to recreate Auth account for profile: ${authRecreateError.message}` };
    }

    await adminAuth
      .from("profiles")
      .update({
        full_name,
        phone,
        role: role === "admin" ? "admin" : "employee",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfile.id);

    revalidatePath("/employees");
    return { success: true };
  }

  // 3. Normal Creation: Create user in Supabase Auth via admin API (generates the official UUID)
  const { data: newAuthUser, error: authError } = await adminAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      full_name,
      name: full_name,
      role: role === "admin" ? "admin" : "employee",
      phone,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  const newUserId = newAuthUser.user?.id;
  if (!newUserId) {
    return { error: "Supabase Auth did not return a valid user UUID." };
  }

  // 4. Insert or update the public.profiles record with the exact Auth user UUID
  const { error: profileError } = await adminAuth
    .from("profiles")
    .upsert({
      id: newUserId,
      email,
      full_name,
      role: role === "admin" ? "admin" : "employee",
      is_active: true,
      phone,
      updated_at: new Date().toISOString(),
    });

  // 5. Safe Rollback: If profile creation fails, delete the orphaned auth user
  if (profileError) {
    console.error("Profile creation failed, rolling back auth user:", profileError);
    await adminAuth.auth.admin.deleteUser(newUserId);
    return { error: `Database profile error: ${profileError.message}` };
  }

  revalidatePath("/employees");
  return { success: true };
}

export async function toggleEmployeeStatusAction(
  employeeId: string,
  newStatus: boolean
): Promise<EmployeeActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Unauthorized." };
  }

  // Prevent self-deactivation
  if (user.id === employeeId && newStatus === false) {
    return { error: "You cannot deactivate your own administrator account." };
  }

  const adminAuth = getAdminAuthClient();
  const dbClient = adminAuth || supabase;

  const { error } = await dbClient
    .from("profiles")
    .update({ is_active: newStatus, updated_at: new Date().toISOString() })
    .eq("id", employeeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/employees");
  return { success: true };
}

export async function updateEmployeeProfileAction(
  prevState: EmployeeActionState | null,
  formData: FormData
): Promise<EmployeeActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Unauthorized." };
  }

  const employeeId = (formData.get("employee_id") as string)?.trim();
  const full_name = (formData.get("full_name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const role = (formData.get("role") as string) || "employee";
  const is_active = formData.get("is_active") === "true";

  if (!employeeId || !full_name) {
    return { error: "Employee name is required." };
  }

  const adminAuth = getAdminAuthClient();
  if (!adminAuth) {
    return {
      error: "SUPABASE_SERVICE_ROLE_KEY is required to synchronize employee names with Supabase Authentication. Please check server configuration.",
    };
  }

  // 1. Validate employee Auth UID existence in Supabase Auth before updating
  const { data: authUserData, error: getUserError } = await adminAuth.auth.admin.getUserById(employeeId);
  if (getUserError || !authUserData?.user) {
    return {
      error: `Auth account with UID ${employeeId} was not found in Supabase Authentication.`,
    };
  }

  // 2. Fetch existing profile for rollback safety
  const { data: existingProfile, error: fetchProfileError } = await adminAuth
    .from("profiles")
    .select("full_name, phone, role, is_active")
    .eq("id", employeeId)
    .single();

  if (fetchProfileError || !existingProfile) {
    return { error: "Employee profile not found in CRM database." };
  }

  // 3. Update public.profiles table
  const { error: profileUpdateError } = await adminAuth
    .from("profiles")
    .update({
      full_name,
      phone,
      role: role as any,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (profileUpdateError) {
    return { error: `Database profile update failed: ${profileUpdateError.message}` };
  }

  // 4. Synchronize user_metadata in Supabase Auth (set user_metadata.full_name and user_metadata.name)
  const existingMetadata = authUserData.user.user_metadata || {};
  const { error: authUpdateError } = await adminAuth.auth.admin.updateUserById(employeeId, {
    user_metadata: {
      ...existingMetadata,
      full_name,
      name: full_name,
      role: role === "admin" ? "admin" : "employee",
      phone,
    },
  });

  // 5. Strict consistency check: Do not report success if Auth metadata synchronization failed
  if (authUpdateError) {
    console.error("Auth metadata synchronization failed, rolling back CRM profile:", authUpdateError);
    // Roll back CRM profile to previous values to maintain 100% consistency
    await adminAuth
      .from("profiles")
      .update({
        full_name: existingProfile.full_name,
        phone: existingProfile.phone,
        role: existingProfile.role,
        is_active: existingProfile.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId);

    return {
      error: `Failed to synchronize updated name to Supabase Authentication: ${authUpdateError.message}. Profile update was rolled back.`,
    };
  }

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  return { success: true };
}

export async function fetchEmployeeDetailsAction(employeeId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (!profile) return null;

  const [clientsRes, servicesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("assigned_salesperson", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_services")
      .select(`
        id,
        service_name,
        service_category,
        total_amount,
        service_fee,
        govt_fee,
        service_status,
        start_date,
        expected_completion_date,
        target_delivery_date,
        current_stage_name,
        progress_percentage,
        fulfillment_stages,
        created_at,
        client:clients!client_id (
          id,
          company_name,
          client_code,
          assigned_salesperson,
          salesperson:profiles!assigned_salesperson(full_name)
        )
      `)
      .eq("assigned_employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  const clientList = clientsRes.data || [];
  const assignedServicesList = (servicesRes.data || []).map((s: any) => ({
    id: s.id,
    service_name: s.service_name,
    service_category: s.service_category,
    total_amount: Number(s.total_amount) || 0,
    service_status: s.service_status || "Pending",
    start_date: s.start_date,
    target_delivery_date: s.target_delivery_date || s.expected_completion_date,
    current_stage_name: s.current_stage_name,
    progress_percentage: s.progress_percentage || 0,
    fulfillment_stages: s.fulfillment_stages,
    client_id: s.client?.id,
    company_name: s.client?.company_name || "Unknown Client",
    client_code: s.client?.client_code,
    client_salesperson: s.client?.salesperson?.full_name || "Unassigned",
  }));

  const totalClients = clientList.length;
  const activeClients = clientList.filter((c) => c.client_status === "Active").length;
  const completedClients = clientList.filter((c) => c.payment_status === "Paid in full").length;

  return {
    profile,
    clients: clientList,
    assignedServices: assignedServicesList,
    stats: {
      totalClients,
      activeClients,
      completedClients,
      totalAssignedServices: assignedServicesList.length,
      activeAssignedServices: assignedServicesList.filter((s) => s.service_status !== "Completed").length,
    },
  };
}

export interface DeleteEmployeeCheckResult {
  canDelete: boolean;
  reason?: string;
  assignedServicesCount: number;
  assignedClientsCount: number;
  assignedFollowupsCount: number;
  assignedServices: {
    id: string;
    clientId: string;
    serviceName: string;
    clientName?: string;
  }[];
}

/**
 * Checks dependencies before deleting an employee:
 * - Counts assigned client services (which will be automatically unassigned)
 * - Checks if salesperson for any clients or has pending followups
 */
export async function checkEmployeeDependenciesAction(
  employeeId: string
): Promise<DeleteEmployeeCheckResult> {
  const supabase = await createClient();

  const [clientsRes, followupsRes, servicesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("assigned_salesperson", employeeId),
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", employeeId)
      .eq("status", "Pending"),
    supabase
      .from("client_services")
      .select(`
        id,
        client_id,
        service_name,
        client:clients!client_id (company_name)
      `)
      .eq("assigned_employee_id", employeeId),
  ]);

  const assignedClientsCount = clientsRes.count || 0;
  const assignedFollowupsCount = followupsRes.count || 0;
  const serviceList = (servicesRes.data || []).map((s: any) => ({
    id: s.id,
    clientId: s.client_id,
    serviceName: s.service_name,
    clientName: s.client?.company_name || "Unknown Client",
  }));
  const assignedServicesCount = serviceList.length;

  if (assignedClientsCount > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete employee: they are assigned to ${assignedClientsCount} client(s) as salesperson. Please reassign those clients first.`,
      assignedServicesCount,
      assignedClientsCount,
      assignedFollowupsCount,
      assignedServices: serviceList,
    };
  }

  if (assignedFollowupsCount > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete employee: they have ${assignedFollowupsCount} pending follow-up(s). Please reassign them first.`,
      assignedServicesCount,
      assignedClientsCount,
      assignedFollowupsCount,
      assignedServices: serviceList,
    };
  }

  return {
    canDelete: true,
    assignedServicesCount,
    assignedClientsCount,
    assignedFollowupsCount,
    assignedServices: serviceList,
  };
}

/**
 * Deletes an employee permanently (Admin only).
 * Automatically unassigns all assigned client services (sets assigned_employee_id to NULL),
 * preserves all service details, workflows, invoices, payments, audit history,
 * and logs an audit record.
 */
export async function deleteEmployeeAction(employeeId: string): Promise<EmployeeActionState> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { error: "Admin authorization required to delete employees." };
  }

  if (employeeId === user.id) {
    return { error: "You cannot delete your own admin account." };
  }

  // 1. Fetch employee profile for audit and confirmation
  const { data: targetEmployee } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", employeeId)
    .single();

  if (!targetEmployee) {
    return { error: "Employee record not found." };
  }

  // 2. Check if employee has assigned clients
  const { count: assignedCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("assigned_salesperson", employeeId);

  if (assignedCount && assignedCount > 0) {
    return {
      error: `Cannot delete employee: they are assigned to ${assignedCount} client(s) as salesperson. Please reassign those clients or deactivate the employee account instead.`,
    };
  }

  // 3. Check if employee has assigned pending follow-ups
  const { count: followupsCount } = await supabase
    .from("follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", employeeId)
    .eq("status", "Pending");

  if (followupsCount && followupsCount > 0) {
    return {
      error: `Cannot delete employee: they have ${followupsCount} pending follow-up(s). Please reassign them or deactivate the employee account instead.`,
    };
  }

  // 4. Identify all client services assigned to this employee
  const { data: assignedServices } = await supabase
    .from("client_services")
    .select("id, client_id, service_name")
    .eq("assigned_employee_id", employeeId);

  const unassignedCount = (assignedServices || []).length;

  // 5. Unassign all client services (set assigned_employee_id = NULL)
  // Preserves workflow stages, progress, payments, invoices, documents, target dates and audit history
  if (unassignedCount > 0) {
    const { error: unassignError } = await supabase
      .from("client_services")
      .update({
        assigned_employee_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("assigned_employee_id", employeeId);

    if (unassignError) {
      console.error("Error unassigning client services:", unassignError);
      return { error: `Failed to unassign client services: ${unassignError.message}` };
    }
  }

  const adminAuth = getAdminAuthClient();
  const dbClient = adminAuth || supabase;

  // 6. Delete from profiles
  const { error: profileDeleteError } = await dbClient
    .from("profiles")
    .delete()
    .eq("id", employeeId);

  if (profileDeleteError) {
    console.error("Error deleting profile:", profileDeleteError);
    return { error: profileDeleteError.message };
  }

  // 7. If service role available, delete from auth.users as well
  if (adminAuth) {
    try {
      await adminAuth.auth.admin.deleteUser(employeeId);
    } catch (e) {
      console.error("Failed to delete auth user:", e);
    }
  }

  // 8. Permanent audit record
  await recordAuditLog({
    actorId: user.id,
    action: "DELETE",
    entityType: "employee",
    entityId: employeeId,
    entityName: targetEmployee.full_name || targetEmployee.email,
    details: {
      email: targetEmployee.email,
      role: targetEmployee.role,
      unassigned_services_count: unassignedCount,
      unassigned_services: assignedServices || [],
    },
  });

  // Revalidate relevant pages
  revalidatePath("/employees");
  revalidatePath("/clients");
  revalidatePath("/services");
  (assignedServices || []).forEach((s) => {
    if (s.client_id) {
      revalidatePath(`/clients/${s.client_id}`);
    }
  });

  return { success: true, unassignedServicesCount: unassignedCount };
}
