import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PostCard } from "@/components/PostCard";
import { Icon } from "@/components/Icon";
import { ToursListing, isFiltered } from "@/components/ToursListing";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getPosts } from "@/lib/queries";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const get = (slug: string) => db.category.findUnique({ where: { slug }, include: { tours: { select: { tour: { select: { destination: { select: { slug: true } } } } } } } });

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const raw = await get(slug);
  if (!raw) return {};
  const c = loc(raw, locale);
  return pageMeta({ locale, path: `/tour-types/${slug}`, title: c.name, description: c.description, noindex: isFiltered(await searchParams) });
}

export default async function TourTypePage({ params, searchParams }: P) {
  const { locale, slug } = await params;
  const raw = await get(slug);
  if (!raw) notFound();
  const c = loc(raw, locale);
  const d = getDict(locale);
  const destSlugs = [...new Set(raw.tours.map((t) => t.tour.destination.slug))];
  const [m, posts] = await Promise.all([getMoney(locale), getPosts({ destinationSlug: { in: destSlugs } }, 3)]);
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.nav.tourTypes, href: lp(locale, "/tours") }, { name: c.name }]} />
      <header className="container-x mb-8 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name={raw.icon} className="size-7" /></span>
        <div>
          <h1 className="text-[32px]">{c.name}</h1>
          <p className="mt-1 text-muted">{c.description}</p>
        </div>
      </header>
      <ToursListing locale={locale} m={m} searchParams={await searchParams} fixed={{ cat: [slug] }} basePath={`/tour-types/${slug}`} />
      {posts.length > 0 && (
        <section className="container-x py-10">
          <h2 className="mb-6 text-2xl">{d.blog.title}</h2>
          <div className="grid gap-4 md:grid-cols-3">{posts.map((p) => <PostCard key={p.slug} post={p} locale={locale} />)}</div>
        </section>
      )}
    </>
  );
}
