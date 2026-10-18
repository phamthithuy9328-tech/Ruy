import "server-only";
import { cookies, headers } from "next/headers";
import { defaultCurrency, isCurrency, type Currency, type Money } from "./currency";
import { getFx } from "./settings";
import type { Locale } from "@/i18n/config";

/** Visitor's display currency: their saved choice, else the geo default set by middleware */
export async function getMoney(locale: Locale): Promise<Money> {
  const [c, h, fx] = await Promise.all([cookies(), headers(), getFx()]);
  const fromCookie = c.get("cur")?.value;
  const fromGeo = h.get("x-amgo-currency");
  const ok = (v: string | undefined | null) => isCurrency(v) && fx.enabled.includes(v);
  const currency = (ok(fromCookie) ? fromCookie : ok(fromGeo) ? fromGeo : defaultCurrency) as Currency;
  return { currency, locale, fx };
}

export async function getCountry() {
  const h = await headers();
  return h.get("x-amgo-country");
}
