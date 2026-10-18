import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { adminT } from "../../i18n";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; country?: string }> }) {
  const user = await requireAdmin("customers");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const where: Prisma.CustomerWhereInput = {};
  if (sp.status) where.status = sp.status;
  if (sp.country) where.country = sp.country.toUpperCase();
  if (sp.q) where.OR = [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q } }];
  const rows = await db.customer.findMany({ where, orderBy: { updatedAt: "desc" }, take: 300, include: { _count: { select: { bookings: true, leads: true } } } });
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">{t.customers}</h1>
        <a href={`/admin/customers/export?${qs}`} className="btn btn-outline h-10 min-h-0 text-sm">{t.export}</a>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name, email, phone" className="input h-10 min-h-0 w-64" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 min-h-0 w-36"><option value="">{t.all}</option><option>lead</option><option>customer</option><option>vip</option></select>
        <input name="country" defaultValue={sp.country} placeholder="Country (US, VN…)" maxLength={2} className="input h-10 min-h-0 w-40" />
        <button className="btn btn-primary h-10 min-h-0">{t.search}</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Country / lang</th><th className="p-3">Source</th><th className="p-3">Bookings</th><th className="p-3">Leads</th><th className="p-3">{t.status}</th><th className="p-3">Updated</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3"><Link href={`/admin/customers/${c.id}`} className="font-medium text-primary">{c.name}</Link></td>
                <td className="p-3">{c.email ?? "–"}<br /><span className="text-xs text-muted">{c.phone.startsWith("email:") ? "" : c.phone}</span></td>
                <td className="p-3">{c.country ?? "–"} · {c.locale.toUpperCase()}/{c.currency}</td>
                <td className="max-w-40 truncate p-3">{c.source ?? "–"}</td>
                <td className="p-3">{c._count.bookings}</td>
                <td className="p-3">{c._count.leads}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{fmtDate(c.updatedAt, "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
