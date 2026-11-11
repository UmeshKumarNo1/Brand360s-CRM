import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupabaseTestPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let status: "connected" | "unconfigured" | "error" = "unconfigured";
  let errorMessage = "";
  let latencyMs = 0;

  if (!supabaseUrl || !hasKey || supabaseUrl.includes("YOUR_PROJECT_ID")) {
    status = "unconfigured";
  } else {
    try {
      const startTime = Date.now();
      const supabase = await createClient();
      const { error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
      latencyMs = Date.now() - startTime;

      if (error && error.code !== "PGRST116" && !error.message?.includes("does not exist")) {
        status = "error";
        errorMessage = error.message;
      } else {
        status = "connected";
      }
    } catch (err: any) {
      status = "error";
      errorMessage = err?.message || "Failed to reach Supabase";
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC] p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#077EA1]" />
          <h1 className="text-xl font-bold text-slate-900">Supabase Connection Test</h1>
        </div>

        <p className="text-xs text-slate-500">
          Validating connectivity to BRAND 360s Supabase South Asia (Mumbai) cluster.
        </p>

        <div className="p-4 rounded-xl border text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Project Endpoint:</span>
            <span className="font-mono text-slate-800 truncate max-w-[200px]">
              {supabaseUrl || "Not defined"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Key Configured:</span>
            <span className="font-medium text-slate-800">{hasKey ? "Yes (Masked)" : "No"}</span>
          </div>
        </div>

        {status === "unconfigured" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
            <p className="font-semibold">⚠️ Supabase Credentials Pending</p>
            <p className="text-[11px] leading-relaxed">
              Please enter your <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>.
            </p>
          </div>
        )}

        {status === "connected" && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
            <p className="font-semibold">✅ Supabase Connected Successfully</p>
            <p className="text-[11px]">
              Authentication & DB endpoints reached in {latencyMs}ms. Ready for CRM tables.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
            <p className="font-semibold">❌ Connection Error</p>
            <p className="font-mono text-[11px] break-all">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

