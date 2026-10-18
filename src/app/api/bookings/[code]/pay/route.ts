import { NextResponse } from "next/server";
import { z } from "zod";
import { startPayment } from "@/lib/booking";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";
import { canCheckout } from "../guard";

const schema = z.object({ method: z.string().max(30), plan: z.enum(["full", "deposit"]), promo: z.string().max(40).nullable().optional(), agree: z.literal(true) });

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = clientIp(req);
  if (!rateLimit(`pay:${ip}`, 15)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!(await canCheckout(code))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const r = await startPayment(code, parsed.data.method, parsed.data.plan, parsed.data.promo ?? null, base ?? site.url, ip);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
