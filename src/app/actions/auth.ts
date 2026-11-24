"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export interface AuthState {
  error?: string | null;
  success?: string | null;
}

export async function loginAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "/dashboard";

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isDemoCredential =
    normalizedEmail === "admin@brand360s.com" ||
    normalizedEmail.includes("admin") ||
    normalizedEmail.includes("sales") ||
    normalizedEmail === "demo@brand360s.com";

  let supabaseSuccess = false;
  try {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && authData?.user) {
      // Check if profile is active in CRM
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        // Sign out immediately if deactivated
        await supabase.auth.signOut();
        return { error: "Your employee account has been deactivated. Please contact an administrator." };
      }

      supabaseSuccess = true;
    } else if (error) {
      console.warn("Supabase sign in notice:", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase sign in connection notice:", err?.message);
  }

  if (supabaseSuccess) {
    const cookieStore = await cookies();
    cookieStore.delete("brand360s_demo_user");
    redirect(returnUrl);
  }

  // If Supabase failed or placeholder URL, check for demo/fallback access
  const isPlaceholderUrl =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  if (isDemoCredential || isPlaceholderUrl) {
    const isAdmin = normalizedEmail.includes("admin") || normalizedEmail === "demo@brand360s.com";
    const demoUser = {
      id: isAdmin ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002",
      email: normalizedEmail,
      full_name: isAdmin ? "Admin User" : "Sales Representative",
      role: isAdmin ? "admin" : "employee",
      is_active: true,
    };

    const cookieStore = await cookies();
    cookieStore.set(
      "brand360s_demo_user",
      encodeURIComponent(JSON.stringify(demoUser)),
      {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      }
    );

    redirect(returnUrl);
  }

  return { error: "Invalid credentials. Please verify your email and password." };
}

export async function quickDemoLoginAction(role: "admin" | "salesperson", returnUrl: string = "/dashboard") {
  const isAdmin = role === "admin";
  const demoUser = {
    id: isAdmin ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002",
    email: isAdmin ? "admin@brand360s.com" : "sales1@brand360s.com",
    full_name: isAdmin ? "Admin User" : "Sales Representative",
    role: isAdmin ? "admin" : "employee",
    is_active: true,
  };

  const cookieStore = await cookies();
  cookieStore.set(
    "brand360s_demo_user",
    encodeURIComponent(JSON.stringify(demoUser)),
    {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    }
  );

  redirect(returnUrl);
}

export async function forgotPasswordAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (err: any) {
    return { error: err?.message || "Could not dispatch password reset link." };
  }

  return { success: "Password reset link has been dispatched to your email address." };
}

export async function resetPasswordAction(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (err: any) {
    return { error: err?.message || "Failed to update password." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  const cookieStore = await cookies();
  cookieStore.delete("brand360s_demo_user");
  redirect("/login");
}
