"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBooking, type Dep } from "./BookingContext";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { convert, formatMoney, type Money } from "@/lib/currency";
import { isoDay } from "@/lib/format";

/** Month calendar with price per date; picking a date updates the booking box */
export function PriceCalendar({ locale, m, base, deps }: { locale: Locale; m: Money; base: string; deps: Dep[] }) {
  const t = getDict(locale).tour;
  const b = useBooking();
  const byDay = useMemo(() => new Map(deps.map((x) => [isoDay(x.date), x])), [deps]);
  const first = deps[0] ? new Date(isoDay(deps[0].date) + "T00:00:00") : new Date();
  const [month, setMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const last = deps.at(-1) ? new Date(isoDay(deps.at(-1)!.date) + "T00:00:00") : first;
  const intl = locale === "vi" ? "vi-VN" : "en-US";
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intl, { weekday: "narrow" }).format(new Date(2026, 0, 5 + i)));
  const startPad = (month.getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const compact = (v: number) => {
    const c = convert(v, base, m.currency, m.fx);
    return m.currency === "VND" ? `${Math.round(c / 1000)}k` : formatMoney(c, m.currency, locale);
  };
  const sel = deps.find((x) => x.id === b.depId);

  if (!deps.length) return <p className="text-muted">{t.noDates}</p>;
  return (
    <div className="max-w-xl">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label={t.prevMonth} disabled={month <= new Date(first.getFullYear(), first.getMonth(), 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-30"><ChevronLeft className="size-5" /></button>
        <p className="font-semibold capitalize text-ink">{new Intl.DateTimeFormat(intl, { month: "long", year: "numeric" }).format(month)}</p>
        <button type="button" aria-label={t.nextMonth} disabled={month >= new Date(last.getFullYear(), last.getMonth(), 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-30"><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {weekdays.map((w, i) => <span key={i} className="py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }, (_, i) => <span key={`p${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const dep = byDay.get(key);
          const active = dep && dep.id === b.depId;
          return dep ? (
            <button
              key={key}
              type="button"
              disabled={dep.left <= 0}
              onClick={() => b.setDepId(dep.id)}
              aria-pressed={active}
              aria-label={`${key} ${compact(dep.adult)} ${t.seatsLeft(dep.left)}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${active ? "border-primary bg-primary text-white" : "border-primary/30 bg-primary-soft/40 text-ink hover:border-primary"} disabled:opacity-40`}
            >
              <span className="font-semibold">{i + 1}</span>
              <span className={`text-[10px] leading-tight ${active ? "text-white" : "text-primary-hover"}`}>{compact(dep.adult)}</span>
            </button>
          ) : (
            <span key={key} className="flex aspect-square items-center justify-center text-sm text-muted/50">{i + 1}</span>
          );
        })}
      </div>
      {sel && (
        <table className="mt-4 w-full text-sm">
          <tbody>
            {([[t.adult, sel.adult], [t.child, sel.child], [t.infant, sel.infant]] as const).map(([l, v]) => (
              <tr key={l} className="border-b border-line">
                <td className="py-2 text-ink">{l}</td>
                <td className="py-2 text-right font-semibold text-ink">{formatMoney(convert(v, base, m.currency, m.fx), m.currency, locale)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 text-muted" colSpan={2}>{t.seatsLeft(sel.left)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
