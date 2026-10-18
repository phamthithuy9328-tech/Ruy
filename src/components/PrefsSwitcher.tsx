"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { getDict } from "@/i18n";
import { defaultLocale, localeNames, locales, lp, type Locale } from "@/i18n/config";
import { currencies, currencyNames } from "@/lib/currency";

const setCookie = (k: string, v: string) => (document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`);

/** Strip the locale prefix from the current path so we can re-prefix it */
export function barePath(pathname: string) {
  const seg = pathname.split("/")[1];
  return (locales as readonly string[]).includes(seg) && seg !== defaultLocale ? pathname.slice(seg.length + 1) || "/" : pathname;
}

export function PrefsSwitcher({ locale, currency, enabled }: { locale: Locale; currency: string; enabled?: string[] }) {
  const d = getDict(locale).prefs;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Locale>(locale);
  const [cur, setCur] = useState(currency);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function save() {
    setCookie("cur", cur);
    setCookie("lang_pref", lang);
    setCookie("lang_suggest", lang); // explicit choice: stop suggesting
    setOpen(false);
    const target = lp(lang, barePath(pathname)) + window.location.search;
    if (lang !== locale) router.push(target);
    else router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={d.title} className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-sm font-medium text-ink hover:bg-surface sm:px-3">
        <Globe className="size-4" aria-hidden /> {locale.toUpperCase()} · {currency}
      </button>
      {open && (
        <div role="dialog" aria-label={d.title} className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-lift)]">
          <p className="mb-3 font-semibold text-ink">{d.title}</p>
          <label className="label" htmlFor="pref-lang">{d.language}</label>
          <select id="pref-lang" className="input mb-3" value={lang} onChange={(e) => setLang(e.target.value as Locale)}>
            {locales.map((l) => (
              <option key={l} value={l}>{localeNames[l]}</option>
            ))}
          </select>
          <label className="label" htmlFor="pref-cur">{d.currency}</label>
          <select id="pref-cur" className="input mb-4" value={cur} onChange={(e) => setCur(e.target.value)}>
            {currencies.filter((c) => !enabled || enabled.includes(c) || c === currency).map((c) => (
              <option key={c} value={c}>{c} · {currencyNames[c]}</option>
            ))}
          </select>
          <button type="button" onClick={save} className="btn btn-primary w-full">{d.save}</button>
        </div>
      )}
    </div>
  );
}
