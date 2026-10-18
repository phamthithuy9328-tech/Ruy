import { HeaderClient, type NavData } from "./HeaderClient";
import { getNavData } from "@/lib/queries";
import { loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { site } from "@/lib/site";
import type { Money } from "@/lib/currency";

export async function Header({ locale, m }: { locale: Locale; m: Money }) {
  const { destinations, categories, featured } = await getNavData();
  const nav: NavData = {
    destinations: destinations.filter((x) => x._count.tours > 0).map((x) => ({ name: loc(x, locale).name, url: lp(locale, `/destinations/${x.slug}`), region: x.region, count: x._count.tours })),
    categories: categories.map((c) => ({ name: loc(c, locale).name, url: lp(locale, `/tour-types/${c.slug}`), group: c.group, icon: c.icon })),
    featured: featured.map((t) => ({ title: loc(t, locale).title, url: lp(locale, `/tour/${t.slug}`), image: (t.images as string[])[0] })),
  };
  return <HeaderClient locale={locale} m={m} nav={nav} hotline={site.hotline} hotlineTel={site.hotlineTel} whatsapp={site.whatsapp} />;
}
