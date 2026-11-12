import { NextResponse } from "next/server";
import { runScheduledNotificationsCheck } from "@/app/actions/notification-scheduler";

export const dynamic = "force-dynamic";

/**
 * Scheduled Cron Endpoint (Runs daily at 9:00 AM IST)
 * Can be called by Supabase pg_cron, Vercel/Netlify Cron, or GitHub Actions.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");
    const secret = searchParams.get("secret");

    // Optional basic secret check if configured in ENV
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && secret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runScheduledNotificationsCheck();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute notification check" }, { status: 500 });
  }
}

