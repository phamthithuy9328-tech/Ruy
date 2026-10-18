import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { adminT } from "../../i18n";

const statuses = ["pending", "paid", "failed", "cancelled", "refunded"];

export default async function Bookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }> }) {
  const user = await requireAdmin("bookings");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const where: Prisma.BookingWhereInput = {};
  if (sp.status) where.status = sp.status;
  if (sp.q) where.OR = [{ code: { contains: sp.q.toUpperCase() } }, { customer: { name: { contains: sp.q } } }, { customer: { email: { contains: sp.q } } }, { customer: { phone: { contains: sp.q } } }];
  if (sp.from || sp.to) where.departure = { date: { gte: sp.from ? new Date(sp.from) : undefined, lte: sp.to ? new Date(sp.to + "T23:59:59") : undefined } };
  const rows = await db.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { customer: true, tour: true, departure: true } });
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t.bookings}</h1>
        <a href={`/admin/bookings/export?${qs}`} className="btn btn-outline h-10 min-h-0 text-sm">{t.export}</a>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Code, name, email, phone" className="input h-10 min-h-0 w-64" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 min-h-0 w-40"><option value="">{t.all}</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="Departure from" className="input h-10 min-h-0 w-40" />
        <input type="date" name="to" defaultValue={sp.to} aria-label="Departure to" className="input h-10 min-h-0 w-40" />
        <button className="btn btn-primary h-10 min-h-0">{t.search}</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Code</th><th className="p-3">Customer</th><th className="p-3">Tour</th><th className="p-3">Departure</th><th className="p-3">Pax</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Method</th><th className="p-3">{t.status}</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="p-3 font-mono"><Link href={`/admin/bookings/${b.code}`} className="text-primary">{b.code}</Link></td>
                <td className="p-3">{b.customer.name}<br /><span className="text-xs text-muted">{b.customer.country ?? ""} · {b.locale.toUpperCase()}/{b.currency}</span></td>
                <td className="max-w-56 truncate p-3">{b.tour.title}</td>
                <td className="p-3">{fmtDate(b.departure.date, "en")}</td>
                <td className="p-3">{b.adults}/{b.children}/{b.infants}</td>
                <td className="p-3">{formatMoney(b.total, b.baseCurrency, "en")}</td>
                <td className="p-3">{formatMoney(b.amountPaid, b.baseCurrency, "en")}</td>
                <td className="p-3">{b.method ?? "–"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "paid" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
