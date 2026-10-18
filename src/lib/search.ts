// Accent-insensitive, typo-tolerant search. The catalog is small (hundreds of tours), so the index lives
// in memory; swap for Meilisearch/Typesense later with the same result shape.
// Every language's text is indexed together, so "ha giang", "Hà Giang" and "Ha Giang Loop" all match.
import { db } from "./db";
import { unaccent } from "./format";
import { locales, lp, type Locale } from "@/i18n/config";
import { loc } from "@/i18n";

type Doc = {
  type: "destination" | "tour" | "post"; path: string; image: string; price?: number; currency?: string;
  titles: Record<string, string>; metas: Record<string, string>; text: string; tokens: string[]; weight: number;
};
export type SearchHit = { type: Doc["type"]; title: string; url: string; image: string; price?: number; currency?: string; meta?: string };

const perLocale = <T extends { tr: unknown }>(row: T, pick: (r: T) => string) => Object.fromEntries(locales.map((l) => [l, pick(loc(row, l))]));

let index: { at: number; docs: Doc[] } | null = null;

const tokenize = (s: string) => unaccent(s).split(/[^a-z0-9]+/).filter(Boolean);

async function getIndex() {
  if (index && Date.now() - index.at < 60_000) return index.docs;
  const [dests, tours, posts] = await Promise.all([
    db.destination.findMany({ include: { _count: { select: { tours: true } } } }),
    db.tour.findMany({ where: { published: true }, include: { destination: true } }),
    db.post.findMany({ where: { published: true, publishedAt: { lte: new Date() } } }),
  ]);
  const docs: Doc[] = [
    ...dests.map((d) => ({ type: "destination" as const, path: `/destinations/${d.slug}`, image: d.image, titles: perLocale(d, (x) => x.name), metas: Object.fromEntries(locales.map((l) => [l, String(d._count.tours)])), text: locales.map((l) => { const x = loc(d, l); return `${x.name} ${x.description}`; }).join(" "), weight: 3 })),
    ...tours.map((t) => ({ type: "tour" as const, path: `/tour/${t.slug}`, image: (t.images as string[])[0], price: t.priceFrom > 0 ? t.priceFrom : undefined, currency: t.currency, titles: perLocale(t, (x) => x.title), metas: perLocale(t.destination, (x) => x.name), text: locales.map((l) => { const x = loc(t, l); return `${x.title} ${loc(t.destination, l).name} ${x.summary}`; }).join(" "), weight: 2 + t.popularity / 100 })),
    ...posts.map((p) => ({ type: "post" as const, path: `/blog/${p.slug}`, image: p.image, titles: perLocale(p, (x) => x.title), metas: {}, text: locales.map((l) => { const x = loc(p, l); return `${x.title} ${x.excerpt}`; }).join(" "), weight: 1 })),
  ].map((d) => ({ ...d, tokens: [...new Set(tokenize(d.text))] }));
  index = { at: Date.now(), docs };
  return docs;
}

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  return dp[a.length][b.length];
}

function termScore(term: string, tokens: string[]) {
  let best = 0;
  for (const tok of tokens) {
    if (tok === term) return 3;
    if (tok.startsWith(term)) best = Math.max(best, 2);
    else if (term.length >= 4) {
      const allowed = term.length >= 7 ? 2 : 1;
      const cmp = tok.slice(0, term.length + 1);
      if (editDistance(term, cmp, allowed) <= allowed || editDistance(term, tok, allowed) <= allowed) best = Math.max(best, 1);
    }
  }
  return best;
}

export async function search(q: string, locale: Locale, limit = 5) {
  const terms = tokenize(q);
  const empty = { destinations: [] as SearchHit[], tours: [] as SearchHit[], posts: [] as SearchHit[] };
  if (!terms.length) return empty;
  const docs = await getIndex();
  const hits = docs
    .map((d) => {
      let s = 0;
      for (const t of terms) {
        const ts = termScore(t, d.tokens);
        if (!ts) return null;
        s += ts;
      }
      if (Object.values(d.titles).some((title) => unaccent(title).includes(terms.join(" ")))) s += 3;
      return { d, s: s * d.weight };
    })
    .filter((x): x is { d: Doc; s: number } => !!x)
    .sort((a, b) => b.s - a.s)
    .map(({ d }): SearchHit => ({ type: d.type, title: d.titles[locale] ?? d.titles.en, url: lp(locale, d.path), image: d.image, price: d.price, currency: d.currency, meta: d.metas[locale] }));
  return {
    destinations: hits.filter((h) => h.type === "destination").slice(0, 3),
    tours: hits.filter((h) => h.type === "tour").slice(0, limit),
    posts: hits.filter((h) => h.type === "post").slice(0, 3),
  };
}
