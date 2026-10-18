import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { sign } from "@/lib/tokens";

export const metadata = { robots: { index: false } };

export default async function ResultPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ code?: string; r?: string }> }) {
  const { locale } = await params;
  const { code } = await searchParams;
  if (!code) notFound();
  const b = await db.booking.findUnique({ where: { code }, include: { tour: true, departure: true } });
  if (!b) notFound();
  const d = getDict(locale);
  const R = d.result;
  // Status always comes from our database (set by the verified IPN), never from the URL
  const state = b.status === "paid" ? "success" : b.status === "failed" ? "failed" : "pending";
  const Icon = state === "success" ? CheckCircle2 : state === "failed" ? XCircle : Clock;
  const color = state === "success" ? "text-success" : state === "failed" ? "text-danger" : "text-warning";
  const money = (v: number) => formatMoney(v, b.baseCurrency, locale);
  return (
    <div className="container-x max-w-2xl py-12">
      <div className="rounded-2xl border border-line p-6 text-center md:p-10">
        <Icon className={`mx-auto size-14 ${color}`} aria-hidden />
        <h1 className="mt-4 text-[28px]">{R[state]}</h1>
        <p className="mt-2">{R[`${state}Text` as "successText"]}</p>
        <p className="mt-6 text-sm text-muted">{R.code}</p>
        <p className="font-mono text-2xl font-bold tracking-wider text-ink">{b.code}</p>
        <dl className="mx-auto mt-6 grid max-w-sm gap-1 text-left text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{d.checkout.summary}</dt><dd className="text-right text-ink">{loc(b.tour, locale).title}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{d.checkout.date}</dt><dd>{fmtDate(b.departure.date, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{d.checkout.total}</dt><dd>{money(b.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{d.manage.paid}</dt><dd>{money(b.amountPaid)}</dd></div>
          {b.chargeCurrency && b.amountPaid > 0 && b.chargeAmount != null && <div className="flex justify-between"><dt className="text-muted">{d.checkout.chargedLabel}</dt><dd>{formatMoney(b.chargeAmount / 100, b.chargeCurrency, locale)}</dd></div>}
        </dl>
        {state === "pending" && b.method === "bank-transfer" && (
          <div className="mt-6 rounded-xl bg-surface p-4 text-left text-sm">
            <p className="font-semibold text-ink">{R.bankDetails}</p>
            <p className="mt-1 whitespace-pre-line">{process.env.BANK_TRANSFER_DETAILS ?? "[Bank name]\n[Account name]\n[Account number] · SWIFT [code]"}</p>
            <p className="mt-2">{R.bankText(b.code)}</p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {state === "failed" && <Link href={`${lp(locale, `/book/${b.tour.slug}`)}?booking=${b.code}`} className="btn btn-primary">{R.tryAgain}</Link>}
          {state === "success" && <Link href={`${lp(locale, `/voucher/${b.code}`)}?t=${sign(`voucher:${b.code}`)}`} className="btn btn-primary">{R.voucher}</Link>}
          <Link href={`${lp(locale, "/manage-booking")}?code=${b.code}`} className="btn btn-outline">{R.manage}</Link>
        </div>
      </div>
    </div>
  );
}
