// Customer is redirected here by OnePay. Display only: verify the hash, log, show the result page.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verify, type Gateway } from "@/lib/onepay";
import { lp, isLocale } from "@/i18n/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  const gw = (params.gw === "intl" ? "intl" : "domestic") as Gateway;
  delete params.gw;
  const txnRef = params.vpc_MerchTxnRef ?? "";
  const request = await db.paymentLog.findFirst({ where: { txnRef, kind: "request" }, include: { booking: true } });
  if (!request) return NextResponse.redirect(new URL("/", req.url));
  const ok = verify(params, gw);
  await db.paymentLog.create({
    data: { bookingId: request.bookingId, txnRef, kind: "return", gateway: gw, amount: Number(params.vpc_Amount ?? 0), currency: request.currency, verified: ok, responseCode: params.vpc_TxnResponseCode, raw: { ...params, vpc_SecureHash: "***" } },
  });
  const l = isLocale(request.booking.locale) ? request.booking.locale : "en";
  const r = ok ? params.vpc_TxnResponseCode : "hash";
  return NextResponse.redirect(new URL(`${lp(l, "/payment/result")}?code=${request.booking.code}&r=${encodeURIComponent(r ?? "")}`, req.url));
}
