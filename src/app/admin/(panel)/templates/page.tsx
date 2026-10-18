import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { locales } from "@/i18n/config";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

const vars = ["name", "code", "tour", "date", "guests", "total", "paid", "expires", "lookup_url", "pay_url", "meeting_point", "guide", "packing", "hotline", "review_url", "coupon"];

export default async function Templates({ searchParams }: { searchParams: Promise<{ key?: string; ok?: string; error?: string }> }) {
  const user = await requireAdmin("templates");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const all = await db.messageTemplate.findMany({ orderBy: [{ key: "asc" }, { locale: "asc" }] });
  const keys = [...new Set(all.map((x) => x.key))];
  const key = sp.key ?? keys[0];
  const rows = all.filter((x) => x.key === key);
  const base = rows.find((r) => r.locale === "en") ?? rows[0];

  async function save(fd: FormData) {
    "use server";
    const u = await requireAdmin("templates");
    const locale = String(fd.get("locale"));
    const k = String(fd.get("key"));
    if (!(locales as readonly string[]).includes(locale)) return;
    const data: { subject: string | null; body: string; active?: boolean } = { subject: String(fd.get("subject") ?? "") || null, body: String(fd.get("body") ?? "") };
    if (u.role !== "translator") data.active = fd.get("active") === "on"; // translators edit wording only
    const src = await db.messageTemplate.findFirstOrThrow({ where: { key: k } });
    await db.messageTemplate.upsert({ where: { key_locale: { key: k, locale } }, update: data, create: { key: k, locale, name: src.name, channel: src.channel, ...data } });
    await audit(u.email, "template.update", `${k}:${locale}`);
    redirect(`/admin/templates?key=${k}&ok=Saved`);
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.templates}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="grid content-start gap-1">
          {keys.map((k) => {
            const r = all.find((x) => x.key === k && x.locale === "en") ?? all.find((x) => x.key === k)!;
            return <a key={k} href={`?key=${k}`} className={`rounded-lg px-3 py-2 text-sm ${k === key ? "bg-primary text-white" : "bg-white"}`}>{r.name}<br /><span className="text-xs opacity-75">{r.channel} · {all.filter((x) => x.key === k).map((x) => x.locale.toUpperCase()).join(" ")}</span></a>;
          })}
        </nav>
        <div className="grid gap-4">
          <p className="text-sm text-muted">Variables: {vars.map((v) => <code key={v} className="mr-1">{`{{${v}}}`}</code>)}. Customers get the version in their language; English is used when a translation is missing.</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {locales.map((l) => {
              const r = rows.find((x) => x.locale === l);
              return (
                <form key={l} action={save} className="grid gap-3 rounded-xl border border-line bg-white p-5">
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="locale" value={l} />
                  <h2 className="text-lg">{l.toUpperCase()} {!r && <span className="text-sm font-normal text-warning">· missing, English is sent</span>}</h2>
                  {base?.channel === "email" && <label className="label">Subject<input name="subject" defaultValue={r?.subject ?? ""} className="input mt-1" /></label>}
                  <label className="label">Message<textarea name="body" defaultValue={r?.body ?? ""} rows={10} required className="input mt-1 h-auto py-2" /></label>
                  <label className="label flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} disabled={user.role === "translator"} className="accent-primary" />Active</label>
                  <button className="btn btn-primary">{t.save}</button>
                </form>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
