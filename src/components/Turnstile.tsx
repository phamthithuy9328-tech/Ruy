"use client";
// Cloudflare Turnstile bot check. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set;
// the widget adds a hidden "cf-turnstile-response" field to the surrounding form.
import Script from "next/script";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile({ locale }: { locale: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language={locale} data-size="flexible" />
    </>
  );
}

export const turnstileToken = (form: HTMLFormElement) => (new FormData(form).get("cf-turnstile-response") as string | null) ?? undefined;
