// Printable voucher / invoice. "Download PDF" uses the browser's print-to-PDF, which keeps every language's script intact.
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { getDict, loc } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { arr } from "@/lib/json";
import { safeEqual, sign } from "@/lib/tokens";
import { site } from "@/lib/site";

export const metadata = { robots: { index: false } };

export default async function Voucher({ params, searchParams }: { params: Promise<{ locale: Locale; code: string }>; searchParams: Promise<{ t?: string }> }) {
  const { locale, code } = await params;
  const { t } = await searchParams;
  if (!t || !safeEqual(t, sign(`voucher:${code}`))) notFound();
  const b = await db.booking.findUnique({ where: { code }, include: { tour: true, departure: true, customer: true } });
  if (!b) notFound();
  const d = getDict(locale);
  const tour = loc(b.tour, locale);
  const m = (v: number) => formatMoney(v, b.baseCurrency, locale);
  const pax = arr<{ name: string; type: string }>(b.passengers);
  return (
    <div className="container-x max-w-3xl py-10">
      <div className="rounded-2xl border border-line p-8 print:border-0 print:p-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-ink">AmGo<span className="text-primary"> Travel</span></p>
            <p className="text-xs text-muted">{site.company} · {site.businessLicense}</p>
            <p className="text-xs text-muted">{site.hotline} · {site.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted">{d.result.voucherTitle}</p>
            <p className="font-mono text-2xl font-bold text-ink">{b.code}</p>
            <p className="text-sm font-semibold text-success">{d.manage.statuses[b.status]}</p>
          </div>
        </div>
        <h1 className="mt-8 text-2xl">{tour.title}</h1>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">{d.checkout.date}</dt><dd className="font-medium text-ink">{fmtDate(b.departure.date, locale, { weekday: "long" })}</dd></div>
          <div><dt className="text-muted">{d.tour.meetingPoint}</dt><dd className="font-medium text-ink">{tour.meetingPoint}</dd></div>
          <div><dt className="text-muted">{d.result.lead}</dt><dd className="font-medium text-ink">{b.customer.name} · {b.customer.phone.startsWith("email:") ? "" : b.customer.phone}</dd></div>
          <div><dt className="text-muted">{d.result.travelers}</dt><dd className="font-medium text-ink">{b.adults} {d.tour.adults}, {b.children} {d.tour.children}, {b.infants} {d.tour.infants}</dd></div>
        </dl>
        {pax.length > 0 && <p className="mt-3 text-sm">{pax.map((p) => p.name).join(", ")}</p>}
        <table className="mt-6 w-full text-sm">
          <tbody>
            <tr className="border-b border-line"><td className="py-2">{d.checkout.subtotal}</td><td className="py-2 text-right">{m(b.subtotal)}</td></tr>
            {b.discount > 0 && <tr className="border-b border-line"><td className="py-2">{d.checkout.discount} ({b.discountCode})</td><td className="py-2 text-right">−{m(b.discount)}</td></tr>}
            <tr className="border-b border-line font-semibold text-ink"><td className="py-2">{d.checkout.total}</td><td className="py-2 text-right">{m(b.total)}</td></tr>
            <tr><td className="py-2">{d.manage.paid}</td><td className="py-2 text-right">{m(b.amountPaid)}{b.chargeCurrency && b.chargeAmount != null && b.amountPaid > 0 ? ` (${formatMoney(b.chargeAmount / 100, b.chargeCurrency, locale)})` : ""}</td></tr>
            {b.total - b.amountPaid > 0 && <tr className="font-semibold text-warning"><td className="py-2">{d.manage.due}</td><td className="py-2 text-right">{m(b.total - b.amountPaid)}</td></tr>}
          </tbody>
        </table>
        <p className="mt-6 text-sm text-muted">{d.result.voucherNote}</p>
      </div>
      <div className="mt-6 text-center"><PrintButton label={d.result.print} /></div>
    </div>
  );
}
