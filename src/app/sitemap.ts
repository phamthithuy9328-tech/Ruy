import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { locales, lp } from "@/i18n/config";
import { site } from "@/lib/site";
import { durationSlugs, postCategorySlugs } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

/** One entry per page with hreflang alternates for every language */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tours, dests, cats, posts] = await Promise.all([
    db.tour.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.destination.findMany({ select: { slug: true } }),
    db.category.findMany({ select: { slug: true } }),
    db.post.findMany({ where: { published: true, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
  ]);
  const paths: { path: string; lastModified?: Date; priority: number }[] = [
    { path: "/", priority: 1 }, { path: "/tours", priority: 0.9 }, { path: "/blog", priority: 0.7 },
    { path: "/about", priority: 0.4 }, { path: "/contact", priority: 0.4 }, { path: "/policies", priority: 0.3 },
    ...tours.map((t) => ({ path: `/tour/${t.slug}`, lastModified: t.updatedAt, priority: 0.9 })),
    ...dests.map((x) => ({ path: `/destinations/${x.slug}`, priority: 0.8 })),
    ...cats.map((x) => ({ path: `/tour-types/${x.slug}`, priority: 0.7 })),
    ...durationSlugs.map((s) => ({ path: `/duration/${s}`, priority: 0.6 })),
    ...postCategorySlugs.map((s) => ({ path: `/blog/${s}`, priority: 0.5 })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
  ];
  return paths.flatMap((p) =>
    locales.map((l) => ({
      url: site.url + lp(l, p.path),
      lastModified: p.lastModified ?? new Date(),
      priority: p.priority,
      alternates: { languages: { ...Object.fromEntries(locales.map((x) => [x, site.url + lp(x, p.path)])), "x-default": site.url + p.path } },
    })),
  );
}
