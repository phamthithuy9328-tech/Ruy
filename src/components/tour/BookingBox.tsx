"use client";
import Link from "next/link";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useBooking, type Dep } from "./BookingContext";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { money, type Money } from "@/lib/currency";
import { fmtDate } from "@/lib/format";

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`− ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-line text-ink disabled:opacity-40"><Minus className="size-4" /></button>
        <span className="w-5 text-center font-semibold text-ink" aria-live="polite">{value}</span>
        <button type="button" aria-label={`+ ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-line text-ink disabled:opacity-40"><Plus className="size-4" /></button>
      </div>
    </div>
  );
}

export function BookingBox({ locale, m, base, deps, slug, priceFrom, whatsapp, allowHold }: { locale: Locale; m: Money; base: string; deps: Dep[]; slug: string; priceFrom: number; whatsapp: string; allowHold: boolean }) {
  const d = getDict(locale);
  const t = d.tour;
  const b = useBooking();
  const dep = deps.find((x) => x.id === b.depId) ?? null;
  const seats = b.adults + b.children;
  const total = dep ? b.adults * dep.adult + b.children * dep.child + b.infants * dep.infant : 0;
  const max = dep ? Math.min(dep.left, 20) : 20;
  const href = dep ? `${lp(locale, `/book/${slug}`)}?dep=${dep.id}&a=${b.adults}&c=${b.children}&i=${b.infants}` : "#";

  return (
    <div id="booking" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-muted">{d.card.from}</p>
      <p className="text-2xl font-bold text-ink">
        {money(priceFrom, base, m)} <span className="text-sm font-normal text-muted">{t.perPerson}</span>
      </p>
      <label htmlFor="bb-date" className="label mt-4">{t.chooseDate}</label>
      <select id="bb-date" className="input" value={b.depId ?? ""} onChange={(e) => b.setDepId(Number(e.target.value))}>
        {!dep && <option value="">{t.chooseDate}</option>}
        {deps.map((x) => (
          <option key={x.id} value={x.id} disabled={x.left <= 0}>
            {fmtDate(x.date, locale, { weekday: "short" })} · {money(x.adult, base, m)} · {t.seatsLeft(x.left)}
          </option>
        ))}
      </select>
      <div className="mt-3 divide-y divide-line">
        <Stepper label={t.adults} hint={t.ages.adult} value={b.adults} min={1} max={max - b.children} onChange={(v) => b.setGuests("adults", v)} />
        <Stepper label={t.children} hint={t.ages.child} value={b.children} min={0} max={max - b.adults} onChange={(v) => b.setGuests("children", v)} />
        <Stepper label={t.infants} hint={t.ages.infant} value={b.infants} min={0} max={4} onChange={(v) => b.setGuests("infants", v)} />
      </div>
      {dep && (
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-medium text-ink">{t.total}</span>
          <span className="text-xl font-bold text-ink" aria-live="polite">{money(total, base, m)}</span>
        </div>
      )}
      <Link href={href} aria-disabled={!dep || seats > (dep?.left ?? 0)} className={`btn btn-primary mt-4 w-full text-base ${!dep ? "pointer-events-none opacity-50" : ""}`}>
        {t.bookNow}
      </Link>
      <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-outline mt-2 w-full">{t.askWhatsapp}</a>
      <ul className="mt-4 grid gap-1 text-xs text-muted">
        <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-success" /> {t.freeCancel}</li>
        {allowHold && <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-success" /> {t.reserve}</li>}
      </ul>
    </div>
  );
}

export function MobileBookBar({ locale, m, base, priceFrom }: { locale: Locale; m: Money; base: string; priceFrom: number }) {
  const d = getDict(locale);
  const onRequest = priceFrom <= 0;
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 lg:hidden">
      <div>
        {onRequest ? <p className="text-lg font-bold text-ink">{d.card.onRequest}</p> : <>
          <p className="text-xs text-muted">{d.card.from}</p>
          <p className="text-lg font-bold text-ink">{money(priceFrom, base, m)}</p>
        </>}
      </div>
      <a href="#booking" className="btn btn-primary px-8">{onRequest ? d.tour.getQuote : d.tour.bookNow}</a>
    </div>
  );
}
