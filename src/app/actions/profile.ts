"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "employee";
  is_active: boolean;
}

export async function getCurrentUserProfileAction(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user && !userError) {
      // Fetch role and details from public.profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", user.id)
        .single();

      if (profile) {
        return profile as UserProfile;
      }

      // If a user exists in auth.users but has no row in profiles yet, create it on-demand
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const isFirstUser = count === 0;
      const initialRole: "admin" | "employee" = isFirstUser ? "admin" : "employee";
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

      const { data: newProfile } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: name,
          role: initialRole,
          is_active: true,
        })
        .select("id, email, full_name, role, is_active")
        .single();

      return (
        newProfile || {
          id: user.id,
          email: user.email || "",
          full_name: name,
          role: initialRole,
          is_active: true,
        }
      );
    }
  } catch (err) {
    console.warn("Supabase auth profile check notice:", err);
  }

  // Fallback to demo user session cookie if present
  try {
    const cookieStore = await cookies();
    const demoCookie = cookieStore.get("brand360s_demo_user");
    if (demoCookie?.value) {
      const parsed = JSON.parse(decodeURIComponent(demoCookie.value));
      if (parsed?.id) {
        return {
          id: parsed.id,
          email: parsed.email || "admin@brand360s.com",
          full_name: parsed.full_name || (parsed.role === "admin" ? "Admin User" : "Sales Representative"),
          role: parsed.role === "admin" ? "admin" : "employee",
          is_active: parsed.is_active !== false,
        };
      }
    }
  } catch {
    // ignore cookie parsing error
  }

  return null;
}
