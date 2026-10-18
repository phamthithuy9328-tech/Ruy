// CRM + webhooks: every lead and booking becomes a customer record; every event is pushed to n8n/Make/Zapier.
import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

export const webhookEvents = {
  "lead.created": "New lead (quote form, private trip form, contact, newsletter)",
  "booking.created": "Booking created",
  "payment.succeeded": "Payment succeeded (verified by IPN)",
  "payment.failed": "Payment failed",
  "checkout.abandoned": "Abandoned checkout (after 1 hour and 24 hours)",
  "trip.upcoming": "Upcoming trip (3 days and 1 day before departure)",
  "trip.completed": "Trip completed",
  "booking.status_changed": "Staff changed a booking's status",
} as const;
export type WebhookEvent = keyof typeof webhookEvents;

/** Normalize to E.164-ish: keep "+" and digits; Vietnamese local numbers (0xxx) become +84xxx */
export const normalizePhone = (p: string) => {
  const s = p.replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.startsWith("0")) return "+84" + s.slice(1);
  return "+" + s;
};

export async function upsertCustomer(input: {
  name: string; phone?: string | null; email?: string | null; source?: string; utm?: Record<string, string> | null; locale?: string; currency?: string; country?: string | null;
}) {
  // Phone is the CRM key; email-only leads get a synthetic key so they can be merged later
  const phone = input.phone ? normalizePhone(input.phone) : `email:${(input.email ?? "").toLowerCase()}`;
  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing) {
    return db.customer.update({
      where: { id: existing.id },
      data: { name: input.name || existing.name, email: input.email || existing.email, locale: input.locale ?? existing.locale, currency: input.currency ?? existing.currency, country: input.country || existing.country },
    });
  }
  return db.customer.create({
    data: { name: input.name, phone, email: input.email || null, source: input.source, utm: input.utm ?? undefined, tags: [], locale: input.locale ?? "en", currency: input.currency ?? "USD", country: input.country || null },
  });
}

export async function logEvent(customerId: number, type: string, detail: string) {
  await db.customerEvent.create({ data: { customerId, type, detail } });
}

export async function emit(event: WebhookEvent, data: Record<string, unknown>) {
  const hooks = await db.webhook.findMany({ where: { active: true } });
  const payload = { event, created_at: new Date().toISOString(), data };
  const body = JSON.stringify(payload);
  await Promise.all(
    hooks
      .filter((h) => (h.events as string[]).includes(event))
      .map(async (h) => {
        const signature = crypto.createHmac("sha256", h.secret).update(body).digest("hex");
        let status = 0;
        try {
          const res = await fetch(h.url, { method: "POST", headers: { "content-type": "application/json", "x-amgo-event": event, "x-amgo-signature": signature }, body, signal: AbortSignal.timeout(8000) });
          status = res.status;
        } catch {
          status = 0;
        }
        await db.webhookDelivery.create({ data: { webhookId: h.id, event, status, payload: JSON.parse(body) } });
      }),
  );
}
