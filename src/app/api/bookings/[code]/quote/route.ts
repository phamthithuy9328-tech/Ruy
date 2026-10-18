import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargeCurrencyFor, quote, toCharge } from "@/lib/booking";
import { convert, isCurrency, rateBetween } from "@/lib/currency";
import { canCheckout } from "../guard";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await canCheckout(code))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await db.booking.findUnique({ where: { code } });
  if (!b) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const url = new URL(req.url);
  const promo = url.searchParams.get("promo");
  const method = url.searchParams.get("method") ?? "onepay-intl";
  const plan = url.searchParams.get("plan") === "deposit" ? "deposit" : "full";
  const display = isCurrency(url.searchParams.get("currency")) ? url.searchParams.get("currency")! : b.currency;
  const q = await quote(b.departureId, b.adults, b.children, b.infants, promo);
  const balance = b.status === "paid" && b.amountPaid < b.total;
  const due = balance ? b.total - b.amountPaid : plan === "deposit" ? q.deposit : q.total;
  const chargeCurrency = chargeCurrencyFor(method, q.base);
  const minor = toCharge(due, q.base, chargeCurrency, q.fx);
  const conv = (v: number) => convert(v, q.base, display, q.fx);
  return NextResponse.json({
    status: b.status, balance,
    base: q.base, display,
    subtotal: conv(q.subtotal), discount: conv(q.discount), total: conv(q.total), deposit: conv(q.deposit), due: conv(due),
    discountCode: q.discountCode, discountError: q.discountError,
    charge: { currency: chargeCurrency, amount: minor / 100, rate: rateBetween(display, chargeCurrency, q.fx) },
    expiresAt: b.expiresAt,
  });
}
