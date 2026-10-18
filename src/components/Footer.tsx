import Link from "next/link";
import { LeadForm } from "./LeadForm";
import { PaymentLogos } from "./PaymentLogos";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { site } from "@/lib/site";
import { getDestinations } from "@/lib/queries";
import { loc } from "@/i18n";

export async function Footer({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const f = d.footer;
  const dests = (await getDestinations()).filter((x) => x.featured).slice(0, 6);
  const col = "grid content-start gap-2 text-sm";
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-x grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr]">
        <div className="grid content-start gap-3 text-sm">
          <p className="text-lg font-bold text-ink">AmGo<span className="text-primary"> Travel</span></p>
          <p>{f.about}</p>
          <p>{site.address}</p>
          <p>
            <a href={`tel:${site.hotlineTel}`} className="font-semibold text-ink hover:text-primary">{site.hotline}</a> · <a href={`mailto:${site.email}`} className="hover:text-primary">{site.email}</a>
          </p>
          <ul className="flex gap-3">
            {Object.entries(site.social).map(([k, v]) => (
              <li key={k}><a href={v} target="_blank" rel="noopener" className="capitalize hover:text-primary">{k}</a></li>
            ))}
          </ul>
        </div>
        <div className={col}>
          <p className="font-semibold text-ink">{f.explore}</p>
          {dests.map((x) => (
            <Link key={x.slug} href={lp(locale, `/destinations/${x.slug}`)} className="hover:text-primary">{loc(x, locale).name}</Link>
          ))}
          <Link href={lp(locale, "/tours")} className="hover:text-primary">{d.nav.allTours}</Link>
        </div>
        <div className={col}>
          <p className="font-semibold text-ink">{f.support}</p>
          <Link href={lp(locale, "/manage-booking")} className="hover:text-primary">{f.links.manage}</Link>
          <Link href={lp(locale, "/policies#cancellation")} className="hover:text-primary">{f.links.cancellation}</Link>
          <Link href={lp(locale, "/policies#payment")} className="hover:text-primary">{f.links.payment}</Link>
          <Link href={lp(locale, "/policies#privacy")} className="hover:text-primary">{f.links.privacy}</Link>
          <Link href={lp(locale, "/policies#terms")} className="hover:text-primary">{f.links.terms}</Link>
          <Link href={lp(locale, "/about")} className="hover:text-primary">{f.links.about}</Link>
          <Link href={lp(locale, "/contact")} className="hover:text-primary">{f.links.contact}</Link>
        </div>
        <div className="grid content-start gap-3 text-sm">
          <p className="font-semibold text-ink">{f.newsletter}</p>
          <p>{f.newsletterText}</p>
          <LeadForm locale={locale} type="newsletter" />
          <p className="mt-2 font-semibold text-ink">{f.payments}</p>
          <PaymentLogos />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x grid gap-1 py-5 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {site.company}. {f.rights}
          </p>
          <p>
            {f.license}: {site.businessLicense} · {f.travelLicense}: {site.travelLicense}
          </p>
        </div>
      </div>
    </footer>
  );
}
