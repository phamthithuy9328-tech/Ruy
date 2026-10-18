import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { emit, logEvent, upsertCustomer } from "./crm";
import { notify } from "./notify";
import { buildPaymentUrl, verify, type Gateway } from "./onepay";
import { site } from "./site";
import { arr } from "./json";
import { convert, formatMoney, rateBetween } from "./currency";
import { getFx } from "./settings";
import { lp, isLocale, type Locale } from "@/i18n/config";
import { getDict, loc } from "@/i18n";
import { fmtDate } from "./format";

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES ?? 30); // seat hold while waiting for online payment

export const paymentMethods = ["onepay-intl", "onepay-domestic", "onepay-qr", "bank-transfer", "hold"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/** Currency actually charged for each method (section 2 of the spec) */
export function chargeCurrencyFor(method: string, base: string) {
  if (method === "onepay-intl") return process.env.ONEPAY_INTL_CURRENCY ?? "USD"; // set to VND if the merchant contract has no USD
  if (method === "onepay-domestic" || method === "onepay-qr") return "VND";
  if (method === "bank-transfer") return process.env.BANK_TRANSFER_CURRENCY ?? "VND";
  return base;
}

/** Amount in OnePay minor units (amount × 100), from an amount in the base currency */
export function toCharge(amountBase: number, base: string, chargeCurrency: string, fx: Awaited<ReturnType<typeof getFx>>) {
  const v = convert(amountBase, base, chargeCurrency, fx, false);
  return chargeCurrency === "VND" || chargeCurrency === "KRW" || chargeCurrency === "JPY" ? Math.round(v) * 100 : Math.round(v * 100);
}

function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "AMG" + Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

export async function quote(departureId: number, adults: number, children: number, infants: number, code?: string | null) {
  const dep = await db.departure.findUnique({ where: { id: departureId }, include: { tour: true } });
  if (!dep) throw new Error("Ngày khởi hành không tồn tại");
  const base = dep.tour.currency;
  const fx = await getFx();
  const subtotal = adults * dep.priceAdult + children * dep.priceChild + infants * dep.priceInfant;
  let discount = 0;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  if (code) {
    const dc = await db.discountCode.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!dc || !dc.active || (dc.expiresAt && dc.expiresAt < new Date()) || (dc.maxUses && dc.used >= dc.maxUses)) discountError = "invalid_code";
    else {
      // Fixed-amount codes are defined in USD and converted to the tour's base currency
      discount = dc.percent ? Math.round((subtotal * dc.percent) / 100) : Math.min(Math.round(convert(dc.amount ?? 0, "USD", base, fx, false)), subtotal);
      discountCode = dc.code;
    }
  }
  const total = subtotal - discount;
  const step = base === "VND" ? 1000 : 1;
  return { dep, base, fx, subtotal, discount, discountCode, discountError, total, deposit: Math.round((total * dep.tour.depositPercent) / 100 / step) * step };
}

export async function createBooking(input: {
  tourSlug: string; departureId: number; adults: number; children: number; infants: number;
  name: string; phone: string; email: string; nationality?: string; note?: string; passengers?: { name: string; type: string }[];
  source?: string; utm?: Record<string, string>; locale: Locale; currency: string; country?: string | null;
}) {
  const { dep, base, fx, subtotal, total } = await quote(input.departureId, input.adults, input.children, input.infants);
  if (dep.tour.slug !== input.tourSlug) throw new Error("tour_mismatch");
  const seats = input.adults + input.children;
  if (dep.seatsTotal - dep.seatsBooked < seats) throw new Error("not_enough_seats");
  if (dep.date < new Date()) throw new Error("departure_passed");
  const customer = await upsertCustomer({ name: input.name, phone: input.phone, email: input.email, source: input.source, utm: input.utm, locale: input.locale, currency: input.currency, country: input.nationality || input.country });
  const booking = await db.$transaction(async (tx) => {
    const upd = await tx.departure.updateMany({ where: { id: dep.id, seatsBooked: { lte: dep.seatsTotal - seats } }, data: { seatsBooked: { increment: seats } } });
    if (upd.count === 0) throw new Error("not_enough_seats");
    return tx.booking.create({
      data: {
        code: newCode(), customerId: customer.id, tourId: dep.tourId, departureId: dep.id,
        adults: input.adults, children: input.children, infants: input.infants, passengers: input.passengers ?? [], note: input.note, remindersSent: [],
        baseCurrency: base, subtotal, total, amountDue: total, currency: input.currency, locale: input.locale, displayTotal: Math.round(convert(total, base, input.currency, fx)),
        status: "pending", checkoutStep: 2, expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
      },
    });
  });
  await logEvent(customer.id, "booking", `Booking ${booking.code} created: ${dep.tour.title}`);
  await emit("booking.created", await bookingPayload(booking.id));
  return booking;
}

