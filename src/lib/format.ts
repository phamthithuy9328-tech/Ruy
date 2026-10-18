const intl = (l: string) => (l === "vi" ? "vi-VN" : "en-US");
const TZ = "Asia/Ho_Chi_Minh";

export const fmtDate = (d: Date | string, l: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(intl(l), { timeZone: TZ, day: "numeric", month: "short", year: "numeric", ...opts }).format(new Date(d));

export const fmtShort = (d: Date | string, l: string) => new Intl.DateTimeFormat(intl(l), { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(d));

export const fmtWeekday = (d: Date | string, l: string) => new Intl.DateTimeFormat(intl(l), { timeZone: TZ, weekday: "short" }).format(new Date(d));

export const fmtNumber = (n: number, l: string, opts: Intl.NumberFormatOptions = {}) => new Intl.NumberFormat(intl(l), opts).format(n);

/** YYYY-MM-DD in Vietnam time */
export const isoDay = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));

/** Strip Vietnamese diacritics and lowercase (accent-insensitive search) */
export function unaccent(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export const slugify = (s: string) => unaccent(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const readingTime = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 220));
