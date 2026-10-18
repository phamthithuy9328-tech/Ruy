// Multi-currency. Prices are stored in each tour's base currency; display prices are converted
// with USD-pivot rates kept in the Setting table (key "fx"), refreshed daily by the cron job and
// editable in Admin › Settings (manual overrides, markup %, rounding per currency).
export const currencies = ["USD", "VND", "EUR", "GBP", "AUD", "SGD", "KRW", "JPY"] as const;
export type Currency = (typeof currencies)[number];
export const defaultCurrency: Currency = "USD";

export type FxConfig = {
  rates: Record<string, number>; // units per 1 USD
  overrides: Record<string, number>; // manual rates win over fetched ones
  markupPercent: number; // applied when converting between different currencies
  rounding: Record<string, number>; // round converted prices to this step (e.g. USD 1, VND 1000)
  enabled: string[];
  updatedAt: string | null;
};

export const defaultFx: FxConfig = {
  rates: { USD: 1, VND: 26300, EUR: 0.86, GBP: 0.75, AUD: 1.53, SGD: 1.29, KRW: 1390, JPY: 150 },
  overrides: {},
  markupPercent: 0,
  rounding: { USD: 1, VND: 1000, EUR: 1, GBP: 1, AUD: 1, SGD: 1, KRW: 1000, JPY: 100 },
  enabled: [...currencies],
  updatedAt: null,
};

export const currencyNames: Record<Currency, string> = {
  USD: "US Dollar", VND: "Vietnamese Dong", EUR: "Euro", GBP: "British Pound", AUD: "Australian Dollar", SGD: "Singapore Dollar", KRW: "South Korean Won", JPY: "Japanese Yen",
};

export const isCurrency = (v: string | undefined | null): v is Currency => !!v && (currencies as readonly string[]).includes(v);

const EUROZONE = ["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"];

/** Default geo → currency mapping (editable via the "geo" setting) */
export function currencyForCountry(country?: string | null, map?: Record<string, string>): Currency {
  const c = country?.toUpperCase();
  if (!c) return defaultCurrency;
  if (map?.[c] && isCurrency(map[c])) return map[c] as Currency;
  if (c === "VN") return "VND";
  if (EUROZONE.includes(c)) return "EUR";
  const direct: Record<string, Currency> = { GB: "GBP", AU: "AUD", SG: "SGD", KR: "KRW", JP: "JPY" };
  return direct[c] ?? defaultCurrency;
}

const rateOf = (fx: FxConfig, c: string) => fx.overrides[c] ?? fx.rates[c] ?? 1;

/** Convert an amount between currencies, optionally rounding to the target currency's step */
export function convert(amount: number, from: string, to: string, fx: FxConfig, round = true) {
  if (from === to) return amount;
  const usd = amount / rateOf(fx, from);
  let v = usd * rateOf(fx, to) * (1 + fx.markupPercent / 100);
  if (round) {
    const step = fx.rounding[to] ?? 1;
    v = Math.round(v / step) * step;
  }
  return v;
}

/** Exchange rate "1 FROM = x TO", for showing on checkout */
export const rateBetween = (from: string, to: string, fx: FxConfig) => (rateOf(fx, to) / rateOf(fx, from)) * (1 + (from === to ? 0 : fx.markupPercent / 100));

export function formatMoney(amount: number, currency: string, locale: string) {
  const intl = locale === "vi" ? "vi-VN" : "en-US";
  return new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: ["VND", "KRW", "JPY"].includes(currency) ? 0 : amount % 1 ? 2 : 0 }).format(amount);
}

/** Display context passed from server to client components */
export type Money = { currency: Currency; locale: string; fx: FxConfig };

export const money = (amount: number, base: string, m: Money) => formatMoney(convert(amount, base, m.currency, m.fx), m.currency, m.locale);
