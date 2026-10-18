import Link from "next/link";
import Image from "next/image";
import { Clock, Star } from "lucide-react";
import { WishlistButton } from "./WishlistButton";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { money, type Money } from "@/lib/currency";
import { fmtShort, fmtNumber } from "@/lib/format";
import { badgeClass } from "@/lib/taxonomy";
import type { TourCardData } from "@/lib/queries";

export function TourCard({ tour: raw, locale, m, priority = false }: { tour: TourCardData; locale: Locale; m: Money; priority?: boolean }) {
  const d = getDict(locale);
  const tour = loc(raw, locale);
  const dest = loc(raw.destination, locale);
  const img = (raw.images as string[])[0];
  const href = lp(locale, `/tour/${raw.slug}`);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition duration-200 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-within:-translate-y-1 focus-within:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <Image src={img} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" priority={priority} unoptimized className="object-cover transition duration-300 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]" />
        {raw.badge && <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass[raw.badge]}`}>{d.badges[raw.badge as keyof typeof d.badges]}</span>}
        <div className="absolute right-3 top-3">
          <WishlistButton slug={raw.slug} label={d.card.wishlist} />
        </div>
        {raw.departures.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink/85 to-ink/0 p-3 pt-8 text-white opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="text-xs font-medium text-white/80">{d.card.next}</p>
            <p className="text-sm font-semibold">{raw.departures.map((x) => fmtShort(x.date, locale)).join(" · ")}</p>
            <span className="mt-2 inline-block rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ink">{d.card.details}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{dest.name}</p>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 focus:outline-none">
            {tour.title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden /> {d.durationLabel(raw.days, raw.nights)}
          </span>
          {raw.reviewCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-4 fill-accent text-accent" aria-hidden />
              <span className="font-semibold text-ink">{fmtNumber(raw.rating, locale, { minimumFractionDigits: 1 })}</span> ({fmtNumber(raw.reviewCount, locale)})
            </span>
          )}
        </div>
        <div className="mt-auto pt-2">
          {raw.priceFrom > 0 ? (
            <>
              <p className="text-xs text-muted">{d.card.from}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-ink">{money(raw.priceFrom, raw.currency, m)}</span>
                {raw.originalPrice && <span className="text-sm text-muted line-through">{money(raw.originalPrice, raw.currency, m)}</span>}
              </p>
            </>
          ) : (
            <p className="text-base font-bold text-ink">{d.card.onRequest}</p>
          )}
        </div>
      </div>
    </article>
  );
}
