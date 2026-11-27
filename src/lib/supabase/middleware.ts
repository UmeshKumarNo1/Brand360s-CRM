import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder_anon_key";

  let user: any = null;
  let userRole = "employee";
  let isActive = true;
  let isTransientAuthError = false;

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    user = authUser;

    if (!user && authError && hasSupabaseAuthCookie) {
      const msg = (authError.message || "").toLowerCase();
      const status = (authError as any).status ?? 0;
      if (status >= 500 || status === 0 || msg.includes("fetch") || msg.includes("network") || msg.includes("timeout")) {
        isTransientAuthError = true;
        console.warn("[proxy] Transient auth error while auth cookie present:", {
          path: request.nextUrl.pathname,
          status,
          code: (authError as any).code,
        });
      }
    }

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      if (profile) {
        userRole = profile.role;
        isActive = profile.is_active;
      }
    }
  } catch (err: any) {
    if (hasSupabaseAuthCookie) {
      isTransientAuthError = true;
      console.warn("[proxy] Auth fetch exception while auth cookie present:", {
        path: request.nextUrl.pathname,
        message: err?.message || "unknown",
      });
    }
  }

  // If no Supabase user, check demo session cookie
  if (!user) {
    const demoCookie = request.cookies.get("brand360s_demo_user");
    if (demoCookie?.value) {
      try {
        const parsed = JSON.parse(decodeURIComponent(demoCookie.value));
        if (parsed?.id) {
          user = { id: parsed.id, email: parsed.email };
          userRole = parsed.role || "admin";
          isActive = parsed.is_active !== false;
        }
      } catch {
        // invalid cookie json
      }
    }
  }

  const path = request.nextUrl.pathname;

  // Public auth routes
  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth") ||
    path.startsWith("/supabase-test");

  // 1. If user is authenticated and attempts to visit login or auth pages, redirect to /dashboard
  if (user && (path === "/login" || path === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 2. If user is NOT authenticated and attempts to access protected CRM routes, redirect to /login
  // Do not redirect on transient network/5xx errors when an auth cookie is present
  if (!user && !isAuthRoute && !isTransientAuthError) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnUrl", path);
    return NextResponse.redirect(url);
  }

  // 3. Deactivated user check & Admin-only routes check
  if (user && !isAuthRoute) {
    if (isActive === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account-deactivated");
      const res = NextResponse.redirect(url);
      res.cookies.delete("brand360s_demo_user");
      return res;
    }

    // Protect Admin-only routes (/employees, /settings)
    if (path.startsWith("/employees") || path.startsWith("/settings")) {
      if (userRole !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
