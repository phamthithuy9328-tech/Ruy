import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ToursListing, isFiltered } from "@/components/ToursListing";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { locale } = await params;
  const d = getDict(locale);
  return pageMeta({ locale, path: "/tours", title: d.listing.title, description: d.meta.description, noindex: isFiltered(await searchParams) });
}

export default async function ToursPage({ params, searchParams }: P) {
  const { locale } = await params;
  const d = getDict(locale);
  const m = await getMoney(locale);
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.listing.title }]} />
      <h1 className="container-x mb-6 text-[32px]">{d.listing.title}</h1>
      <ToursListing locale={locale} m={m} searchParams={await searchParams} basePath="/tours" />
    </>
  );
}
