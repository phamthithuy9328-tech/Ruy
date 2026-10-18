import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, Star, X } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm } from "@/components/LeadForm";
import { TourCard } from "@/components/TourCard";
import { BookingProvider, type Dep } from "@/components/tour/BookingContext";
import { BookingBox, MobileBookBar } from "@/components/tour/BookingBox";
import { Gallery } from "@/components/tour/Gallery";
import { PriceCalendar } from "@/components/tour/PriceCalendar";
import { TabNav } from "@/components/tour/TabNav";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { arr, type Faq, type Highlight, type ItineraryDay } from "@/lib/json";
import { db } from "@/lib/db";
import { getTour, tourCardInclude } from "@/lib/queries";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { fmtDate, fmtNumber } from "@/lib/format";

type P = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const raw = await getTour(slug);
  if (!raw) return {};
  const t = loc(raw, locale);
  return pageMeta({ locale, path: `/tour/${slug}`, title: t.seoTitle ?? t.title, description: t.seoDesc ?? t.summary, image: (raw.images as string[])[0] });
}

export default async function TourPage({ params }: P) {
  const { locale, slug } = await params;
  const raw = await getTour(slug);
  if (!raw) notFound();
  const d = getDict(locale);
  const T = d.tour;
  const t = loc(raw, locale);
  const dest = loc(raw.destination, locale);
  const m = await getMoney(locale);
  const related = await db.tour.findMany({
    where: { published: true, id: { not: raw.id }, OR: [{ destinationId: raw.destinationId }, { categories: { some: { categoryId: { in: raw.categories.map((c) => c.categoryId) } } } }] },
    orderBy: { popularity: "desc" }, take: 4, include: tourCardInclude,
  });
  const deps: Dep[] = raw.departures.map((x) => ({ id: x.id, date: x.date.toISOString(), adult: x.priceAdult, child: x.priceChild, infant: x.priceInfant, left: x.seatsTotal - x.seatsBooked }));
  const highlights = arr<Highlight>(t.highlights);
  const itinerary = arr<ItineraryDay>(t.itinerary);
  const faqs = arr<Faq>(t.faqs);
  const images = raw.images as string[];
  const onRequest = raw.priceFrom <= 0; // no published price: enquiry instead of online booking
  const hasIncluded = arr(t.includes).length + arr(t.excludes).length > 0;
  const hasReviews = raw.reviewCount > 0 && raw.reviews.length > 0;
  const tabs = [
    { id: "overview", label: T.overview }, { id: "itinerary", label: T.itinerary }, ...(hasIncluded ? [{ id: "included", label: T.included }] : []), ...(onRequest ? [] : [{ id: "dates", label: T.pricing }]),
    { id: "policies", label: T.policies }, ...(hasReviews ? [{ id: "reviews", label: T.reviews }] : []), ...(faqs.length ? [{ id: "faq", label: T.faq }] : []),
  ];
  const sectionCls = "scroll-mt-32 border-b border-line py-8";

  return (
    <BookingProvider initialDep={deps.find((x) => x.left > 0)?.id ?? null}>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: dest.name, href: lp(locale, `/destinations/${raw.destination.slug}`) }, { name: t.title }]} />
      <div className="container-x">
        <Gallery images={images} title={t.title} locale={locale} />
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <header id="overview" className="scroll-mt-32">
              <p className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-primary"><MapPin className="size-4" /> {dest.name}</p>
              <h1 className="mt-2 text-[28px] md:text-[40px]">{t.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {hasReviews && (
                  <a href="#reviews" className="inline-flex items-center gap-1">
                    <Star className="size-4 fill-accent text-accent" /> <b className="text-ink">{fmtNumber(raw.rating, locale, { minimumFractionDigits: 1 })}</b> ({d.card.reviews(raw.reviewCount)})
                  </a>
                )}
                <span className="inline-flex items-center gap-1"><Clock className="size-4" /> {d.durationLabel(raw.days, raw.nights)}</span>
                <span className="inline-flex items-center gap-1"><Icon name={raw.transport} className="size-4" /> {d.transports[raw.transport]}</span>
              </div>
              <p className="mt-4 max-w-[70ch] text-lg">{t.summary}</p>
            </header>
            <div className="mt-6">
              <TabNav tabs={tabs} />
            </div>
            <section className={sectionCls} aria-labelledby="h-highlights">
              <h2 id="h-highlights" className="mb-4 text-2xl">{T.highlights}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li key={h.text} className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name={h.icon} className="size-5" /></span>
                    <span className="pt-1.5 text-ink">{h.text}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section id="itinerary" className={sectionCls}>
              <h2 className="mb-4 text-2xl">{T.itinerary}</h2>
              <ol className="grid gap-2">
                {itinerary.map((day, i) => (
                  <li key={i}>
                    <details open={i === 0} className="rounded-xl border border-line">
                      <summary className="flex items-center gap-3 p-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
                        <span className="flex-1">
                          <span className="block text-xs font-semibold uppercase text-muted">{T.day(i + 1)}</span>
                          <span className="font-semibold text-ink">{day.title}</span>
                        </span>
                        <Icon name="chevron" className="chev size-5 transition" />
                      </summary>
                      <div className="px-4 pb-4 pl-16">
                        <p>{day.description}</p>
                        {day.meals && <p className="mt-2 text-sm text-muted">{T.meals}: {day.meals}</p>}
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            </section>
            {hasIncluded && <section id="included" className={sectionCls}>
              <h2 className="mb-4 text-2xl">{T.included}</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-base">{T.includes}</h3>
                  <ul className="grid gap-2">{arr(t.includes).map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-success" /> {x}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-2 text-base">{T.excludes}</h3>
                  <ul className="grid gap-2">{arr(t.excludes).map((x) => <li key={x} className="flex gap-2"><X className="mt-0.5 size-5 shrink-0 text-danger" /> {x}</li>)}</ul>
                </div>
              </div>
            </section>}
            {!onRequest && (
              <section id="dates" className={sectionCls}>
                <h2 className="mb-4 text-2xl">{T.pricing}</h2>
                <PriceCalendar locale={locale} m={m} base={raw.currency} deps={deps} />
              </section>
            )}
            <section id="policies" className={sectionCls}>
              <h2 className="mb-4 text-2xl">{T.policies}</h2>
              <h3 className="text-base">{T.cancellation}</h3>
              <p className="mt-1 max-w-[70ch]">{t.cancellation}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-base">{T.notes}</h3>
                  <ul className="mt-2 list-disc pl-5">{arr(t.notes).map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-base">{T.packing}</h3>
                  <ul className="mt-2 list-disc pl-5">{arr(t.packing).map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>
              <h3 className="mt-6 text-base">{T.meetingPoint}</h3>
              <p className="mt-1">{t.meetingPoint}</p>
              <iframe title={T.map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(raw.mapQuery)}&output=embed`} className="mt-3 h-64 w-full rounded-xl border border-line" />
            </section>
            {hasReviews && <section id="reviews" className={sectionCls}>
              <h2 className="text-2xl">{T.reviews}</h2>
              <p className="mt-1 flex items-center gap-2 text-muted">
                <Star className="size-5 fill-accent text-accent" /> <b className="text-xl text-ink">{fmtNumber(raw.rating, locale, { minimumFractionDigits: 1 })}</b> · {T.reviewSummary(raw.reviewCount)}
              </p>
              <ul className="mt-4 grid gap-4">
                {raw.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-muted">{fmtDate(r.createdAt, locale)}</p>
                    </div>
                    <p className="mt-1 flex" aria-label={`${r.rating}/5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${i < r.rating ? "fill-accent text-accent" : "text-line"}`} aria-hidden />)}</p>
                    <p className="mt-2">{r.content}</p>
                  </li>
                ))}
              </ul>
            </section>}
            {faqs.length > 0 && (
              <section id="faq" className={sectionCls}>
                <h2 className="mb-4 text-2xl">{T.faq}</h2>
                <div className="grid gap-2">
                  {faqs.map((f) => (
                    <details key={f.q} className="rounded-xl border border-line">
                      <summary className="flex items-center justify-between gap-3 p-4 font-semibold text-ink">{f.q} <Icon name="chevron" className="chev size-5 shrink-0 transition" /></summary>
                      <p className="px-4 pb-4">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {onRequest ? (
              <div id="booking" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                <p className="text-2xl font-bold text-ink">{d.card.onRequest}</p>
                <p className="mt-1 mb-4 text-sm text-muted">{T.onRequestText}</p>
                <LeadForm locale={locale} type="enquiry" tourSlug={raw.slug} compact />
                <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-outline mt-3 w-full">{T.askWhatsapp}</a>
              </div>
            ) : (
              <>
                <BookingBox locale={locale} m={m} base={raw.currency} deps={deps} slug={raw.slug} priceFrom={raw.priceFrom} whatsapp={site.whatsapp} allowHold={raw.allowHold} />
                <div className="mt-4 rounded-2xl border border-line p-5">
                  <h2 className="text-lg">{T.quoteTitle}</h2>
                  <p className="mb-3 text-sm text-muted">{T.quoteText}</p>
                  <LeadForm locale={locale} type="enquiry" tourSlug={raw.slug} compact />
                </div>
              </>
            )}
          </aside>
        </div>
        {related.length > 0 && (
          <section className="py-10">
            <h2 className="mb-6 text-2xl">{T.related}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((r) => <li key={r.slug}><TourCard tour={r} locale={locale} m={m} /></li>)}</ul>
          </section>
        )}
      </div>
      <MobileBookBar locale={locale} m={m} base={raw.currency} priceFrom={raw.priceFrom} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["Product", "TouristTrip"],
          name: t.title,
          description: t.summary,
          image: images.map((i) => (i.startsWith("http") ? i : site.url + i)),
          touristType: d.transports[raw.transport],
          itinerary: { "@type": "ItemList", itemListElement: itinerary.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.title })) },
          ...(hasReviews ? { aggregateRating: { "@type": "AggregateRating", ratingValue: raw.rating, reviewCount: raw.reviewCount } } : {}),
          ...(onRequest ? {} : { offers: { "@type": "Offer", price: raw.priceFrom, priceCurrency: raw.currency, availability: deps.some((x) => x.left > 0) ? "https://schema.org/InStock" : "https://schema.org/SoldOut", url: site.url + lp(locale, `/tour/${raw.slug}`) } }),
          provider: { "@type": "TravelAgency", name: site.name, url: site.url },
        }}
      />
      {faqs.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
    </BookingProvider>
  );
}
