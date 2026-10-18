import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/700.css";
import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { CookieConsent } from "@/components/CookieConsent";
import { LanguageSuggestion } from "@/components/LanguageSuggestion";
import { JsonLd } from "@/components/JsonLd";
import { getDict } from "@/i18n";
import { htmlLang, isLocale, locales } from "@/i18n/config";
import { getMoney } from "@/lib/request";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const generateStaticParams = () => locales.map((locale) => ({ locale }));
export const dynamicParams = false;

export const viewport: Viewport = { themeColor: "#0F766E", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDict(locale);
  return {
    metadataBase: new URL(site.url),
    ...pageMeta({ locale, path: "/", title: d.meta.title, description: d.meta.description }),
    title: { default: d.meta.title, template: "%s | AmGo Travel" },
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
    icons: { icon: "/icon.svg" },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = await getMoney(locale);
  return (
    <html lang={htmlLang[locale]}>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        <LanguageSuggestion locale={locale} />
        <Header locale={locale} m={m} />
        <main id="main">{children}</main>
        <Footer locale={locale} />
        <FloatingContact locale={locale} whatsapp={site.whatsapp} zalo={site.zalo} messenger={site.messenger} tel={site.hotlineTel} />
        <CookieConsent locale={locale} gtmId={process.env.NEXT_PUBLIC_GTM_ID} gaId={process.env.NEXT_PUBLIC_GA_ID} pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            name: site.name,
            url: site.url,
            telephone: site.hotline,
            email: site.email,
            address: { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "VN" },
            sameAs: Object.values(site.social),
          }}
        />
      </body>
    </html>
  );
}
