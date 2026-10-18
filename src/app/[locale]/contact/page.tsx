import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LeadForm } from "@/components/LeadForm";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  const d = getDict(locale);
  return pageMeta({ locale, path: "/contact", title: d.pages.contactTitle, description: d.home.ctaText });
}
export default async function Contact({ params }: P) {
  const { locale } = await params;
  const d = getDict(locale);
  const row = "flex items-center gap-3";
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: d.pages.contactTitle }]} />
      <div className="container-x grid gap-10 pb-10 lg:grid-cols-2">
        <div>
          <h1 className="text-[32px]">{d.pages.contactTitle}</h1>
          <p className="mt-2 text-lg">{d.home.ctaText}</p>
          <ul className="mt-6 grid gap-4">
            <li className={row}><MessageCircle className="size-5 text-primary" /><a href={site.whatsapp} target="_blank" rel="noopener" className="font-semibold text-ink hover:text-primary">WhatsApp</a> · <a href={site.zalo} target="_blank" rel="noopener" className="hover:text-primary">Zalo</a> · <a href={site.messenger} target="_blank" rel="noopener" className="hover:text-primary">Messenger</a></li>
            <li className={row}><Phone className="size-5 text-primary" /><a href={`tel:${site.hotlineTel}`} className="font-semibold text-ink">{site.hotline}</a></li>
            <li className={row}><Mail className="size-5 text-primary" /><a href={`mailto:${site.email}`}>{site.email}</a></li>
            <li className={row}><MapPin className="size-5 text-primary" />{site.address}</li>
          </ul>
          <div className="mt-8 rounded-2xl border border-line p-6">
            <h2 className="text-xl">{d.lead.customTitle}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">{d.lead.customText}</p>
            <LeadForm locale={locale} type="custom-tour" />
          </div>
        </div>
        <div className="rounded-2xl border border-line p-6 lg:self-start">
          <h2 className="mb-4 text-xl">{d.tour.quoteTitle}</h2>
          <LeadForm locale={locale} type="contact" />
        </div>
      </div>
    </>
  );
}
