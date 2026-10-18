import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/checkout/Checkout";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/request";
import { checkoutCookie, checkoutToken, safeEqual } from "@/lib/tokens";

type P = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BookPage({ params, searchParams }: P) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const tour = await db.tour.findFirst({ where: { slug, published: true }, include: { destination: true } });
  if (!tour) notFound();
  const m = await getMoney(locale);
  const d = getDict(locale);

  // Resume an existing booking (e.g. from a reminder link) when this browser owns it
  let existing: Awaited<ReturnType<typeof db.booking.findUnique>> = null;
  if (sp.booking) {
    const c = (await cookies()).get(checkoutCookie(sp.booking))?.value;
    if (c && safeEqual(c, checkoutToken(sp.booking))) existing = await db.booking.findUnique({ where: { code: sp.booking } });
    if (!existing) redirect(`${lp(locale, "/manage-booking")}?code=${sp.booking}`);
    if (existing.status === "paid" && existing.amountPaid >= existing.total) redirect(`${lp(locale, "/payment/result")}?code=${existing.code}`);
  }
  const depId = existing?.departureId ?? Number(sp.dep);
  const dep = Number.isInteger(depId) && depId > 0 ? await db.departure.findFirst({ where: { id: depId, tourId: tour.id } }) : null;
  if (!dep) redirect(lp(locale, `/tour/${slug}`));
  const t = loc(tour, locale);
  const clamp = (v: string | undefined, min: number, max: number, def: number) => Math.min(max, Math.max(min, Number(v ?? def) || def));
  return (
    <>
      <h1 className="sr-only">{d.tour.bookNow}</h1>
      <div className="h-6" />
      <Checkout
        locale={locale}
        m={m}
        existingCode={existing?.code}
        s={{
          slug, title: t.title, image: (tour.images as string[])[0], destination: loc(tour.destination, locale).name, date: dep.date.toISOString(), departureId: dep.id,
          adults: existing?.adults ?? clamp(sp.a, 1, 30, 2), children: existing?.children ?? clamp(sp.c, 0, 30, 0), infants: existing?.infants ?? clamp(sp.i, 0, 10, 0),
          depositPercent: tour.depositPercent, allowHold: tour.allowHold, allowTransfer: tour.allowTransfer, holdHours: tour.holdHours,
        }}
      />
    </>
  );
}
