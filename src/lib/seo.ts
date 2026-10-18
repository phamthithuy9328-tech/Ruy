import type { Metadata } from "next";
import { defaultLocale, locales, lp, ogLocale, type Locale } from "@/i18n/config";
import { site } from "./site";

/** Canonical + hreflang for every language (+ x-default → English) and Open Graph defaults */
export function pageMeta(opts: { locale: Locale; path: string; title: string; description: string; image?: string; noindex?: boolean; type?: "website" | "article" }): Metadata {
  const languages: Record<string, string> = Object.fromEntries(locales.map((l) => [l, site.url + lp(l, opts.path)]));
  languages["x-default"] = site.url + lp(defaultLocale, opts.path);
  const url = site.url + lp(opts.locale, opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url, languages },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: opts.title, description: opts.description, url, siteName: site.name, type: opts.type ?? "website", locale: ogLocale[opts.locale],
      images: opts.image ? [{ url: opts.image.startsWith("http") ? opts.image : site.url + opts.image }] : undefined,
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description },
  };
}
