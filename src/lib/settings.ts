import "server-only";
import { cache } from "react";
import { db } from "./db";
import { defaultFx, type FxConfig } from "./currency";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return { ...fallback, ...JSON.parse(row.value) } as T;
  } catch {
    return fallback;
  }
}

export const setSetting = (key: string, value: unknown) =>
  db.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });

export const getFx = cache(() => getSetting<FxConfig>("fx", defaultFx));

/** Daily refresh from a free rates API (override with FX_API_URL). Manual overrides are kept. */
export async function refreshRates() {
  const url = process.env.FX_API_URL ?? "https://open.er-api.com/v6/latest/USD";
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  if (!data.rates) throw new Error("FX API returned no rates");
  const fx = await getSetting<FxConfig>("fx", defaultFx);
  const rates = { ...fx.rates };
  for (const c of Object.keys(rates)) if (data.rates[c]) rates[c] = data.rates[c];
  await setSetting("fx", { ...fx, rates, updatedAt: new Date().toISOString() });
  return rates;
}
