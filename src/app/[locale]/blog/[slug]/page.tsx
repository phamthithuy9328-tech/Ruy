// /blog/[slug] serves both category pages (/blog/food) and posts (/blog/what-to-eat-in-hoi-an)
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PostCard } from "@/components/PostCard";
import { TourCard } from "@/components/TourCard";
import { BlogHeader } from "@/components/BlogHeader";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { fmtDate, readingTime } from "@/lib/format";
import { Markdown, parse } from "@/lib/markdown";
import { getPosts, tourCardInclude } from "@/lib/queries";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { postCategorySlugs } from "@/lib/taxonomy";

type P = { params: Promise<{ locale: Locale; slug: string }> };
const isCategory = (s: string) => (postCategorySlugs as readonly string[]).includes(s);
const getPost = (slug: string) => db.post.findFirst({ where: { slug, published: true, publishedAt: { lte: new Date() } } });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = getDict(locale).blog;
  if (isCategory(slug)) return pageMeta({ locale, path: `/blog/${slug}`, title: `${d.categories[slug]} · ${d.title}`, description: d.subtitle });
  const raw = await getPost(slug);
  if (!raw) return {};
  const p = loc(raw, locale);
  return pageMeta({ locale, path: `/blog/${slug}`, title: p.seoTitle ?? p.title, description: p.seoDesc ?? p.excerpt, image: raw.image, type: "article" });
}

export default async function BlogSlug({ params }: P) {
  const { locale, slug } = await params;
  const d = getDict(locale);

  if (isCategory(slug)) {
    const posts = await getPosts({ category: slug });
    return (
      <>
        <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.blog.title, href: lp(locale, "/blog") }, { name: d.blog.categories[slug] }]} />
        <h1 className="container-x mb-6 text-[32px]">{d.blog.categories[slug]}</h1>
        <BlogHeader locale={locale} active={slug} />
        <div className="container-x grid gap-4 pb-8 md:grid-cols-3">{posts.map((p) => <PostCard key={p.slug} post={p} locale={locale} />)}</div>
      </>
    );
  }

  const raw = await getPost(slug);
  if (!raw) notFound();
  const p = loc(raw, locale);
  const blocks = parse(p.content);
  const tourSlugs = blocks.flatMap((b) => (b.type === "tour" ? [b.slug] : []));
  const [m, embedded, relatedTours, relatedPosts] = await Promise.all([
    getMoney(locale),
    db.tour.findMany({ where: { slug: { in: tourSlugs }, published: true }, include: tourCardInclude }),
    raw.destinationSlug ? db.tour.findMany({ where: { published: true, destination: { slug: raw.destinationSlug }, slug: { notIn: tourSlugs } }, take: 3, include: tourCardInclude }) : [],
    getPosts({ slug: { not: slug }, OR: [{ category: raw.category }, { destinationSlug: raw.destinationSlug }] }, 3),
  ]);
  const toc = blocks.filter((b) => b.type === "h2") as { text: string; id: string }[];
  const url = site.url + lp(locale, `/blog/${slug}`);

  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.blog.title, href: lp(locale, "/blog") }, { name: d.blog.categories[raw.category], href: lp(locale, `/blog/${raw.category}`) }, { name: p.title }]} />
      <article className="container-x grid gap-10 pb-10 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{d.blog.categories[raw.category]}</p>
          <h1 className="mt-2 max-w-3xl text-[28px] md:text-[40px]">{p.title}</h1>
          <p className="mt-3 text-sm text-muted">
            {d.blog.by} {p.author} · {fmtDate(raw.publishedAt, locale)} · {d.blog.updated} {fmtDate(raw.updatedAt, locale)} · {d.blog.minRead(readingTime(p.content))}
          </p>
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image src={raw.image} alt="" fill priority unoptimized sizes="(min-width:1024px) 900px, 100vw" className="object-cover" />
          </div>
          <div className="mt-6 text-lg">
            <Markdown blocks={blocks} renderTour={(s) => { const t = embedded.find((x) => x.slug === s); return t ? <TourCard tour={t} locale={locale} m={m} /> : null; }} />
          </div>
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {toc.length > 0 && (
            <nav aria-label={d.blog.toc} className="rounded-xl border border-line p-4">
              <p className="mb-2 font-semibold text-ink">{d.blog.toc}</p>
              <ol className="grid gap-1 text-sm">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="hover:text-primary">{h.text}</a></li>)}</ol>
            </nav>
          )}
        </aside>
      </article>
      {relatedTours.length > 0 && (
        <section className="container-x py-8">
          <h2 className="mb-6 text-2xl">{d.blog.relatedTours}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{relatedTours.map((t) => <li key={t.slug}><TourCard tour={t} locale={locale} m={m} /></li>)}</ul>
        </section>
      )}
      {relatedPosts.length > 0 && (
        <section className="container-x py-8">
          <h2 className="mb-6 text-2xl">{d.blog.related}</h2>
          <div className="grid gap-4 md:grid-cols-3">{relatedPosts.map((x) => <PostCard key={x.slug} post={x} locale={locale} />)}</div>
        </section>
      )}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.excerpt, image: site.url + raw.image, datePublished: raw.publishedAt.toISOString(), dateModified: raw.updatedAt.toISOString(), author: { "@type": "Organization", name: p.author }, publisher: { "@type": "Organization", name: site.name }, mainEntityOfPage: url, inLanguage: locale }} />
    </>
  );
}
