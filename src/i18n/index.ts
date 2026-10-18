import en, { type Dict } from "./en";
import vi from "./vi";
import { defaultLocale, type Locale } from "./config";

const dicts: Record<Locale, Dict> = { en, vi };
export const getDict = (l: Locale) => dicts[l] ?? dicts[defaultLocale];
export type { Dict };

/** Localized content: merge `tr[locale]` over the English fields, falling back to English */
export function loc<T extends { tr: unknown }>(row: T, l: Locale): T {
  if (l === defaultLocale) return row;
  const t = (row.tr as Record<string, Partial<T>> | null)?.[l];
  if (!t) return row;
  const out = { ...row };
  for (const [k, v] of Object.entries(t)) if (v !== null && v !== undefined && v !== "") (out as Record<string, unknown>)[k] = v;
  return out;
}
