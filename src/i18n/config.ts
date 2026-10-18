// Ngôn ngữ: tiếng Anh là chủ đạo (không có tiền tố URL), các ngôn ngữ khác có tiền tố (/vi/...).
// Thêm ngôn ngữ mới: thêm mã vào `locales`, tạo file từ điển, thêm bản dịch nội dung vào cột `tr`.
export const locales = ["en", "vi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeNames: Record<Locale, string> = { en: "English", vi: "Tiếng Việt" };
export const htmlLang: Record<Locale, string> = { en: "en", vi: "vi" };
export const ogLocale: Record<Locale, string> = { en: "en_US", vi: "vi_VN" };

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);

/** Ghép đường dẫn theo ngôn ngữ: en → /tours, vi → /vi/tours */
export function lp(locale: Locale, path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

/** Ngôn ngữ gợi ý theo quốc gia (header geo của Vercel/Cloudflare) */
export const countryLocale: Record<string, Locale> = { VN: "vi" };
