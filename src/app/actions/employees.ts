"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface EmployeeActionState {
  error?: string | null;
  success?: boolean;
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

  // 2. Check if email already exists in profiles
  const { data: existingProfile } = await adminAuth
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .single();

  if (existingProfile) {
    return { error: "An account with this email address already exists." };
  }

  // 3. Create user in Supabase Auth via admin API (generates the official UUID)
  const { data: newAuthUser, error: authError } = await adminAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      full_name,
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

  const employeeId = formData.get("employee_id") as string;
  const full_name = formData.get("full_name") as string;
  const phone = (formData.get("phone") as string) || null;
  const role = (formData.get("role") as string) || "employee";
  const is_active = formData.get("is_active") === "true";

  if (!employeeId || !full_name) {
    return { error: "Employee name is required." };
  }

  const adminAuth = getAdminAuthClient();
  const dbClient = adminAuth || supabase;

  const { error } = await dbClient
    .from("profiles")
    .update({
      full_name,
      phone,
      role: role as any,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId);

  if (error) {
    return { error: error.message };
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

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("assigned_salesperson", employeeId)
    .order("created_at", { ascending: false });

  const clientList = clients || [];
  const totalClients = clientList.length;
  const activeClients = clientList.filter((c) => c.client_status === "Active").length;
  const completedClients = clientList.filter((c) => c.payment_status === "Paid in full").length;

  return {
    profile,
    clients: clientList,
    stats: {
      totalClients,
      activeClients,
      completedClients,
    },
  };
}
