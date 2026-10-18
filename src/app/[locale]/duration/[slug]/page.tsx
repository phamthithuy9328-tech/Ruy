import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToursListing, isFiltered } from "@/components/ToursListing";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";
import { durationSlugs } from "@/lib/taxonomy";

type P = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const x = getDict(locale).durations[slug];
  if (!x) return {};
  return pageMeta({ locale, path: `/duration/${slug}`, title: `${x.name} · ${getDict(locale).listing.title}`, description: x.desc, noindex: isFiltered(await searchParams) });
}

export default async function DurationPage({ params, searchParams }: P) {
  const { locale, slug } = await params;
  if (!(durationSlugs as readonly string[]).includes(slug)) notFound();
  const d = getDict(locale);
  const x = d.durations[slug];
  const m = await getMoney(locale);
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.nav.duration, href: lp(locale, "/tours") }, { name: x.name }]} />
      <header className="container-x mb-8">
        <h1 className="text-[32px]">{x.name}</h1>
        <p className="mt-1 text-muted">{x.desc}</p>
      </header>
      <ToursListing locale={locale} m={m} searchParams={await searchParams} fixed={{ dur: [slug] }} basePath={`/duration/${slug}`} />
    </>
  );
}
