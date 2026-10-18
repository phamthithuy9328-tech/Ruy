import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { emit, webhookEvents, type WebhookEvent } from "@/lib/crm";
import { fmtDate } from "@/lib/format";
import { arr } from "@/lib/json";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

const samples: Record<WebhookEvent, Record<string, unknown>> = {
  "lead.created": { lead_id: 12, type: "custom-tour", customer: { id: 5, name: "Emma Wilson", email: "emma@example.com", phone: "+447700900123", country: "GB", locale: "en" }, message: "Family of 4, 10 days in March", tour_slug: null, page: "/contact", utm: { utm_source: "google" } },
  "booking.created": { code: "AMG7K2Q9", status: "pending", tour: { slug: "ha-giang-loop-3-days", title: "Ha Giang Loop 3 Days" }, departure_date: "2026-11-20", adults: 2, children: 0, infants: 0, base_currency: "USD", total: 460, amount_paid: 0, display_currency: "EUR", locale: "en", customer: { id: 5, name: "Emma Wilson", email: "emma@example.com", phone: "+447700900123" } },
  "payment.succeeded": { code: "AMG7K2Q9", status: "paid", total: 460, amount_paid: 460, charge_currency: "USD", charge_amount: 460, fx_rate: 1, method: "onepay-intl" },
  "payment.failed": { code: "AMG7K2Q9", status: "failed", response_code: "99", method: "onepay-intl" },
  "checkout.abandoned": { code: "AMG7K2Q9", stage: "1h", checkout_step: 2, resume_url: "https://amgotravel.com/book/ha-giang-loop-3-days?code=AMG7K2Q9" },
  "trip.upcoming": { code: "AMG7K2Q9", days_before: 3, departure_date: "2026-11-20", meeting_point: "AmGo office, 12 Hang Be, Hanoi" },
  "trip.completed": { code: "AMG7K2Q9", review_url: "https://amgotravel.com/tour/ha-giang-loop-3-days#reviews" },
  "booking.status_changed": { code: "AMG7K2Q9", status: "cancelled", previous_status: "paid" },
};

export default async function Webhooks({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("webhooks");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const [hooks, deliveries] = await Promise.all([db.webhook.findMany({ orderBy: { id: "asc" } }), db.webhookDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { webhook: { select: { name: true } } } })]);

  async function create(fd: FormData) {
    "use server";
    const u = await requireAdmin("webhooks");
    const url = String(fd.get("url") ?? "");
    if (!/^https:\/\//.test(url)) redirect("/admin/webhooks?error=URL+must+start+with+https://");
    const events = fd.getAll("events").map(String).filter((e) => e in webhookEvents);
    await db.webhook.create({ data: { name: String(fd.get("name") || "Webhook"), url, events, secret: crypto.randomBytes(24).toString("hex") } });
    await audit(u.email, "webhook.create", url);
    redirect("/admin/webhooks?ok=Created");
  }
  async function act(fd: FormData) {
    "use server";
    const u = await requireAdmin("webhooks");
    const id = Number(fd.get("id"));
    const op = String(fd.get("op"));
    const h = await db.webhook.findUniqueOrThrow({ where: { id } });
    if (op === "delete") await db.webhook.delete({ where: { id } });
    if (op === "toggle") await db.webhook.update({ where: { id }, data: { active: !h.active } });
    if (op === "rotate") await db.webhook.update({ where: { id }, data: { secret: crypto.randomBytes(24).toString("hex") } });
    if (op === "test") {
      const ev = (arr<string>(h.events)[0] ?? "lead.created") as WebhookEvent;
      await emit(ev, { ...samples[ev], test: true });
    }
    await audit(u.email, `webhook.${op}`, h.url);
    redirect(`/admin/webhooks?ok=${op === "test" ? "Test+sent,+see+deliveries+below" : "Saved"}`);
  }

  const box = "rounded-xl border border-line bg-white p-5";
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.webhooks}</h1>
      <p className="max-w-3xl text-sm text-muted">Send leads, bookings and payments to n8n, Make, Zapier or your CRM. Each request is a JSON POST with headers <code>x-amgo-event</code> and <code>x-amgo-signature</code> (HMAC-SHA256 of the raw body with the webhook secret, hex).</p>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={create} className={`${box} grid gap-3`}>
        <h2 className="text-lg">{t.new}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Name<input name="name" placeholder="n8n – leads" className="input mt-1" /></label>
          <label className="label">URL<input name="url" type="url" required placeholder="https://n8n.example.com/webhook/…" className="input mt-1" /></label>
        </div>
        <fieldset className="grid gap-1 text-sm md:grid-cols-2">
          {Object.entries(webhookEvents).map(([k, v]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="events" value={k} defaultChecked className="accent-primary" /><code>{k}</code> <span className="text-muted">{v}</span></label>)}
        </fieldset>
        <button className="btn btn-primary justify-self-start">Add webhook</button>
      </form>
      {hooks.map((h) => (
        <div key={h.id} className={box}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-medium text-ink">{h.name} {!h.active && <span className="text-sm text-warning">(off)</span>}</p><p className="break-all text-sm">{h.url}</p><p className="mt-1 text-xs text-muted">{arr<string>(h.events).join(", ")}</p></div>
            <form action={act} className="flex flex-wrap gap-3 text-sm">
              <input type="hidden" name="id" value={h.id} />
              <button name="op" value="test" className="text-primary">Send test</button>
              <button name="op" value="toggle" className="text-ink">{h.active ? "Disable" : "Enable"}</button>
              <button name="op" value="rotate" className="text-ink">New secret</button>
              <button name="op" value="delete" className="text-danger">{t.delete}</button>
            </form>
          </div>
          <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted">Signing secret</summary><code className="break-all">{h.secret}</code></details>
        </div>
      ))}
      <div className={box}>
        <h2 className="text-lg">Recent deliveries</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Time</th><th>Webhook</th><th>Event</th><th>HTTP</th></tr></thead>
          <tbody>{deliveries.map((d) => <tr key={d.id} className="border-t border-line"><td className="py-2">{fmtDate(d.createdAt, "en", { hour: "2-digit", minute: "2-digit" })}</td><td>{d.webhook.name}</td><td><code>{d.event}</code></td><td className={d.status >= 200 && d.status < 300 ? "text-success" : "text-danger"}>{d.status || "error"}</td></tr>)}</tbody>
        </table>
      </div>
      <div className={box}>
        <h2 className="text-lg">Payload reference</h2>
        <p className="mt-1 text-sm text-muted">Every body is <code>{`{ "event": "…", "created_at": "ISO date", "data": { … } }`}</code>. Amounts are in the tour&apos;s base currency unless prefixed with charge_.</p>
        <div className="mt-3 grid gap-3">
          {(Object.keys(samples) as WebhookEvent[]).map((k) => (
            <details key={k} className="rounded-lg bg-surface p-3 text-sm"><summary className="cursor-pointer"><code>{k}</code> · {webhookEvents[k]}</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(samples[k], null, 2)}</pre></details>
          ))}
        </div>
      </div>
    </div>
  );
}
