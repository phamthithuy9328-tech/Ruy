"use client";
import { Turnstile } from "./Turnstile";
import { useState } from "react";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";

type Props = { locale: Locale; type: "enquiry" | "custom-tour" | "contact" | "newsletter"; tourSlug?: string; compact?: boolean; className?: string };

/** Lead capture: quick quote (name + email/WhatsApp), private-trip planner, contact and newsletter */
export function LeadForm({ locale, type, tourSlug, compact, className = "" }: Props) {
  const d = getDict(locale);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    if (fd.website) return; // honeypot
    setState("sending");
    const utm = Object.fromEntries([...new URLSearchParams(window.location.search)].filter(([k]) => k.startsWith("utm_")));
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...fd, turnstile: fd["cf-turnstile-response"] || undefined, type, tourSlug, locale, page: window.location.pathname, utm }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
  }

  if (state === "sent") return <p className={`rounded-lg bg-primary-soft p-4 text-sm font-medium text-primary-hover ${className}`} role="status">{d.lead.sent}</p>;

  if (type === "newsletter")
    return (
      <form onSubmit={submit} className={`flex gap-2 ${className}`}>
        <label htmlFor="nl-email" className="sr-only">{d.footer.emailPlaceholder}</label>
        <input id="nl-email" name="contact" type="email" required placeholder={d.footer.emailPlaceholder} className="input" />
        <input type="hidden" name="name" value="Newsletter" />
        <button className="btn btn-primary shrink-0" disabled={state === "sending"}>{d.footer.subscribe}</button>
      </form>
    );

  return (
    <form onSubmit={submit} className={`grid gap-3 ${className}`}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className="label" htmlFor={`${type}-name`}>{d.lead.name}</label>
        <input id={`${type}-name`} name="name" required maxLength={100} autoComplete="name" className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`${type}-contact`}>{d.lead.contact}</label>
        <input id={`${type}-contact`} name="contact" required maxLength={120} autoComplete="email" className="input" />
      </div>
      {type === "custom-tour" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ct-size">{d.lead.groupSize}</label>
            <input id="ct-size" name="groupSize" type="number" min={1} max={500} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="ct-dates">{d.lead.dates}</label>
            <input id="ct-dates" name="dates" maxLength={60} className="input" />
          </div>
        </div>
      )}
      {!compact && (
        <div>
          <label className="label" htmlFor={`${type}-msg`}>{d.lead.message}</label>
          <textarea id={`${type}-msg`} name="message" rows={3} maxLength={2000} className="input" />
        </div>
      )}
      <Turnstile locale={locale} />
      <button className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? d.common.loading : d.lead.send}</button>
      {state === "error" && <p className="text-sm text-danger" role="alert">{d.lead.error}</p>}
    </form>
  );
}
