import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PostCard } from "@/components/PostCard";
import { ToursListing, isFiltered } from "@/components/ToursListing";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getPosts } from "@/lib/queries";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const get = (slug: string) => db.destination.findUnique({ where: { slug } });

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const raw = await get(slug);
  if (!raw) return {};
  const x = loc(raw, locale);
  const d = getDict(locale);
  return pageMeta({ locale, path: `/destinations/${slug}`, title: x.seoTitle ?? d.pages.destinationTours(x.name), description: x.seoDesc ?? x.description, image: raw.image, noindex: isFiltered(await searchParams) });
}

export default async function DestinationPage({ params, searchParams }: P) {
  const { locale, slug } = await params;
  const raw = await get(slug);
  if (!raw) notFound();
  const x = loc(raw, locale);
  const d = getDict(locale);
  const [m, posts] = await Promise.all([getMoney(locale), getPosts({ destinationSlug: slug }, 3)]);
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image src={raw.image} alt="" fill priority unoptimized sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-ink/50" />
        <div className="container-x py-16 text-white md:py-24">
          <h1 className="text-[32px] text-white md:text-5xl">{d.pages.destinationTours(x.name)}</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">{x.description}</p>
        </div>
      </section>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.nav.destinations, href: lp(locale, "/tours") }, { name: x.name }]} />
      <ToursListing locale={locale} m={m} searchParams={await searchParams} fixed={{ dest: [slug] }} basePath={`/destinations/${slug}`} />
      {posts.length > 0 && (
        <section className="container-x py-10">
          <h2 className="mb-6 text-2xl">{d.pages.destinationGuides(x.name)}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
