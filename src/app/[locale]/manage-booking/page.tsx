import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/currency";
import { normalizePhone } from "@/lib/crm";
import { fmtDate } from "@/lib/format";
import { checkoutCookie, checkoutToken, sign } from "@/lib/tokens";
import { pageMeta } from "@/lib/seo";

type P = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ code?: string; contact?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta({ locale, path: "/manage-booking", title: getDict(locale).manage.title, description: getDict(locale).manage.text });
}

async function lookup(code: string, contact: string) {
  const b = await db.booking.findUnique({ where: { code: code.trim().toUpperCase() }, include: { customer: true, tour: true, departure: true } });
  if (!b) return null;
  const c = contact.trim().toLowerCase();
  const ok = (b.customer.email && b.customer.email.toLowerCase() === c) || (c.replace(/\D/g, "").length >= 7 && normalizePhone(c) === b.customer.phone);
  return ok ? b : null;
}

export default async function ManageBooking({ params, searchParams }: P) {
  const { locale } = await params;
  const sp = await searchParams;
  const d = getDict(locale);
  const M = d.manage;
  const b = sp.code && sp.contact ? await lookup(sp.code, sp.contact) : null;

  async function payBalance() {
    "use server";
    if (!b) return;
    // Verified owner: grant checkout access for this booking, then resume checkout
    (await cookies()).set(checkoutCookie(b.code), checkoutToken(b.code), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 86400 });
    redirect(`${lp(locale, `/book/${b.tour.slug}`)}?booking=${b.code}`);
  }

  const m = (v: number) => formatMoney(v, b!.baseCurrency, locale);
  return (
    <>
      <Breadcrumbs label={d.common.breadcrumb} items={[{ name: d.pages.home, href: lp(locale, "/") }, { name: M.title }]} />
      <div className="container-x max-w-xl pb-16">
        <h1 className="text-[32px]">{M.title}</h1>
        <p className="mt-2 text-muted">{M.text}</p>
        <form method="get" className="mt-6 grid gap-3">
          <div>
            <label htmlFor="mb-code" className="label">{M.code}</label>
            <input id="mb-code" name="code" defaultValue={sp.code} required maxLength={20} className="input font-mono uppercase" placeholder="AMG…" />
          </div>
          <div>
            <label htmlFor="mb-contact" className="label">{M.contact}</label>
            <input id="mb-contact" name="contact" defaultValue={sp.contact} required maxLength={120} className="input" />
          </div>
          <button className="btn btn-primary">{M.find}</button>
        </form>
        {sp.code && sp.contact && !b && <p role="alert" className="mt-4 text-danger">{M.notFound}</p>}
        {b && (
          <div className="mt-8 rounded-2xl border border-line p-5">
            <p className="text-sm text-muted">{M.status}</p>
            <p className={`text-lg font-bold ${b.status === "paid" ? "text-success" : b.status === "pending" ? "text-warning" : "text-danger"}`}>{M.statuses[b.status]}</p>
            <p className="mt-3 font-semibold text-ink">{loc(b.tour, locale).title}</p>
            <p className="text-sm">{fmtDate(b.departure.date, locale, { weekday: "long" })} · {b.adults + b.children + b.infants} {d.tour.guests.toLowerCase()}</p>
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between"><dt>{d.checkout.total}</dt><dd>{m(b.total)}</dd></div>
              <div className="flex justify-between"><dt>{M.paid}</dt><dd>{m(b.amountPaid)}</dd></div>
              <div className="flex justify-between font-semibold text-ink"><dt>{M.due}</dt><dd>{m(Math.max(0, b.total - b.amountPaid))}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["pending", "failed"].includes(b.status) || (b.status === "paid" && b.amountPaid < b.total)) && <form action={payBalance}><button className="btn btn-primary">{M.payBalance}</button></form>}
              {b.status === "paid" && <Link href={`${lp(locale, `/voucher/${b.code}`)}?t=${sign(`voucher:${b.code}`)}`} className="btn btn-outline">{d.result.voucher}</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