export async function bookingPayload(id: number) {
  const b = await db.booking.findUniqueOrThrow({ where: { id }, include: { customer: true, tour: true, departure: true } });
  return {
    code: b.code, status: b.status, locale: b.locale, base_currency: b.baseCurrency, total: b.total, amount_paid: b.amountPaid, amount_due: b.amountDue,
    display_currency: b.currency, display_total: b.displayTotal, charge_currency: b.chargeCurrency, charge_amount: b.chargeAmount != null ? b.chargeAmount / 100 : null, fx_rate: b.fxRate,
    payment_plan: b.paymentPlan, method: b.method,
    adults: b.adults, children: b.children, infants: b.infants,
    tour: { slug: b.tour.slug, title: b.tour.title, meeting_point: b.tour.meetingPoint }, departure_date: b.departure.date.toISOString(),
    customer: { id: b.customer.id, name: b.customer.name, phone: b.customer.phone, email: b.customer.email, country: b.customer.country, locale: b.customer.locale, currency: b.customer.currency, source: b.customer.source },
    lookup_url: `${site.url}${lp(isLocale(b.locale) ? b.locale : "en", "/manage-booking")}?code=${b.code}`,
  };
}

export async function bookingVars(id: number) {
  const b = await db.booking.findUniqueOrThrow({ where: { id }, include: { customer: true, tour: true, departure: true } });
  const l: Locale = isLocale(b.locale) ? b.locale : "en";
  const d = getDict(l);
  const tour = loc(b.tour, l);
  const m = (v: number) => formatMoney(v, b.baseCurrency, l);
  return {
    vars: {
      name: b.customer.name, code: b.code, tour: tour.title, date: fmtDate(b.departure.date, l), guests: `${b.adults} ${d.tour.adults}, ${b.children} ${d.tour.children}, ${b.infants} ${d.tour.infants}`,
      total: m(b.total), paid: m(b.amountPaid), expires: b.expiresAt ? fmtDate(b.expiresAt, l, { hour: "2-digit", minute: "2-digit" }) : "",
      lookup_url: `${site.url}${lp(l, "/manage-booking")}?code=${b.code}`, pay_url: `${site.url}${lp(l, `/book/${b.tour.slug}`)}?booking=${b.code}`,
      meeting_point: tour.meetingPoint, guide: l === "vi" ? "AmGo sẽ gửi tên và SĐT hướng dẫn viên trước 1 ngày" : "we'll send your guide's name and number the day before",
      packing: arr(tour.packing).join(", "), hotline: site.hotline, review_url: process.env.REVIEW_URL ?? `${site.url}${lp(l, `/tour/${b.tour.slug}`)}#reviews`, coupon: "CAMON5",
    },
    to: { email: b.customer.email, phone: b.customer.phone, locale: l },
    booking: b,
  };
}

