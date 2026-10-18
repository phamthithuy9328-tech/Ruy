"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Clock, MapPin, Search, X } from "lucide-react";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { money, type Money } from "@/lib/currency";
import type { SearchHit } from "@/lib/search";

type Results = { destinations: SearchHit[]; tours: SearchHit[]; posts: SearchHit[] };
const RECENT = "amgo_recent_searches";

type Props = {
  locale: Locale; m: Money; popular: { name: string; url: string }[];
  autoFocus?: boolean; variant?: "hero" | "overlay"; name?: string; onNavigate?: () => void; defaultValue?: string;
};

export function SearchBox({ locale, m, popular, autoFocus, variant = "overlay", name, onNavigate, defaultValue = "" }: Props) {
  const d = getDict(locale).search;
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Results | null>(null);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT) ?? "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setRes(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`, { signal: ctrl.signal });
        if (r.ok) setRes(await r.json());
      } catch {}
      setLoading(false);
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, locale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Flat list of options for keyboard navigation
  const options = useMemo(() => {
    if (q.trim() && res) return [...res.destinations, ...res.tours, ...res.posts].map((h) => ({ label: h.title, url: h.url }));
    return [...recent.map((r) => ({ label: r, url: `${lp(locale, "/tours")}?q=${encodeURIComponent(r)}` })), ...popular.map((p) => ({ label: p.name, url: p.url }))];
  }, [q, res, recent, popular, locale]);

  function remember(term: string) {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT, JSON.stringify(next));
    } catch {}
  }

  function go(url: string) {
    if (q.trim()) remember(q.trim());
    setOpen(false);
    onNavigate?.();
    router.push(url);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      if (variant === "hero" && active < 0) return; // let the hero form submit with dates/guests
      e.preventDefault();
      if (active >= 0 && options[active]) go(options[active].url);
      else if (q.trim()) go(`${lp(locale, "/tours")}?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
      onNavigate?.();
    }
  }

  let idx = -1;
  const opt = (url: string, children: React.ReactNode, key: string) => {
    idx++;
    const i = idx;
    return (
      <li key={key} id={`${id}-o${i}`} role="option" aria-selected={active === i}>
        <button
          type="button"
          onMouseEnter={() => setActive(i)}
          onClick={() => go(url)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${active === i ? "bg-surface" : ""}`}
        >
          {children}
        </button>
      </li>
    );
  };
  const group = (title: string, items: React.ReactNode[]) =>
    items.length > 0 && (
      <div className="py-1">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <ul>{items}</ul>
      </div>
    );

  const empty = q.trim() && res && !res.destinations.length && !res.tours.length && !res.posts.length;

  return (
    <div ref={wrap} className="relative w-full">
      <label htmlFor={`${id}-in`} className="sr-only">
        {d.placeholder}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id={`${id}-in`}
          name={name}
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
          placeholder={variant === "hero" ? getDict(locale).home.wherePlaceholder : d.placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKey}
          className={`w-full rounded-[var(--radius-ctl)] bg-white pl-10 pr-10 text-ink placeholder:text-muted focus:outline-none ${variant === "hero" ? "h-12 border-0" : "h-12 border border-line focus:border-primary"}`}
        />
        {q && (
          <button type="button" aria-label={d.clear} onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface">
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <div id={`${id}-list`} role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-xl border border-line bg-white p-2 text-left shadow-[var(--shadow-lift)]">
          {!q.trim() && (
            <>
              {group(d.recent, recent.map((r) => opt(`${lp(locale, "/tours")}?q=${encodeURIComponent(r)}`, <><Clock className="size-4 text-muted" aria-hidden /><span className="text-ink">{r}</span></>, `r-${r}`)))}
              {group(d.popular, popular.map((p) => opt(p.url, <><MapPin className="size-4 text-primary" aria-hidden /><span className="text-ink">{p.name}</span></>, `p-${p.url}`)))}
            </>
          )}
          {q.trim() && loading && !res && <p className="px-3 py-3 text-sm text-muted">{d.loading}</p>}
          {res && q.trim() && (
            <>
              {group(d.destinations, res.destinations.map((h) => opt(h.url, <><MapPin className="size-4 text-primary" aria-hidden /><span className="font-medium text-ink">{h.title}</span><span className="ml-auto text-xs text-muted">{h.meta && getDict(locale).nav.toursCount(Number(h.meta))}</span></>, h.url)))}
              {group(d.tours, res.tours.map((h) => opt(h.url, <><Image src={h.image} alt="" width={48} height={36} unoptimized className="h-9 w-12 shrink-0 rounded object-cover" /><span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-medium text-ink">{h.title}</span><span className="text-xs text-muted">{h.meta}</span></span>{h.price != null && <span className="shrink-0 text-sm font-semibold text-ink">{money(h.price, h.currency!, m)}</span>}</>, h.url)))}
              {group(d.posts, res.posts.map((h) => opt(h.url, <span className="line-clamp-1 text-sm text-ink">{h.title}</span>, h.url)))}
              {empty && <p className="px-3 py-3 text-sm text-muted">{d.noResults(q)}</p>}
              <button type="button" onClick={() => go(`${lp(locale, "/tours")}?q=${encodeURIComponent(q.trim())}`)} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-surface">
                {d.seeAll(q.trim())} →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
