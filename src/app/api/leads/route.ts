import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { emit, logEvent, upsertCustomer } from "@/lib/crm";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  contact: z.string().trim().min(3).max(120),
  message: z.string().max(2000).optional(),
  groupSize: z.coerce.number().int().min(1).max(500).optional().or(z.literal("")),
  dates: z.string().max(60).optional(),
  type: z.enum(["enquiry", "custom-tour", "contact", "newsletter"]),
  tourSlug: z.string().max(120).optional(),
  locale: z.string().max(5).default("en"),
  page: z.string().max(300).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
  turnstile: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`lead:${ip}`, 8)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;
  // The one-field newsletter form has no room for the widget; it relies on the rate limit
  if (v.type !== "newsletter" && !(await verifyTurnstile(v.turnstile, ip))) return NextResponse.json({ error: "bot" }, { status: 400 });

  const isEmail = v.contact.includes("@");
  const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry");
  const customer = await upsertCustomer({
    name: v.name, email: isEmail ? v.contact : null, phone: isEmail ? null : v.contact, source: v.page, utm: v.utm, locale: v.locale, country,
    currency: req.headers.get("cookie")?.match(/(?:^|; )cur=([A-Z]{3})/)?.[1],
  });
  const message = [v.message, v.groupSize ? `Group size: ${v.groupSize}` : "", v.dates ? `Dates: ${v.dates}` : ""].filter(Boolean).join("\n");
  const lead = await db.lead.create({ data: { customerId: customer.id, type: v.type, message: message || null, tourSlug: v.tourSlug, page: v.page } });
  await logEvent(customer.id, "lead", `${v.type}${v.tourSlug ? ` · ${v.tourSlug}` : ""}`);
  await emit("lead.created", { lead_id: lead.id, type: v.type, tour_slug: v.tourSlug, message, page: v.page, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, locale: customer.locale, country: customer.country } });
  return NextResponse.json({ ok: true });
}