/** Choose payment method + plan, return the redirect URL (OnePay or result page) */
export async function startPayment(code: string, method: string, plan: "full" | "deposit", discountCodeInput: string | null, baseUrl: string, ip: string) {
  const b = await db.booking.findUnique({ where: { code }, include: { tour: true, departure: true } });
  if (!b) throw new Error("not_found");
  const l: Locale = isLocale(b.locale) ? b.locale : "en";
  const resultUrl = `${lp(l, "/payment/result")}?code=${b.code}`;
  const balance = b.status === "paid" && b.amountPaid < b.total; // deposit paid, paying the rest
  if (b.status === "paid" && !balance) return { redirect: resultUrl };
  if (!balance && !["pending", "failed"].includes(b.status)) throw new Error("not_payable");
  if (balance && method === "hold") throw new Error("hold_not_allowed");
  if (!(paymentMethods as readonly string[]).includes(method)) throw new Error("invalid_method");
  if (method === "hold" && !b.tour.allowHold) throw new Error("hold_not_allowed");
  if (method === "bank-transfer" && !b.tour.allowTransfer) throw new Error("transfer_not_allowed");

  const q = await quote(b.departureId, b.adults, b.children, b.infants, discountCodeInput);
  if (q.discountError) throw new Error(q.discountError);
  const amountDue = balance ? b.total - b.amountPaid : plan === "deposit" ? q.deposit : q.total;
  const chargeCurrency = chargeCurrencyFor(method, q.base);
  const chargeAmount = toCharge(amountDue, q.base, chargeCurrency, q.fx);
  const offline = method === "hold" || method === "bank-transfer";
  const expiresAt = offline ? new Date(Date.now() + b.tour.holdHours * 3600_000) : new Date(Date.now() + HOLD_MINUTES * 60_000);
  await db.booking.update({
    where: { id: b.id },
    data: {
      ...(balance
        ? { amountDue }
        : { method, paymentPlan: plan, discount: q.discount, discountCode: q.discountCode, total: q.total, amountDue, status: "pending", checkoutStep: 3, expiresAt }),
      chargeCurrency, chargeAmount, fxRate: rateBetween(q.base, chargeCurrency, q.fx), displayTotal: Math.round(convert(q.total, q.base, b.currency, q.fx)),
    },
  });

  if (offline && !balance) {
    const { vars, to } = await bookingVars(b.id);
    await notify("booking_confirmation", to, vars);
    await notify("booking_confirmation_chat", to, vars);
    return { redirect: resultUrl };
  }

  const gw: Gateway = method === "onepay-intl" ? "intl" : "domestic";
  const txnRef = `${b.code}-${Date.now().toString(36).toUpperCase()}`;
  const url = buildPaymentUrl({
    gw, txnRef, amountMinor: chargeAmount, currency: chargeCurrency, orderInfo: b.code, ip, baseUrl, locale: l,
    cardList: method === "onepay-qr" ? "QR" : gw === "intl" ? "INTERNATIONAL" : "DOMESTIC",
  });
  await db.paymentLog.create({
    data: { bookingId: b.id, txnRef, kind: "request", gateway: gw, amount: chargeAmount, currency: chargeCurrency, verified: true, raw: { baseAmount: amountDue, baseCurrency: q.base, url: url.replace(/vpc_SecureHash=[^&]+/, "vpc_SecureHash=***") } },
  });
  return { redirect: url };
}

/** IPN handler: the only place an order becomes paid. Idempotent. */
export async function handleIpn(params: Record<string, string>, gw: Gateway) {
  const txnRef = params.vpc_MerchTxnRef ?? "";
  const request = await db.paymentLog.findFirst({ where: { txnRef, kind: "request" }, include: { booking: true } });
  const verified = verify(params, gw);
  const raw = { ...params, vpc_SecureHash: params.vpc_SecureHash ? "***" : "" };
  if (!request) return { ok: false, reason: "unknown_txn" };
  if (!verified) {
    await db.paymentLog.create({ data: { bookingId: request.bookingId, txnRef, kind: "ipn", gateway: gw, amount: 0, currency: request.currency, verified: false, responseCode: params.vpc_TxnResponseCode, raw } });
    return { ok: false, reason: "bad_hash" };
  }
  const already = await db.paymentLog.findFirst({ where: { txnRef, kind: "ipn", verified: true } });
  if (already) return { ok: true, duplicate: true };

  const amount = Number(params.vpc_Amount ?? 0);
  const currencyOk = !params.vpc_Currency || params.vpc_Currency === request.currency;
  const success = params.vpc_TxnResponseCode === "0" && amount === request.amount && currencyOk;
  await db.paymentLog.create({ data: { bookingId: request.bookingId, txnRef, kind: "ipn", gateway: gw, amount, currency: request.currency, verified: true, responseCode: params.vpc_TxnResponseCode, raw } });

  const b = request.booking;
  const baseAmount = Number((request.raw as { baseAmount?: number }).baseAmount ?? 0);
  if (success) {
    await db.booking.update({ where: { id: b.id }, data: { status: "paid", amountPaid: { increment: baseAmount }, expiresAt: null } });
    if (b.discountCode) await db.discountCode.update({ where: { code: b.discountCode }, data: { used: { increment: 1 } } });
    await db.customer.update({ where: { id: b.customerId }, data: { status: "customer" } });
    await logEvent(b.customerId, "payment", `Paid ${formatMoney(amount / 100, request.currency, "en")} for ${b.code}`);
    const { vars, to } = await bookingVars(b.id);
    await notify("booking_confirmation", to, vars);
    await notify("booking_confirmation_chat", to, vars);
    await emit("payment.succeeded", await bookingPayload(b.id));
  } else if (b.status !== "paid") {
    await db.booking.update({ where: { id: b.id }, data: { status: "failed" } });
    await logEvent(b.customerId, "payment", `Payment for ${b.code} failed (code ${params.vpc_TxnResponseCode}${amount !== request.amount || !currencyOk ? ", amount/currency mismatch" : ""})`);
    await emit("payment.failed", { ...(await bookingPayload(b.id)), response_code: params.vpc_TxnResponseCode });
  }
  return { ok: true };
}

