"use client";
import { Turnstile, turnstileToken } from "../Turnstile";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar, Check, Lock, Users } from "lucide-react";
import { PaymentLogos } from "../PaymentLogos";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { formatMoney, type Money } from "@/lib/currency";
import { fmtDate } from "@/lib/format";

type Summary = {
  slug: string; title: string; image: string; destination: string; date: string; departureId: number;
  adults: number; children: number; infants: number; depositPercent: number; allowHold: boolean; allowTransfer: boolean; holdHours: number;
};
type Quote = {
  status: string; balance: boolean; display: string; subtotal: number; discount: number; total: number; deposit: number; due: number; discountCode: string | null; discountError: string | null;
  charge: { currency: string; amount: number; rate: number }; expiresAt: string | null;
};

export function Checkout({ locale, m, s, existingCode }: { locale: Locale; m: Money; s: Summary; existingCode?: string }) {
  const d = getDict(locale);
  const c = d.checkout;
  const router = useRouter();
  const [step, setStep] = useState(existingCode ? 2 : 1);
  const [code, setCode] = useState(existingCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", nationality: "", note: "" });
  const [travelers, setTravelers] = useState<string[]>(Array(s.adults + s.children + s.infants).fill(""));
  const [touched, setTouched] = useState(false);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [plan, setPlan] = useState<"full" | "deposit">("full");
  const [method, setMethod] = useState("onepay-intl");
  const [q, setQ] = useState<Quote | null>(null);

  const fmt = (v: number, cur: string = m.currency) => formatMoney(v, cur, locale);
  const err = (k?: string) => d.errors[k ?? "generic"] ?? d.errors.generic;

  useEffect(() => {
    if (!code) return;
    const p = new URLSearchParams({ method, plan, currency: m.currency, ...(appliedPromo ? { promo: appliedPromo } : {}) });
    const ctrl = new AbortController(); // only the latest quote may win
    fetch(`/api/bookings/${code}/quote?${p}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (r.ok) setQ(await r.json());
        else setError(err((await r.json().catch(() => ({}))).error));
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, method, plan, appliedPromo, m.currency]);

  const invalid = {
    name: form.name.trim().length < 2 && c.required,
    phone: !/^\+?[\d\s().-]{7,20}$/.test(form.phone.trim()) && c.invalidPhone,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && c.invalidEmail,
  };

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.values(invalid).some(Boolean)) return;
    setBusy(true);
    setError("");
    const types = [...Array(s.adults).fill("adult"), ...Array(s.children).fill("child"), ...Array(s.infants).fill("infant")];
    const utm = Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([k]) => k.startsWith("utm_")));
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tourSlug: s.slug, departureId: s.departureId, adults: s.adults, children: s.children, infants: s.infants, ...form,
        passengers: travelers.map((name, i) => ({ name, type: types[i] })), locale, currency: m.currency, utm, page: window.location.pathname, turnstile: turnstileToken(e.currentTarget as HTMLFormElement),
      }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(err(data.error));
    setCode(data.code);
    window.history.replaceState(null, "", `${window.location.pathname}?booking=${data.code}`);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay() {
    if (!agree) return setError(c.mustAgree);
    setBusy(true);
    setError("");
    const r = await fetch(`/api/bookings/${code}/pay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, plan, promo: appliedPromo, agree: true }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setBusy(false);
      return setError(err(data.error));
    }
    if (data.redirect.startsWith("http")) window.location.href = data.redirect;
    else router.push(data.redirect);
  }

  const field = (k: keyof typeof form, label: string, type = "text", auto?: string, opt = false) => (
    <div>
      <label htmlFor={`co-${k}`} className="label">{label}{opt && <span className="font-normal text-muted"> ({d.common.optional})</span>}</label>
      <input id={`co-${k}`} type={type} autoComplete={auto} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={touched && !!invalid[k as keyof typeof invalid]} className="input" />
      {touched && invalid[k as keyof typeof invalid] && <p className="mt-1 text-sm text-danger">{invalid[k as keyof typeof invalid]}</p>}
    </div>
  );

  const methods = [
    { id: "onepay-intl", show: true },
    { id: "onepay-domestic", show: true },
    { id: "onepay-qr", show: true },
    { id: "bank-transfer", show: s.allowTransfer },
    { id: "hold", show: s.allowHold },
  ].filter((x) => x.show);
  const offline = method === "hold" || method === "bank-transfer";

  return (
    <div className="container-x grid gap-8 pb-16 lg:grid-cols-[1fr_380px]">
      <div>
        {/* Progress */}
        <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Progress">
          {c.steps.map((label, i) => (
            <li key={label} aria-current={step === i + 1 ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${step > i ? "bg-primary" : "bg-line"}`} />
              <p className={`mt-2 flex items-center gap-1 text-sm ${step === i + 1 ? "font-semibold text-ink" : "text-muted"}`}>
                {step > i + 1 && <Check className="size-4 text-primary" />} {i + 1}. {label}
              </p>
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

        {step === 1 && (
          <form onSubmit={submitDetails} noValidate className="grid gap-4">
            <h1 className="text-2xl">{c.contact}</h1>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", c.name, "text", "name")}
              {field("email", c.email, "email", "email")}
              {field("phone", c.phone, "tel", "tel")}
              {field("nationality", c.nationality, "text", "country-name", true)}
            </div>
            <div>
              <label htmlFor="co-note" className="label">{c.requests} <span className="font-normal text-muted">({d.common.optional})</span></label>
              <textarea id="co-note" rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" />
            </div>
            <details className="rounded-xl border border-line p-4">
              <summary className="font-semibold text-ink">{c.travelers}</summary>
              <p className="mt-1 text-sm text-muted">{c.addLater}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {travelers.map((t, i) => (
                  <input key={i} aria-label={`${c.name} ${i + 1}`} placeholder={`${i + 1}. ${c.name}`} value={t} onChange={(e) => setTravelers(travelers.map((x, j) => (j === i ? e.target.value : x)))} className="input" />
                ))}
              </div>
            </details>
            <Turnstile locale={locale} />
            <button className="btn btn-primary w-full sm:w-auto sm:justify-self-end sm:px-10" disabled={busy}>{busy ? c.processing : c.continue}</button>
          </form>
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <h1 className="text-2xl">{c.steps[1]}</h1>
            <div>
              <label htmlFor="co-promo" className="label">{c.promo}</label>
              <div className="flex gap-2">
                <input id="co-promo" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} className="input max-w-xs uppercase" />
                <button type="button" onClick={() => setAppliedPromo(promo || null)} className="btn btn-outline">{c.apply}</button>
              </div>
              {q?.discountError && <p className="mt-1 text-sm text-danger">{err(q.discountError)}</p>}
              {q?.discountCode && <p className="mt-1 text-sm text-success">✓ {q.discountCode}</p>}
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
              <span>{c.agree} <Link href={lp(locale, "/policies#terms")} target="_blank" className="font-medium text-primary underline">{c.terms}</Link></span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => (agree ? (setError(""), setStep(3)) : setError(c.mustAgree))} className="btn btn-primary px-10">{c.continue}</button>
            </div>
          </div>
        )}

        {step === 3 && q && (
          <div className="grid gap-5">
            <h1 className="text-2xl">{c.steps[2]}</h1>
            {q.balance ? (
              <p className="rounded-xl border border-primary bg-primary-soft/40 p-4 font-semibold text-ink">{d.manage.due}: {fmt(q.due)}</p>
            ) : (
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="label">{c.payNow}</legend>
              {(["full", "deposit"] as const).map((p) => (
                <label key={p} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${plan === p ? "border-primary bg-primary-soft/40" : "border-line"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} className="accent-[var(--color-primary)]" />
                    <span className="font-medium text-ink">{p === "full" ? c.payFull : c.payDeposit(s.depositPercent)}</span>
                  </span>
                  <span className="font-semibold text-ink">{fmt(p === "full" ? q.total : q.deposit)}</span>
                </label>
              ))}
            </fieldset>
            )}
            <fieldset className="grid gap-2">
              <legend className="label">{c.method}</legend>
              {methods.filter((x) => !q.balance || x.id !== "hold").map((x) => (
                <label key={x.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 ${method === x.id ? "border-primary bg-primary-soft/40" : "border-line"}`}>
                  <input type="radio" name="method" checked={method === x.id} onChange={() => setMethod(x.id)} className="accent-[var(--color-primary)]" />
                  <span className="text-ink">{c.methods[x.id]}</span>
                </label>
              ))}
            </fieldset>
            {method === "hold" ? (
              <p className="rounded-xl bg-surface p-4 text-sm">{c.holdNote(s.holdHours)}</p>
            ) : (
              <div className="rounded-xl bg-surface p-4 text-sm">
                {q.charge.currency !== m.currency && <p className="mb-2 text-muted">{c.displayNote(m.currency)}</p>}
                <p className="text-base font-semibold text-ink">{c.charged(fmt(q.charge.amount, q.charge.currency))}</p>
                {q.charge.currency !== m.currency && <p className="text-muted">{c.rate(`1 ${m.currency} = ${formatMoney(q.charge.rate, q.charge.currency, locale)}`)}</p>}
              </div>
            )}
            <button type="button" onClick={pay} disabled={busy} className="btn btn-primary h-14 text-base">
              <Lock className="size-4" /> {busy ? c.processing : offline ? c.confirm : c.pay(fmt(q.charge.amount, q.charge.currency))}
            </button>
            <p className="flex items-center gap-2 text-xs text-muted"><Lock className="size-3.5" /> {c.secure}</p>
            <PaymentLogos />
          </div>
        )}

        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)} className="mt-4 text-sm font-medium text-muted hover:text-ink" hidden={step === 2 && !!existingCode}>← {c.back}</button>
        )}
      </div>

      {/* Order summary */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="relative aspect-[16/9]">
            <Image src={s.image} alt="" fill unoptimized className="object-cover" sizes="380px" />
          </div>
          <div className="grid gap-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{s.destination}</p>
            <p className="font-semibold text-ink">{s.title}</p>
            <p className="flex items-center gap-2 text-sm"><Calendar className="size-4 text-muted" /> {fmtDate(s.date, locale, { weekday: "long" })}</p>
            <p className="flex items-center gap-2 text-sm"><Users className="size-4 text-muted" /> {s.adults} {d.tour.adults}{s.children ? `, ${s.children} ${d.tour.children}` : ""}{s.infants ? `, ${s.infants} ${d.tour.infants}` : ""}</p>
            {q && (
              <dl className="mt-2 grid gap-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><dt>{c.subtotal}</dt><dd>{fmt(q.subtotal)}</dd></div>
                {q.discount > 0 && <div className="flex justify-between text-success"><dt>{c.discount}</dt><dd>−{fmt(q.discount)}</dd></div>}
                <div className="flex justify-between text-base font-bold text-ink"><dt>{c.total}</dt><dd>{fmt(q.total)}</dd></div>
                {q.expiresAt && <p className="pt-2 text-xs text-warning">{c.expires(fmtDate(q.expiresAt, locale, { hour: "2-digit", minute: "2-digit" }))}</p>}
              </dl>
            )}
            {code && <p className="text-xs text-muted">{d.result.code}: <b className="text-ink">{code}</b></p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
