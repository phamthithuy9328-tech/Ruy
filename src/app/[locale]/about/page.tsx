import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { about } from "@/content/pages";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta({ locale, path: "/about", title: getDict(locale).pages.aboutTitle, description: about[locale].lead });
}
export default async function About({ params }: P) {
  const { locale } = await params;
  const d = getDict(locale);
  const c = about[locale];
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.pages.aboutTitle }]} />
      <div className="container-x max-w-3xl pb-10">
        <h1 className="text-[32px]">{d.pages.aboutTitle}</h1>
        <p className="mt-4 text-lg">{c.lead}</p>
        {c.sections.map((s) => (
          <section key={s.id} className="mt-8">
            <h2 className="text-2xl">{s.title}</h2>
            {s.body.length > 1 ? <ul className="mt-3 list-disc pl-5">{s.body.map((b) => <li key={b}>{b}</li>)}</ul> : <p className="mt-3">{s.body[0]}</p>}
          </section>
        ))}
      </div>
    </>
  );
}
