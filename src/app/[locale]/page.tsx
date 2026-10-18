import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { TourCard } from "@/components/TourCard";
import { DestinationTile } from "@/components/DestinationTile";
import { PostCard } from "@/components/PostCard";
import { Section } from "@/components/Section";
import { Icon } from "@/components/Icon";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getDestinations, getPosts, tourCardInclude } from "@/lib/queries";
import { getMoney } from "@/lib/request";
import { durationSlugs } from "@/lib/taxonomy";
import { fmtNumber } from "@/lib/format";
import { site } from "@/lib/site";
import { getSetting } from "@/lib/settings";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDict(locale);
  const h = d.home;
  const [m, dests, best, posts, reviews, stats, durCounts, home] = await Promise.all([
    getMoney(locale),
    getDestinations(),
    db.tour.findMany({ where: { published: true }, orderBy: { popularity: "desc" }, take: 8, include: tourCardInclude }),
    getPosts({}, 3),
    db.review.findMany({ where: { approved: true, rating: 5 }, orderBy: { createdAt: "desc" }, take: 30, include: { tour: { select: { slug: true, title: true, tr: true } } } }),
    db.tour.aggregate({ where: { published: true, reviewCount: { gt: 0 } }, _sum: { reviewCount: true }, _avg: { rating: true } }),
    db.tour.groupBy({ by: ["durationSlug"], where: { published: true }, _count: true }),
    getSetting("home", { heroImage: "/images/hero-1.svg" }),
  ]);
  const shownReviews = reviews.filter((r, i, all) => all.findIndex((x) => x.content === r.content) === i).slice(0, 3);
  const featured = dests.filter((x) => x.featured && x._count.tours > 0).slice(0, 7);
  const topByDest = await db.tour.findMany({ where: { published: true, destinationId: { in: featured.map((f) => f.id) } }, orderBy: { popularity: "desc" }, select: { slug: true, title: true, tr: true, destinationId: true } });
  const chips: { label: string; href: string }[] = [
    { label: d.durations["day-trip"].name, href: "/duration/day-trip" },
    { label: d.durations["2-days"].name, href: "/duration/2-days" },
    { label: d.durations["3-days"].name, href: "/duration/3-days" },
    ...["beach-islands", "trekking-adventure", "food-culture", "cruises", "private-tours"].map((slug) => ({ label: "", href: `/tour-types/${slug}`, slug })),
  ].map((c) => c);
  const cats = await db.category.findMany({ where: { slug: { in: ["beach-islands", "trekking-adventure", "food-culture", "cruises", "private-tours"] } } });
  for (const c of chips) if (!c.label) c.label = loc(cats.find((x) => c.href.endsWith(x.slug))!, locale).name;

  return (
    <>
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden">
        <Image src={home.heroImage} alt="" fill priority unoptimized sizes="100vw" className="hero-zoom -z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/65" />
        <div className="container-x flex min-h-[560px] flex-col items-center justify-center py-20 text-center md:min-h-[620px]">
          <h1 className="max-w-3xl text-[32px] text-white md:text-5xl">{h.heroTitle}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">{h.heroSubtitle}</p>
          <form action={lp(locale, "/tours")} method="get" className="mt-8 grid w-full max-w-4xl gap-2 rounded-2xl bg-white p-2 text-left shadow-[var(--shadow-lift)] md:grid-cols-[1.6fr_1fr_0.8fr_auto]">
            <div className="rounded-xl px-1 md:border-r md:border-line">
              <span className="block px-3 pt-2 text-xs font-semibold text-ink">{h.where}</span>
              <SearchBox locale={locale} m={m} variant="hero" name="q" popular={featured.slice(0, 5).map((x) => ({ name: loc(x, locale).name, url: lp(locale, `/destinations/${x.slug}`) }))} />
            </div>
            <label className="block rounded-xl px-4 pt-2 md:border-r md:border-line">
              <span className="block text-xs font-semibold text-ink">{h.when}</span>
              <input type="date" name="date" className="h-12 w-full bg-transparent text-ink focus:outline-none" />
            </label>
            <label className="block rounded-xl px-4 pt-2">
              <span className="block text-xs font-semibold text-ink">{h.guests}</span>
              <select name="guests" defaultValue="2" className="h-12 w-full bg-transparent text-ink focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary h-14 px-8 text-base">{h.find}</button>
          </form>
        </div>
      </section>

      {/* 2. Quick chips */}
      <nav aria-label={h.chips} className="border-b border-line">
        <ul className="container-x no-scrollbar flex gap-2 overflow-x-auto py-4">
          {chips.map((c) => (
            <li key={c.href} className="shrink-0">
              <Link href={lp(locale, c.href)} className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-primary hover:text-primary">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 3. Top destinations */}
      <Section title={h.topDestinations} sub={h.topDestinationsSub} more={{ href: lp(locale, "/tours"), label: d.nav.viewAll }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2">
          {featured.map((x, i) => (
            <DestinationTile key={x.slug} dest={x} locale={locale} large={i === 0} topTours={topByDest.filter((t) => t.destinationId === x.id).slice(0, 3)} />
          ))}
        </div>
      </Section>

      {/* 4. Best sellers */}
      <Section title={h.bestSellers} sub={h.bestSellersSub} more={{ href: lp(locale, "/tours"), label: d.nav.viewAll }}>
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {best.map((t) => (
            <li key={t.slug} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-12px)]">
              <TourCard tour={t} locale={locale} m={m} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 5. By duration */}
      <Section title={h.byDuration} sub={h.byDurationSub}>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {durationSlugs.map((s) => (
            <li key={s}>
              <Link href={lp(locale, `/duration/${s}`)} className="block h-full rounded-[var(--radius-card)] border border-line p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-card)]">
                <span className="block text-lg font-bold text-ink">{d.durations[s].name}</span>
                <span className="mt-1 block text-sm text-muted">{d.durations[s].desc}</span>
                <span className="mt-3 block text-sm font-semibold text-primary">{d.nav.toursCount(durCounts.find((x) => x.durationSlug === s)?._count ?? 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. Why AmGo */}
      <section className="bg-surface">
        <Section title={h.why}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {h.whyItems.map((w) => (
              <li key={w.title}>
                <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={w.icon} className="size-6" />
                </span>
                <h3 className="mt-4 text-lg">{w.title}</h3>
                <p className="mt-1 text-sm">{w.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      </section>

      {/* 7. Reviews (only once real reviews are approved) */}
      {shownReviews.length > 0 && <Section title={h.reviews} sub={h.reviewsSub(fmtNumber(stats._avg.rating ?? 0, locale, { maximumFractionDigits: 1 }), fmtNumber(stats._sum.reviewCount ?? 0, locale))}>
        <ul className="grid gap-4 md:grid-cols-3">
          {shownReviews.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line p-5">
              <p className="flex gap-0.5" aria-label={`${r.rating}/5`}>
                {Array.from({ length: r.rating }, (_, i) => (
                  <Star key={i} className="size-4 fill-accent text-accent" aria-hidden />
                ))}
              </p>
              <blockquote className="mt-3 text-ink">“{r.content}”</blockquote>
              <p className="mt-4 text-sm font-semibold text-ink">{r.name}</p>
              <Link href={lp(locale, `/tour/${r.tour.slug}`)} className="line-clamp-1 text-sm text-muted hover:text-primary">{loc(r.tour, locale).title}</Link>
            </li>
          ))}
        </ul>
      </Section>}

      {/* 8. Travel guides */}
      {posts.length > 0 && <Section title={h.guides} sub={h.guidesSub} more={{ href: lp(locale, "/blog"), label: d.nav.viewAll }}>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} locale={locale} />
          ))}
        </div>
      </Section>}

      {/* 9. CTA */}
      <section className="container-x pb-4">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-primary p-8 text-white md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl text-white">{h.ctaTitle}</h2>
            <p className="mt-2 max-w-xl text-white/85">{h.ctaText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={site.whatsapp} target="_blank" rel="noopener" className="btn bg-white text-primary hover:bg-primary-soft">{h.ctaWhatsapp}</a>
            <a href={`tel:${site.hotlineTel}`} className="btn border border-white/40 text-white hover:bg-white/10">{h.ctaCall(site.hotline)}</a>
          </div>
        </div>
      </section>
    </>
  );
}
