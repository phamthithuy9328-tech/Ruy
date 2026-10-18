import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

export default async function Discounts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("discounts");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const codes = await db.discountCode.findMany({ orderBy: { id: "desc" } });

  async function create(fd: FormData) {
    "use server";
    const u = await requireAdmin("discounts");
    const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    const percent = Number(fd.get("percent") || 0) || null;
    const amount = Number(fd.get("amount") || 0) || null;
    if (!code || (!percent && !amount)) redirect("/admin/discounts?error=Enter+a+code+and+a+percent+or+amount");
    if (percent && (percent < 1 || percent > 100)) redirect("/admin/discounts?error=Percent+must+be+1-100");
    if (await db.discountCode.findUnique({ where: { code } })) redirect("/admin/discounts?error=Code+already+exists");
    const exp = String(fd.get("expiresAt") ?? "");
    await db.discountCode.create({ data: { code, percent, amount, maxUses: Number(fd.get("maxUses") || 0) || null, expiresAt: exp ? new Date(exp + "T23:59:59") : null } });
    await audit(u.email, "discount.create", code);
    redirect("/admin/discounts?ok=Created");
  }
  async function toggle(fd: FormData) {
    "use server";
    const u = await requireAdmin("discounts");
    const id = Number(fd.get("id"));
    const d = await db.discountCode.findUniqueOrThrow({ where: { id } });
    await db.discountCode.update({ where: { id }, data: { active: !d.active } });
    await audit(u.email, "discount.toggle", `${d.code} → ${!d.active}`);
    redirect("/admin/discounts");
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.discounts}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form action={create} className="grid gap-2 rounded-xl border border-line bg-white p-5 md:grid-cols-6">
        <label className="label">Code<input name="code" required className="input mt-1 uppercase" /></label>
        <label className="label">Percent off<input name="percent" type="number" min={1} max={100} className="input mt-1" /></label>
        <label className="label">or fixed amount<input name="amount" type="number" min={1} className="input mt-1" /><span className="text-xs font-normal text-muted">In each tour&apos;s base currency</span></label>
        <label className="label">Max uses<input name="maxUses" type="number" min={1} className="input mt-1" /></label>
        <label className="label">Expires<input name="expiresAt" type="date" className="input mt-1" /></label>
        <button className="btn btn-primary self-end">{t.new}</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="p-3">Code</th><th className="p-3">Value</th><th className="p-3">Used</th><th className="p-3">Expires</th><th className="p-3">{t.status}</th><th className="p-3"></th></tr></thead>
          <tbody>
            {codes.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <td className="p-3 font-mono">{d.code}</td>
                <td className="p-3">{d.percent ? `${d.percent}%` : d.amount}</td>
                <td className="p-3">{d.used}{d.maxUses ? ` / ${d.maxUses}` : ""}</td>
                <td className="p-3">{d.expiresAt ? fmtDate(d.expiresAt, "en") : "–"}</td>
                <td className="p-3">{d.active ? "Active" : "Off"}</td>
                <td className="p-3"><form action={toggle}><input type="hidden" name="id" value={d.id} /><button className="text-primary">{d.active ? "Disable" : "Enable"}</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