export async function releaseSeats(bookingId: number) {
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  await db.departure.update({ where: { id: b.departureId }, data: { seatsBooked: { decrement: b.adults + b.children } } });
}

/** Scheduled jobs (cron every 15 min): expire holds, abandoned-checkout and pre/post-trip messages */
export async function runScheduledJobs() {
  const now = new Date();
  const out = { expired: 0, abandoned: 0, preTrip: 0, postTrip: 0 };

  const expired = await db.booking.findMany({ where: { status: { in: ["pending", "failed"] }, expiresAt: { lt: now } } });
  for (const b of expired) {
    await db.booking.update({ where: { id: b.id }, data: { status: "cancelled" } });
    await releaseSeats(b.id);
    await logEvent(b.customerId, "booking", `Booking ${b.code} hold expired, seats released`);
    out.expired++;
  }

  const pending = await db.booking.findMany({ where: { status: { in: ["pending", "failed"] } } });
  for (const b of pending) {
    const sent = arr(b.remindersSent);
    const age = now.getTime() - b.createdAt.getTime();
    for (const [key, ms, tpl] of [["abandoned_1h", 3600_000, "abandoned_1h"], ["abandoned_24h", 86400_000, "abandoned_24h"]] as const) {
      if (age > ms && !sent.includes(key)) {
        const { vars, to } = await bookingVars(b.id);
        if (b.method === "hold" || b.method === "bank-transfer") await notify("payment_reminder", to, vars);
        else await notify(tpl, to, vars);
        await emit("checkout.abandoned", { ...(await bookingPayload(b.id)), stage: key });
        sent.push(key);
        out.abandoned++;
      }
    }
    await db.booking.update({ where: { id: b.id }, data: { remindersSent: sent } });
  }

  const paid = await db.booking.findMany({ where: { status: "paid" }, include: { departure: true, tour: true } });
  for (const b of paid) {
    const sent = arr(b.remindersSent);
    const until = b.departure.date.getTime() - now.getTime();
    const end = b.departure.date.getTime() + b.tour.days * 86400_000;
    const steps: [string, boolean, string, "trip.upcoming" | "trip.completed"][] = [
      ["pre_3d", until < 3 * 86400_000 && until > 0, "pre_trip_3d", "trip.upcoming"],
      ["pre_1d", until < 86400_000 && until > 0, "pre_trip_1d", "trip.upcoming"],
      ["post", now.getTime() > end, "post_trip", "trip.completed"],
    ];
    for (const [key, due, tpl, ev] of steps) {
      if (due && !sent.includes(key)) {
        const { vars, to } = await bookingVars(b.id);
        await notify(tpl, to, vars);
        await emit(ev, { ...(await bookingPayload(b.id)), stage: key });
        sent.push(key);
        if (key === "post") out.postTrip++; else out.preTrip++;
      }
    }
    await db.booking.update({ where: { id: b.id }, data: { remindersSent: sent } });
  }
  return out;
}
