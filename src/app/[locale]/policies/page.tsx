import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { policies } from "@/content/pages";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta({ locale, path: "/policies", title: getDict(locale).pages.policiesTitle, description: policies[locale].map((s) => s.title).join(", ") });
}
export default async function Policies({ params }: P) {
  const { locale } = await params;
  const d = getDict(locale);
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.pages.policiesTitle }]} />
      <div className="container-x grid gap-10 pb-10 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <ul className="grid gap-1 text-sm">{policies[locale].map((s) => <li key={s.id}><a href={`#${s.id}`} className="block rounded-lg px-3 py-2 hover:bg-surface hover:text-primary">{s.title}</a></li>)}</ul>
        </nav>
        <div className="max-w-3xl">
          <h1 className="text-[32px]">{d.pages.policiesTitle}</h1>
          {policies[locale].map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-line py-8">
              <h2 className="text-2xl">{s.title}</h2>
              <div className="mt-3 grid gap-3">{s.body.map((b) => <p key={b}>{b}</p>)}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
