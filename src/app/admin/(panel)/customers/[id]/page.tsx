import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { logEvent } from "@/lib/crm";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { arr } from "@/lib/json";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("customers");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const c = await db.customer.findUnique({
    where: { id },
    include: { bookings: { orderBy: { createdAt: "desc" }, include: { tour: true, departure: true } }, leads: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!c) notFound();

  async function save(fd: FormData) {
    "use server";
    const user = await requireAdmin("customers");
    const tags = String(fd.get("tags") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const birthday = String(fd.get("birthday") ?? "");
    await db.customer.update({
      where: { id },
      data: { status: String(fd.get("status")), notes: String(fd.get("notes") ?? ""), tags, birthday: birthday ? new Date(birthday) : null, locale: String(fd.get("locale")) },
    });
    await logEvent(id, "note", `${user.name} updated the profile`);
    await audit(user.email, "customer.update", String(id));
    redirect(`/admin/customers/${id}`);
  }
  async function addNote(fd: FormData) {
    "use server";
    const user = await requireAdmin("customers");
    const note = String(fd.get("note") ?? "").trim();
    if (note) await logEvent(id, "note", `${user.name}: ${note}`);
    redirect(`/admin/customers/${id}`);
  }
  // Right to erasure: delete outright when there are no bookings; otherwise anonymize, since
  // accounting law requires keeping invoiced transactions.
  async function erase() {
    "use server";
    const user = await requireAdmin("customers");
    const cur = await db.customer.findUniqueOrThrow({ where: { id }, include: { _count: { select: { bookings: true } } } });
    if (cur._count.bookings === 0) {
      await db.customer.delete({ where: { id } });
    } else {
      await db.customer.update({ where: { id }, data: { name: "Deleted customer", email: null, phone: `deleted:${id}`, notes: null, tags: [], utm: Prisma.DbNull, birthday: null, source: null } });
      await db.booking.updateMany({ where: { customerId: id }, data: { passengers: [], note: null } });
      await db.lead.deleteMany({ where: { customerId: id } });
      await db.customerEvent.deleteMany({ where: { customerId: id } });
    }
    await audit(user.email, "gdpr.erase", `customer ${id}`);
    redirect("/admin/customers");
  }

  const box = "rounded-xl border border-line bg-white p-5";
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-muted">← Customers</Link>
        <h1 className="mt-1 text-2xl">{c.name}</h1>
        <p className="text-sm text-muted">{c.email ?? "–"} · {c.phone.startsWith("email:") ? "no phone" : c.phone} · {c.country ?? "–"} · {c.locale.toUpperCase()}/{c.currency} · since {fmtDate(c.createdAt, "en")}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <div className={box}>
            <h2 className="text-lg">Bookings</h2>
            {c.bookings.length === 0 && <p className="mt-2 text-sm text-muted">No bookings yet.</p>}
            <ul className="mt-2 divide-y divide-line text-sm">
              {c.bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/admin/bookings/${b.code}`} className="font-mono text-primary">{b.code}</Link>
                  <span className="flex-1 truncate">{b.tour.title} · {fmtDate(b.departure.date, "en")}</span>
                  <span>{formatMoney(b.total, b.baseCurrency, "en")} · {b.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={box}>
            <h2 className="text-lg">Leads</h2>
            {c.leads.length === 0 && <p className="mt-2 text-sm text-muted">None.</p>}
            <ul className="mt-2 divide-y divide-line text-sm">
              {c.leads.map((l) => (
                <li key={l.id} className="py-2"><span className="font-medium">{l.type}</span> · {fmtDate(l.createdAt, "en")} {l.tourSlug && `· ${l.tourSlug}`}<p className="text-muted">{l.message}</p></li>
              ))}
            </ul>
          </div>
          <div className={box}>
            <h2 className="text-lg">Timeline</h2>
            <form action={addNote} className="mt-3 flex gap-2"><input name="note" placeholder="Add a note (call, WhatsApp chat…)" className="input h-10 min-h-0 flex-1" /><button className="btn btn-primary h-10 min-h-0">Add</button></form>
            <ol className="mt-3 space-y-2 border-l border-line pl-4 text-sm">
              {c.events.map((e) => (
                <li key={e.id}><span className="text-xs text-muted">{fmtDate(e.createdAt, "en", { hour: "2-digit", minute: "2-digit" })} · {e.type}</span><p>{e.detail}</p></li>
              ))}
            </ol>
          </div>
        </div>
        <div className="grid content-start gap-6">
          <form action={save} className={`${box} grid gap-3`}>
            <h2 className="text-lg">Profile</h2>
            <label className="label">Status<select name="status" defaultValue={c.status} className="input mt-1"><option>lead</option><option>customer</option><option>vip</option></select></label>
            <label className="label">Message language<select name="locale" defaultValue={c.locale} className="input mt-1"><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
            <label className="label">Tags (comma separated)<input name="tags" defaultValue={arr<string>(c.tags).join(", ")} className="input mt-1" /></label>
            <label className="label">Birthday<input type="date" name="birthday" defaultValue={c.birthday?.toISOString().slice(0, 10)} className="input mt-1" /></label>
            <label className="label">Notes<textarea name="notes" defaultValue={c.notes ?? ""} rows={4} className="input mt-1 h-auto py-2" /></label>
            <button className="btn btn-primary">Save</button>
          </form>
          <div className={box}>
            <h2 className="text-lg">Privacy (GDPR / Decree 13)</h2>
            <a href={`/admin/customers/${c.id}/gdpr`} className="btn btn-outline mt-3 w-full">Export personal data (JSON)</a>
            <form action={erase} className="mt-2"><button className="btn w-full border border-danger text-danger">Erase personal data</button></form>
            <p className="mt-2 text-xs text-muted">Customers with bookings are anonymized (transactions are kept for accounting); others are deleted.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
