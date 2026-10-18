import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { convert, currencies, currencyNames, defaultFx, formatMoney, type FxConfig } from "@/lib/currency";
import { getSetting, refreshRates, setSetting } from "@/lib/settings";
import { defaultLocale, localeNames, locales } from "@/i18n/config";
import { fmtDate } from "@/lib/format";
import { Flash } from "../../forms";
import { adminT } from "../../i18n";

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("settings");
  const t = adminT(user.locale);
  const sp = await searchParams;
  const [fx, geo, redirects] = await Promise.all([
    getSetting<FxConfig>("fx", defaultFx),
    getSetting<{ currency: Record<string, string>; locale: Record<string, string> }>("geo", { currency: {}, locale: {} }),
    db.redirect.findMany({ orderBy: { from: "asc" } }),
  ]);

  async function saveFx(fd: FormData) {
    "use server";
    const u = await requireAdmin("settings");
    const cur = await getSetting<FxConfig>("fx", defaultFx);
    const next: FxConfig = { ...cur, overrides: {}, rounding: { ...cur.rounding }, enabled: ["USD"] };
    next.markupPercent = Math.min(Math.max(Number(fd.get("markupPercent") || 0), 0), 20);
    for (const c of currencies) {
      const o = Number(fd.get(`override_${c}`) || 0);
      if (o > 0 && c !== "USD") next.overrides[c] = o;
      const r = Number(fd.get(`round_${c}`) || 0);
      if (r > 0) next.rounding[c] = r;
      if (fd.get(`enabled_${c}`) === "on" && c !== "USD") next.enabled.push(c);
    }
    await setSetting("fx", next);
    await audit(u.email, "settings.fx", JSON.stringify({ markup: next.markupPercent, overrides: next.overrides, enabled: next.enabled }));
    redirect("/admin/settings?ok=Exchange+rates+saved");
  }
  async function refresh() {
    "use server";
    const u = await requireAdmin("settings");
    try {
      await refreshRates();
    } catch (e) {
      redirect(`/admin/settings?error=${encodeURIComponent(`Could not refresh: ${e instanceof Error ? e.message : e}`)}`);
    }
    await audit(u.email, "settings.fx_refresh", "manual");
    redirect("/admin/settings?ok=Rates+refreshed");
  }
  async function saveGeo(fd: FormData) {
    "use server";
    const u = await requireAdmin("settings");
    const parse = (s: FormDataEntryValue | null) => Object.fromEntries(String(s ?? "").split("\n").map((l) => l.split(/[=:,\s]+/).map((x) => x.trim().toUpperCase())).filter((p) => p.length === 2 && /^[A-Z]{2}$/.test(p[0])).map(([k, v]) => [k, v]));
    const currency = Object.fromEntries(Object.entries(parse(fd.get("currency"))).filter(([, v]) => (currencies as readonly string[]).includes(v)));
    const locale = Object.fromEntries(Object.entries(parse(fd.get("locale"))).map(([k, v]) => [k, v.toLowerCase()]).filter(([, v]) => (locales as readonly string[]).includes(v)));
    await setSetting("geo", { currency, locale });
    await audit(u.email, "settings.geo", JSON.stringify({ currency, locale }));
    redirect("/admin/settings?ok=Geo+rules+saved");
  }
  async function addRedirect(fd: FormData) {
    "use server";
    const u = await requireAdmin("settings");
    const from = "/" + String(fd.get("from") ?? "").trim().replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "");
    const to = String(fd.get("to") ?? "").trim();
    if (from === "/" || !to || from === to) redirect("/admin/settings?error=Enter+both+paths#redirects");
    await db.redirect.upsert({ where: { from }, update: { to, permanent: fd.get("permanent") === "on" }, create: { from, to, permanent: fd.get("permanent") === "on" } });
    await audit(u.email, "redirect.add", `${from} → ${to}`);
    redirect("/admin/settings?ok=Redirect+saved#redirects");
  }
  async function delRedirect(fd: FormData) {
    "use server";
    const u = await requireAdmin("settings");
    const r = await db.redirect.delete({ where: { id: Number(fd.get("id")) } });
    await audit(u.email, "redirect.delete", r.from);
    redirect("/admin/settings#redirects");
  }

  const box = "rounded-xl border border-line bg-white p-5";
  const toLines = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => `${k}=${v}`).join("\n");
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.settings}</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className={box}>
        <h2 className="text-lg">Languages</h2>
        <ul className="mt-2 text-sm">{locales.map((l) => <li key={l}>{localeNames[l]} <code>{l}</code>{l === defaultLocale ? " · default, no URL prefix" : ` · /${l}/…`}</li>)}</ul>
        <p className="mt-2 text-xs text-muted">To add a language: add its code in <code>src/i18n/config.ts</code>, copy <code>src/i18n/en.ts</code> to a new dictionary, and translators fill the new column that appears on every tour, guide and template. See README.</p>
      </div>

      <form action={saveFx} className={box}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Currencies & exchange rates</h2>
            <p className="text-sm text-muted">Rates are units per 1 USD, refreshed daily. Last refresh: {fx.updatedAt ? fmtDate(new Date(fx.updatedAt), "en", { hour: "2-digit", minute: "2-digit" }) : "never (using defaults)"}.</p>
          </div>
          <button formAction={refresh} className="btn btn-outline h-10 min-h-0 text-sm">Refresh now</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Shown</th><th>Currency</th><th>Market rate</th><th>Manual override</th><th>Round to</th><th>Example: $100 →</th></tr></thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c} className="border-t border-line">
                  <td className="py-2"><input type="checkbox" name={`enabled_${c}`} defaultChecked={fx.enabled.includes(c)} disabled={c === "USD"} className="accent-primary" /></td>
                  <td>{c} · {currencyNames[c]}</td>
                  <td>{fx.rates[c]}</td>
                  <td><input name={`override_${c}`} type="number" step="any" defaultValue={fx.overrides[c] ?? ""} disabled={c === "USD"} className="input h-9 min-h-0 w-32" /></td>
                  <td><input name={`round_${c}`} type="number" step="any" defaultValue={fx.rounding[c] ?? 1} className="input h-9 min-h-0 w-24" /></td>
                  <td>{formatMoney(convert(100, "USD", c, fx), c, "en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="label mt-4 block max-w-xs">Markup on converted prices (%)<input name="markupPercent" type="number" step="0.1" min={0} max={20} defaultValue={fx.markupPercent} className="input mt-1" /><span className="text-xs font-normal text-muted">Covers card/FX costs. Applied to display prices and to the charged amount when the charge currency differs from the tour&apos;s.</span></label>
        <button className="btn btn-primary mt-4">{t.save}</button>
      </form>

      <form action={saveGeo} className={box}>
        <h2 className="text-lg">Geo rules</h2>
        <p className="text-sm text-muted">One rule per line, e.g. <code>TH=USD</code>. Built-in defaults: VN → VND/Tiếng Việt, eurozone → EUR, GB → GBP, AU → AUD, SG → SGD, KR → KRW, JP → JPY, everyone else → USD/English. Visitors can always switch.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="label">Country → currency<textarea name="currency" rows={5} defaultValue={toLines(geo.currency)} className="input mt-1 h-auto py-2 font-mono text-xs" /></label>
          <label className="label">Country → suggested language<textarea name="locale" rows={5} defaultValue={toLines(geo.locale)} className="input mt-1 h-auto py-2 font-mono text-xs" /></label>
        </div>
        <button className="btn btn-primary mt-4">{t.save}</button>
      </form>

      <div id="redirects" className={box}>
        <h2 className="text-lg">301 redirects</h2>
        <p className="text-sm text-muted">For old URLs from the previous website. Slug changes on tours and guides add redirects automatically.</p>
        <form action={addRedirect} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="label">From<input name="from" required placeholder="/tour-ha-giang-3n2d.html" className="input mt-1 w-72" /></label>
          <label className="label">To<input name="to" required placeholder="/tour/ha-giang-loop-3-days" className="input mt-1 w-72" /></label>
          <label className="label flex h-12 items-center gap-2"><input type="checkbox" name="permanent" defaultChecked className="accent-primary" />Permanent</label>
          <button className="btn btn-primary">Add</button>
        </form>
        <table className="mt-4 w-full text-sm">
          <tbody>{redirects.map((r) => <tr key={r.id} className="border-t border-line"><td className="py-2 font-mono text-xs">{r.from}</td><td className="font-mono text-xs">→ {r.to}</td><td>{r.permanent ? "301" : "302"}</td><td><form action={delRedirect}><input type="hidden" name="id" value={r.id} /><button className="text-danger">{t.delete}</button></form></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
