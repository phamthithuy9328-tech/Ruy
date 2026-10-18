import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { adminT } from "../i18n";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireAdmin("dashboard");
  const t = adminT(user.locale);
  const { denied } = await searchParams;
  const since = new Date(Date.now() - 30 * 86400_000);
  const [paid, pending, leads, customers, recent] = await Promise.all([
    db.booking.findMany({ where: { status: "paid", createdAt: { gte: since } }, select: { total: true, baseCurrency: true } }),
    db.booking.count({ where: { status: "pending" } }),
    db.lead.count({ where: { createdAt: { gte: since } } }),
    db.customer.count(),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { customer: true, tour: true } }),
  ]);
  const revenue = paid.reduce<Record<string, number>>((a, b) => ({ ...a, [b.baseCurrency]: (a[b.baseCurrency] ?? 0) + b.total }), {});
  const card = "rounded-xl border border-line bg-white p-5";
  return (
    <div>
      {denied && <p className="mb-4 rounded-lg bg-warning/10 p-3 text-sm text-warning">{t.denied}</p>}
      <h1 className="text-2xl">{t.dashboard}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card}><p className="text-sm text-muted">Paid bookings · 30 days</p><p className="mt-1 text-3xl font-bold text-ink">{paid.length}</p><p className="text-sm">{Object.entries(revenue).map(([c, v]) => formatMoney(v, c, "en")).join(" + ") || "–"}</p></div>
        <div className={card}><p className="text-sm text-muted">Awaiting payment</p><p className="mt-1 text-3xl font-bold text-ink">{pending}</p></div>
        <div className={card}><p className="text-sm text-muted">New leads · 30 days</p><p className="mt-1 text-3xl font-bold text-ink">{leads}</p></div>
        <div className={card}><p className="text-sm text-muted">Customers</p><p className="mt-1 text-3xl font-bold text-ink">{customers}</p></div>
      </div>
      <h2 className="mt-10 text-lg">{t.bookings}</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <tbody>
            {recent.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="p-3 font-mono"><Link href={`/admin/bookings/${b.code}`} className="text-primary">{b.code}</Link></td>
                <td className="p-3">{b.customer.name}</td>
                <td className="p-3">{b.tour.title.slice(0, 50)}</td>
                <td className="p-3">{formatMoney(b.total, b.baseCurrency, "en")}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3 text-muted">{fmtDate(b.createdAt, "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
