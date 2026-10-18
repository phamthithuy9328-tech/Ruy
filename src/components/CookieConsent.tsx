"use client";
// Consent banner (GDPR / Decree 13). Analytics (GA4, GTM, Meta Pixel) only load after "Accept all".
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";

const KEY = "amgo_consent";

export function CookieConsent({ locale, gtmId, gaId, pixelId }: { locale: Locale; gtmId?: string; gaId?: string; pixelId?: string }) {
  const d = getDict(locale).cookie;
  const [consent, setConsent] = useState<string | null>("pending");
  useEffect(() => {
    try {
      setConsent(localStorage.getItem(KEY));
    } catch {
      setConsent(null);
    }
  }, []);
  const choose = (v: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setConsent(v);
  };
  return (
    <>
      {consent === "all" && gtmId && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
      )}
      {consent === "all" && gaId && !gtmId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
        </>
      )}
      {consent === "all" && pixelId && (
        <Script id="fbq" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}</Script>
      )}
      {consent === null && (
        <div role="dialog" aria-label="Cookies" className="no-print fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-lift)] sm:flex sm:items-center sm:gap-4">
          <p className="text-sm">
            {d.text} <Link href={lp(locale, "/policies#privacy")} className="font-medium text-primary underline">{d.policy}</Link>
          </p>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            <button type="button" onClick={() => choose("essential")} className="btn btn-outline h-10 min-h-0 text-sm">{d.reject}</button>
            <button type="button" onClick={() => choose("all")} className="btn btn-primary h-10 min-h-0 text-sm">{d.accept}</button>
          </div>
        </div>
      )}
    </>
  );
}
