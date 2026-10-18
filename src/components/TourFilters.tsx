"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { convert, formatMoney, type Money } from "@/lib/currency";

type Opt = { value: string; label: string; count?: number };
export type FilterOptions = { dest: Opt[]; dur: Opt[]; cat: Opt[]; transport: Opt[]; maxUsd: number };

const MULTI = ["dest", "dur", "cat", "transport"] as const;

export function TourFilters({ locale, m, options, hide = [], total }: { locale: Locale; m: Money; options: FilterOptions; hide?: string[]; total: number }) {
  const d = getDict(locale).listing;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();
  const [price, setPrice] = useState<[number, number]>([Number(sp.get("min") ?? 0), Number(sp.get("max") ?? options.maxUsd)]);

  useEffect(() => setPrice([Number(sp.get("min") ?? 0), Number(sp.get("max") ?? options.maxUsd)]), [sp, options.maxUsd]);

  function update(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }
  const toggle = (key: string, value: string) =>
    update((p) => {
      const cur = (p.get(key) ?? "").split(",").filter(Boolean);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });
  const has = (key: string, value: string) => (sp.get(key) ?? "").split(",").includes(value);

  // Price is filtered in USD (stable URLs); labels show the visitor's currency
  useEffect(() => {
    const t = setTimeout(() => {
      const [a, b] = price;
      if (String(a) === (sp.get("min") ?? "0") && String(b) === (sp.get("max") ?? String(options.maxUsd))) return;
      update((p) => {
        if (a > 0) p.set("min", String(a)); else p.delete("min");
        if (b < options.maxUsd) p.set("max", String(b)); else p.delete("max");
      });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  const show = (v: number) => formatMoney(convert(v, "USD", m.currency, m.fx), m.currency, locale);
  const activeCount = [...MULTI.map((k) => (sp.get(k) ?? "").split(",").filter(Boolean).length), sp.get("min") || sp.get("max") ? 1 : 0, sp.get("date") ? 1 : 0, sp.get("rating") ? 1 : 0].reduce((a, b) => a + b, 0);

  const group = (key: (typeof MULTI)[number], title: string, opts: Opt[]) =>
    !hide.includes(key) && opts.length > 0 && (
      <fieldset className="border-b border-line py-4">
        <legend className="mb-2 font-semibold text-ink">{title}</legend>
        <ul className="grid gap-1">
          {opts.map((o) => (
            <li key={o.value}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={has(key, o.value)} onChange={() => toggle(key, o.value)} className="size-4 accent-[var(--color-primary)]" />
                <span className="flex-1 text-ink">{o.label}</span>
                {o.count != null && <span className="text-xs text-muted">{o.count}</span>}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    );

  const panel = (
    <div>
      {group("dest", d.destination, options.dest)}
      {group("dur", d.duration, options.dur)}
      <fieldset className="border-b border-line py-4">
        <legend className="mb-2 font-semibold text-ink">{d.price}</legend>
        <p className="mb-2 text-sm text-ink">{d.priceRange(show(price[0]), show(price[1]))}</p>
        <div className="grid gap-2">
          <input type="range" aria-label="Min" min={0} max={options.maxUsd} step={10} value={price[0]} onChange={(e) => setPrice([Math.min(+e.target.value, price[1]), price[1]])} className="accent-[var(--color-primary)]" />
          <input type="range" aria-label="Max" min={0} max={options.maxUsd} step={10} value={price[1]} onChange={(e) => setPrice([price[0], Math.max(+e.target.value, price[0])])} className="accent-[var(--color-primary)]" />
        </div>
      </fieldset>
      {group("cat", d.type, options.cat)}
      <fieldset className="border-b border-line py-4">
        <legend className="mb-2 font-semibold text-ink">{d.date}</legend>
        <input type="date" aria-label={d.date} value={sp.get("date") ?? ""} onChange={(e) => update((p) => (e.target.value ? p.set("date", e.target.value) : p.delete("date")))} className="input" />
      </fieldset>
      {!hide.includes("rating") && <fieldset className="border-b border-line py-4">
        <legend className="mb-2 font-semibold text-ink">{d.rating}</legend>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4.8].map((r) => (
            <button key={r} type="button" aria-pressed={sp.get("rating") === String(r)} onClick={() => update((p) => (p.get("rating") === String(r) ? p.delete("rating") : p.set("rating", String(r))))} className={`h-10 rounded-full border px-4 text-sm ${sp.get("rating") === String(r) ? "border-primary bg-primary-soft text-primary-hover" : "border-line text-ink"}`}>
              {d.ratingAtLeast(r)}
            </button>
          ))}
        </div>
      </fieldset>}
      {group("transport", d.transport, options.transport)}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button type="button" onClick={() => setSheet(true)} className="btn btn-outline">
          <SlidersHorizontal className="size-4" /> {d.filters} {activeCount > 0 && <span className="rounded-full bg-primary px-2 text-xs text-white">{activeCount}</span>}
        </button>
      </div>
      <aside className={`hidden lg:block ${pending ? "opacity-60" : ""}`} aria-label={d.filters}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg">{d.filters}</h2>
          {activeCount > 0 && <button type="button" onClick={() => update((p) => [...MULTI, "min", "max", "date", "rating", "q", "guests"].forEach((k) => !hide.includes(k) && p.delete(k)))} className="text-sm font-semibold text-primary">{d.clearAll}</button>}
        </div>
        {panel}
      </aside>
      {sheet && (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label={d.filters} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-lg">{d.filters}</h2>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close" className="grid size-11 place-items-center rounded-full hover:bg-surface"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">{panel}</div>
            <div className="flex gap-2 border-t border-line p-4">
              <button type="button" onClick={() => update((p) => [...MULTI, "min", "max", "date", "rating"].forEach((k) => !hide.includes(k) && p.delete(k)))} className="btn btn-outline">{d.clearAll}</button>
              <button type="button" onClick={() => setSheet(false)} className="btn btn-primary flex-1">{d.showResults(total)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect({ locale }: { locale: Locale }) {
  const d = getDict(locale).listing;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{d.sort}</span>
      <select
        value={sp.get("sort") ?? "popular"}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          if (e.target.value === "popular") p.delete("sort");
          else p.set("sort", e.target.value);
          router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
        }}
        className="input h-10 min-h-0 w-auto"
      >
        {Object.entries(d.sorts).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
