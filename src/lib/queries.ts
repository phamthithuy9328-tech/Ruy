import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { unaccent } from "./format";
import { convert, type FxConfig } from "./currency";
import { locales } from "@/i18n/config";
import { loc } from "@/i18n";

export const tourCardInclude = {
  destination: true,
  departures: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" }, take: 3 },
  categories: { select: { category: { select: { slug: true } } } },
} satisfies Prisma.TourInclude;

export type TourCardData = Prisma.TourGetPayload<{ include: typeof tourCardInclude }>;

export type TourFilters = {
  q?: string;
  dest?: string[];
  dur?: string[];
  cat?: string[];
  transport?: string[];
  min?: number;
  max?: number;
  date?: string;
  rating?: number;
  guests?: number;
  sort?: string;
};

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);

export function parseFilters(sp: Record<string, string | string[] | undefined>): TourFilters {
  const num = (k: string) => (sp[k] && !isNaN(Number(sp[k])) ? Number(sp[k]) : undefined);
  return {
    q: typeof sp.q === "string" ? sp.q : undefined,
    dest: list(sp.dest),
    dur: list(sp.dur),
    cat: list(sp.cat),
    transport: list(sp.transport),
    min: num("min"),
    max: num("max"),
    date: typeof sp.date === "string" ? sp.date : undefined,
    rating: num("rating"),
    guests: num("guests"),
    sort: typeof sp.sort === "string" ? sp.sort : "popular",
  };
}

/** min/max are in USD so filter URLs stay stable whatever currency the visitor uses */
export async function findTours(f: TourFilters, fx: FxConfig) {
  const where: Prisma.TourWhereInput = { published: true };
  if (f.dest?.length) where.destination = { slug: { in: f.dest } };
  if (f.dur?.length) where.durationSlug = { in: f.dur };
  if (f.transport?.length) where.transport = { in: f.transport };
  if (f.cat?.length) where.categories = { some: { category: { slug: { in: f.cat } } } };
  if (f.rating) where.rating = { gte: f.rating };
  if (f.date) {
    const from = new Date(f.date + "T00:00:00+07:00");
    where.departures = { some: { date: { gte: from, lt: new Date(from.getTime() + 7 * 86400000) } } };
  }
  const orderBy: Prisma.TourOrderByWithRelationInput =
    f.sort === "newest" ? { createdAt: "desc" } : { popularity: "desc" };
  let tours = await db.tour.findMany({ where, orderBy, include: tourCardInclude });
  if (f.q) {
    const q = unaccent(f.q).trim();
    const terms = q.split(/\s+/);
    tours = tours.filter((t) => {
      const hay = unaccent(locales.map((l) => { const x = loc(t, l); return `${x.title} ${loc(t.destination, l).name} ${x.summary}`; }).join(" "));
      return terms.every((term) => hay.includes(term));
    });
  }
  const usd = (t: (typeof tours)[number]) => convert(t.priceFrom, t.currency, "USD", fx, false);
  if (f.min || f.max) tours = tours.filter((t) => t.priceFrom > 0 && usd(t) >= (f.min ?? 0) && usd(t) <= (f.max ?? Infinity));
  // Tours priced on request (priceFrom 0) go last in both price sorts
  if (f.sort === "price-asc") tours.sort((a, b) => (usd(a) || Infinity) - (usd(b) || Infinity));
  if (f.sort === "price-desc") tours.sort((a, b) => usd(b) - usd(a));
  if (f.guests) {
    tours = tours.filter((t) => t.departures.length === 0 || t.departures.some((d) => d.seatsTotal - d.seatsBooked >= f.guests!));
  }
  return tours;
}

export const getDestinations = cache(() =>
  db.destination.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { tours: { where: { published: true } } } } } }),
);
export const getCategories = cache(() => db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { tours: true } } } }));

export const getNavData = cache(async () => {
  const [destinations, categories, featured] = await Promise.all([
    getDestinations(),
    getCategories(),
    db.tour.findMany({ where: { published: true }, orderBy: { popularity: "desc" }, take: 2, include: { destination: true } }),
  ]);
  return { destinations, categories, featured };
});

export const getTour = cache((slug: string) =>
  db.tour.findFirst({
    where: { slug, published: true },
    include: {
      destination: true,
      categories: { include: { category: true } },
      departures: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" } },
      reviews: { where: { approved: true }, orderBy: { createdAt: "desc" } },
    },
  }),
);

export const getPosts = cache((where: Prisma.PostWhereInput = {}, take?: number) =>
  db.post.findMany({ where: { published: true, publishedAt: { lte: new Date() }, ...where }, orderBy: { publishedAt: "desc" }, take }),
);
