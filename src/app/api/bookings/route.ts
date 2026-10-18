import { NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/rate-limit";
import { checkoutCookie, checkoutToken } from "@/lib/tokens";
import { isCurrency } from "@/lib/currency";
import { isLocale } from "@/i18n/config";

const schema = z.object({
  tourSlug: z.string().max(120),
  departureId: z.number().int().positive(),
  adults: z.number().int().min(1).max(30),
  children: z.number().int().min(0).max(30),
  infants: z.number().int().min(0).max(10),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{7,20}$/),
  email: z.string().trim().email().max(120),
  nationality: z.string().trim().max(60).optional(),
  note: z.string().max(1000).optional(),
  passengers: z.array(z.object({ name: z.string().max(100), type: z.enum(["adult", "child", "infant"]) })).max(40).optional(),
  locale: z.string(),
  currency: z.string(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
  page: z.string().max(300).optional(),
  turnstile: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`booking:${ip}`, 10)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const v = parsed.data;
  if (!(await verifyTurnstile(v.turnstile, ip))) return NextResponse.json({ error: "bot" }, { status: 400 });
  try {
    const b = await createBooking({
      ...v, locale: isLocale(v.locale) ? v.locale : "en", currency: isCurrency(v.currency) ? v.currency : "USD", source: v.page,
      country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry"),
      passengers: v.passengers?.filter((p) => p.name.trim()),
    });
    const res = NextResponse.json({ code: b.code, expiresAt: b.expiresAt });
    res.cookies.set(checkoutCookie(b.code), checkoutToken(b.code), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
