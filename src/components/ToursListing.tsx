import Link from "next/link";
import { Suspense } from "react";
import { TourCard } from "./TourCard";
import { SortSelect, TourFilters, type FilterOptions } from "./TourFilters";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { findTours, getCategories, getDestinations, parseFilters, type TourFilters as F } from "@/lib/queries";
import { convert, type Money } from "@/lib/currency";
import { durationSlugs, transportSlugs } from "@/lib/taxonomy";

type Props = { locale: Locale; m: Money; searchParams: Record<string, string | string[] | undefined>; fixed?: Partial<F>; basePath: string };

/** Shared listing: /tours, destination, tour-type and duration pages */
export async function ToursListing({ locale, m, searchParams, fixed = {}, basePath }: Props) {
  const d = getDict(locale);
  const f = { ...parseFilters(searchParams), ...Object.fromEntries(Object.entries(fixed).filter(([, v]) => v !== undefined)) } as F;
  // Facet counts come from the page's base set (e.g. all Ha Giang tours), not the whole catalog
  const [tours, all, dests, cats] = await Promise.all([findTours(f, m.fx), findTours(fixed as F, m.fx), getDestinations(), getCategories()]);
  const maxUsd = Math.ceil(Math.max(100, ...all.map((t) => convert(t.priceFrom, t.currency, "USD", m.fx, false))) / 100) * 100;
  const options: FilterOptions = {
    dest: dests.map((x) => ({ value: x.slug, label: loc(x, locale).name, count: all.filter((t) => t.destinationId === x.id).length })).filter((o) => o.count),
    dur: durationSlugs.map((s) => ({ value: s, label: d.durations[s].name, count: all.filter((t) => t.durationSlug === s).length })).filter((o) => o.count),
    cat: cats.map((c) => ({ value: c.slug, label: loc(c, locale).name, count: all.filter((t) => t.categories.some((x) => x.category.slug === c.slug)).length })).filter((o) => o.count),
    transport: transportSlugs.map((s) => ({ value: s, label: d.transports[s], count: all.filter((t) => t.transport === s).length })).filter((o) => o.count),
    maxUsd,
  };
  const hide = [...Object.keys(fixed), ...(all.some((t) => t.reviewCount > 0) ? [] : ["rating"])];
  return (
    <div className="container-x grid gap-8 pb-8 lg:grid-cols-[260px_1fr]">
      <Suspense>
        <TourFilters locale={locale} m={m} options={options} hide={hide} total={tours.length} />
      </Suspense>
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium text-ink" aria-live="polite">{d.listing.results(tours.length)}{f.q ? ` · “${f.q}”` : ""}</p>
          <Suspense>
            <SortSelect locale={locale} />
          </Suspense>
        </div>
        {tours.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tours.map((t, i) => (
              <li key={t.slug}>
                <TourCard tour={t} locale={locale} m={m} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <p className="text-ink">{d.listing.empty}</p>
            <Link href={lp(locale, basePath)} className="btn btn-outline mt-4">{d.listing.emptyCta}</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Deep filter combinations are noindex (canonical points at the clean page) */
export const isFiltered = (sp: Record<string, unknown>) => Object.keys(sp).some((k) => k !== "sort");
