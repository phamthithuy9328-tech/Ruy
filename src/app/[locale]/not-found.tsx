import Link from "next/link";
import { headers } from "next/headers";
import { SearchBox } from "@/components/SearchBox";
import { TourCard } from "@/components/TourCard";
import { getDict } from "@/i18n";
import { isLocale, lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { tourCardInclude } from "@/lib/queries";
import { getMoney } from "@/lib/request";

export default async function NotFound() {
  // not-found has no params; recover the locale from the URL prefix
  const h = await headers();
  const path = h.get("x-amgo-path") ?? "";
  const seg = path.split("/")[1];
  const locale: Locale = isLocale(seg) ? seg : "en";
  const d = getDict(locale);
  const [m, tours] = await Promise.all([getMoney(locale), db.tour.findMany({ where: { published: true }, orderBy: { popularity: "desc" }, take: 4, include: tourCardInclude })]);
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-[32px]">{d.pages.notFound}</h1>
        <p className="mt-2 text-muted">{d.pages.notFoundText}</p>
        <div className="mt-6 text-left"><SearchBox locale={locale} m={m} popular={[]} /></div>
        <Link href={lp(locale, "/")} className="btn btn-outline mt-4">{d.common.backHome}</Link>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tours.map((t) => <li key={t.slug}><TourCard tour={t} locale={locale} m={m} /></li>)}</ul>
    </div>
  );
}
