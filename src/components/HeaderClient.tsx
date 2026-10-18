"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, MessageCircle, Search, X } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { PrefsSwitcher } from "./PrefsSwitcher";
import { Icon } from "./Icon";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { durationSlugs, regionSlugs } from "@/lib/taxonomy";
import type { Money } from "@/lib/currency";

export type NavData = {
  destinations: { name: string; url: string; region: string; count: number }[];
  categories: { name: string; url: string; group: string; icon: string }[];
  featured: { title: string; url: string; image: string }[];
};

type Menu = "destinations" | "types" | "duration" | null;

export function HeaderClient({ locale, m, nav, hotline, hotlineTel, whatsapp }: { locale: Locale; m: Money; nav: NavData; hotline: string; hotlineTel: string; whatsapp: string }) {
  const d = getDict(locale);
  const [menu, setMenu] = useState<Menu>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 240);
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setMenu(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile || search ? "hidden" : "";
  }, [mobile, search]);

  // 150ms open delay avoids flicker when the pointer just passes over the nav
  const enter = (k: Menu) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenu(k), 150);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenu(null), 150);
  };

  const popular = nav.destinations.slice(0, 5).map((x) => ({ name: x.name, url: x.url }));
  const trigger = (k: Exclude<Menu, null>, label: string) => (
    <button
      type="button"
      aria-expanded={menu === k}
      aria-haspopup="true"
      onClick={() => setMenu(menu === k ? null : k)}
      className={`inline-flex h-16 items-center gap-1 px-3 text-sm font-medium ${menu === k ? "text-primary" : "text-ink hover:text-primary"}`}
    >
      {label} <ChevronDown className={`size-4 transition ${menu === k ? "rotate-180" : ""}`} aria-hidden />
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center gap-2">
        <Link href={lp(locale, "/")} className="mr-2 flex shrink-0 items-center gap-2 text-lg font-bold text-ink" aria-label="AmGo Travel">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-white">A</span>
          <span>
            AmGo<span className="text-primary"> Travel</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block" onMouseLeave={leave}>
          <ul className="flex items-center">
            <li onMouseEnter={() => enter("destinations")}>{trigger("destinations", d.nav.destinations)}</li>
            <li onMouseEnter={() => enter("types")}>{trigger("types", d.nav.tourTypes)}</li>
            <li onMouseEnter={() => enter("duration")}>{trigger("duration", d.nav.duration)}</li>
            <li onMouseEnter={leave}>
              <Link href={lp(locale, "/blog")} className="inline-flex h-16 items-center px-3 text-sm font-medium text-ink hover:text-primary">
                {d.nav.guides}
              </Link>
            </li>
            <li onMouseEnter={leave}>
              <Link href={lp(locale, "/contact")} className="inline-flex h-16 items-center px-3 text-sm font-medium text-ink hover:text-primary">
                {d.nav.contact}
              </Link>
            </li>
          </ul>

          {menu && (
            <div className="absolute inset-x-0 top-16 border-b border-line bg-white shadow-[var(--shadow-card)]" onMouseEnter={() => clearTimeout(timer.current)}>
              <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_280px]">
                {menu === "destinations" && (
                  <div className="grid grid-cols-3 gap-8">
                    {regionSlugs.map((r) => {
                      const items = nav.destinations.filter((x) => x.region === r);
                      if (!items.length) return null;
                      return (
                        <div key={r}>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{d.nav.regions[r]}</p>
                          <ul className="grid gap-2">
                            {items.map((x) => (
                              <li key={x.url}>
                                <Link href={x.url} onClick={() => setMenu(null)} className="flex items-baseline justify-between gap-2 text-sm text-ink hover:text-primary">
                                  {x.name} <span className="text-xs text-muted">{x.count}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
                {menu === "types" && (
                  <div className="grid grid-cols-2 gap-8">
                    {(["type", "theme"] as const).map((g) => (
                      <ul key={g} className="grid content-start gap-1">
                        {nav.categories.filter((c) => c.group === g).map((c) => (
                          <li key={c.url}>
                            <Link href={c.url} onClick={() => setMenu(null)} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink hover:bg-surface hover:text-primary">
                              <Icon name={c.icon} className="size-5 text-primary" /> {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                )}
                {menu === "duration" && (
                  <ul className="grid grid-cols-5 gap-3">
                    {durationSlugs.map((s) => (
                      <li key={s}>
                        <Link href={lp(locale, `/duration/${s}`)} onClick={() => setMenu(null)} className="block rounded-xl border border-line p-4 hover:border-primary">
                          <span className="block font-semibold text-ink">{d.durations[s].name}</span>
                          <span className="text-sm text-muted">{d.durations[s].desc}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {nav.featured[0] && menu !== "duration" && (
                  <Link href={nav.featured[0].url} onClick={() => setMenu(null)} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                      <Image src={nav.featured[0].image} alt="" fill unoptimized className="object-cover transition group-hover:scale-[1.03]" sizes="280px" />
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent-text">{d.nav.featured}</p>
                    <p className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-primary">{nav.featured[0].title}</p>
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setSearch(true)} aria-label={d.nav.search} title={d.search.hint} className={`grid size-11 place-items-center rounded-full text-ink hover:bg-surface ${scrolled ? "" : "lg:hidden"}`}>
            <Search className="size-5" />
          </button>
          <PrefsSwitcher locale={locale} currency={m.currency} enabled={m.fx.enabled} />
          <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-primary hidden h-10 min-h-0 px-4 text-sm md:inline-flex">
            <MessageCircle className="size-4" aria-hidden /> {d.nav.whatsapp}
          </a>
          <button type="button" onClick={() => setMobile(true)} aria-label={d.nav.menu} className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface lg:hidden">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {search && (
        <div className="fixed inset-0 z-50 bg-ink/40" onClick={() => setSearch(false)}>
          <div className="h-full bg-white p-4 sm:mx-auto sm:mt-20 sm:h-auto sm:max-w-2xl sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={d.nav.search}>
            <div className="flex items-center gap-2">
              <SearchBox locale={locale} m={m} popular={popular} autoFocus onNavigate={() => setSearch(false)} />
              <button type="button" onClick={() => setSearch(false)} aria-label={d.nav.close} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface">
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {mobile && (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setMobile(false)}>
          <div className="ml-auto flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={d.nav.menu}>
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="font-bold text-ink">{d.nav.menu}</span>
              <button type="button" onClick={() => setMobile(false)} aria-label={d.nav.close} className="grid size-11 place-items-center rounded-full hover:bg-surface">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-2" onClick={(e) => (e.target as HTMLElement).closest("a") && setMobile(false)}>
              <details className="border-b border-line">
                <summary className="flex min-h-12 items-center justify-between px-2 font-medium text-ink">
                  {d.nav.destinations} <ChevronDown className="chev size-4 transition" />
                </summary>
                {regionSlugs.map((r) => {
                  const items = nav.destinations.filter((x) => x.region === r);
                  return items.length ? (
                    <div key={r} className="px-2 pb-3">
                      <p className="py-1 text-xs font-semibold uppercase text-muted">{d.nav.regions[r]}</p>
                      {items.map((x) => (
                        <Link key={x.url} href={x.url} className="flex min-h-11 items-center text-ink">
                          {x.name}
                        </Link>
                      ))}
                    </div>
                  ) : null;
                })}
              </details>
              <details className="border-b border-line">
                <summary className="flex min-h-12 items-center justify-between px-2 font-medium text-ink">
                  {d.nav.tourTypes} <ChevronDown className="chev size-4 transition" />
                </summary>
                <div className="px-2 pb-3">
                  {nav.categories.map((c) => (
                    <Link key={c.url} href={c.url} className="flex min-h-11 items-center gap-3 text-ink">
                      <Icon name={c.icon} className="size-5 text-primary" /> {c.name}
                    </Link>
                  ))}
                </div>
              </details>
              <details className="border-b border-line">
                <summary className="flex min-h-12 items-center justify-between px-2 font-medium text-ink">
                  {d.nav.duration} <ChevronDown className="chev size-4 transition" />
                </summary>
                <div className="px-2 pb-3">
                  {durationSlugs.map((s) => (
                    <Link key={s} href={lp(locale, `/duration/${s}`)} className="flex min-h-11 items-center text-ink">
                      {d.durations[s].name}
                    </Link>
                  ))}
                </div>
              </details>
              <Link href={lp(locale, "/tours")} className="flex min-h-12 items-center border-b border-line px-2 font-medium text-ink">{d.nav.allTours}</Link>
              <Link href={lp(locale, "/blog")} className="flex min-h-12 items-center border-b border-line px-2 font-medium text-ink">{d.nav.guides}</Link>
              <Link href={lp(locale, "/contact")} className="flex min-h-12 items-center border-b border-line px-2 font-medium text-ink">{d.nav.contact}</Link>
              <Link href={lp(locale, "/manage-booking")} className="flex min-h-12 items-center px-2 font-medium text-ink">{d.footer.links.manage}</Link>
            </nav>
            <div className="grid gap-2 border-t border-line p-4">
              <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-primary">
                <MessageCircle className="size-4" /> {d.nav.whatsapp}
              </a>
              <a href={`tel:${hotlineTel}`} className="btn btn-outline">
                {d.nav.callUs}: {hotline}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
