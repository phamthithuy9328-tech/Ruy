import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/currency";
import { extraLocales } from "../../forms";
import { adminT } from "../../i18n";

export default async function Tours() {
  const user = await requireAdmin("tours");
  const t = adminT(user.locale);
  const tours = await db.tour.findMany({ orderBy: [{ published: "desc" }, { popularity: "desc" }], include: { destination: true, _count: { select: { departures: true, bookings: true } } } });
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t.tours}</h1>
        {user.role !== "translator" && <Link href="/admin/tours/new" className="btn btn-primary h-10 min-h-0 text-sm">{t.new}</Link>}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Tour</th><th className="p-3">Destination</th><th className="p-3">From</th><th className="p-3">Departures</th><th className="p-3">Bookings</th><th className="p-3">Translations</th><th className="p-3">{t.status}</th></tr></thead>
          <tbody>
            {tours.map((x) => {
              const tr = (x.tr ?? {}) as Record<string, Record<string, unknown>>;
              return (
                <tr key={x.id} className="border-t border-line">
                  <td className="p-3"><Link href={`/admin/tours/${x.id}`} className="font-medium text-primary">{x.title}</Link><br /><span className="text-xs text-muted">/tour/{x.slug}</span></td>
                  <td className="p-3">{x.destination.name}</td>
                  <td className="p-3">{formatMoney(x.priceFrom, x.currency, "en")}</td>
                  <td className="p-3">{x._count.departures}</td>
                  <td className="p-3">{x._count.bookings}</td>
                  <td className="p-3">{extraLocales.map((l) => <span key={l} className={`mr-1 rounded px-1.5 text-xs ${tr[l]?.title ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{l.toUpperCase()}</span>)}</td>
                  <td className="p-3">{x.published ? "Published" : "Draft"}{x.badge ? ` · ${x.badge}` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
