"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "employee";
  is_active: boolean;
}

export async function getCurrentUserProfileAction(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch role and details from public.profiles
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (profile) {
    return profile as UserProfile;
  }

  // If a user exists in auth.users but has no row in profiles yet, create it on-demand
  // Determine if there are any admins yet
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

