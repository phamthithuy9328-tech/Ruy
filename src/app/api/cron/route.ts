// Scheduled work. Call every 15 minutes with `Authorization: Bearer $CRON_SECRET`
// (Vercel Cron sends this header automatically; elsewhere use cron + curl).
// Expires unpaid holds, sends abandoned-checkout and trip reminders, and refreshes FX rates once a day.
import { runScheduledJobs } from "@/lib/booking";
import { safeEqual } from "@/lib/tokens";
import { defaultFx, type FxConfig } from "@/lib/currency";
import { getSetting, refreshRates } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const jobs = await runScheduledJobs();
  let fx: string = "fresh";
  const { updatedAt } = await getSetting<FxConfig>("fx", defaultFx);
  if (!updatedAt || Date.now() - new Date(updatedAt).getTime() > 23 * 3600_000) {
    try {
      await refreshRates();
      fx = "refreshed";
    } catch (e) {
      fx = `error: ${e instanceof Error ? e.message : e}`;
    }
  }
  return Response.json({ ok: true, jobs, fx });
}
