"use client";
// Dismissible "View this page in Tiếng Việt?" bar, instead of forcing a redirect (crawlers never see it).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { barePath } from "./PrefsSwitcher";
import { getDict } from "@/i18n";
import { isLocale, localeNames, lp, type Locale } from "@/i18n/config";

const cookie = (k: string) => document.cookie.split("; ").find((c) => c.startsWith(k + "="))?.split("=")[1];

export function LanguageSuggestion({ locale }: { locale: Locale }) {
  const [target, setTarget] = useState<Locale | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const s = cookie("lang_suggest");
    if (!cookie("lang_pref") && s && isLocale(s) && s !== locale) setTarget(s);
  }, [locale]);
  if (!target) return null;
  const dismiss = () => {
    document.cookie = `lang_pref=${locale}; path=/; max-age=31536000; samesite=lax`;
    setTarget(null);
  };
  const t = getDict(target).prefs; // ask in the suggested language
  return (
    <div className="bg-ink text-white">
      <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-sm">
        <span>{t.suggest(localeNames[target])}</span>
        <button
          type="button"
          className="rounded-md bg-white px-3 py-1 font-semibold text-ink"
          onClick={() => {
            document.cookie = `lang_pref=${target}; path=/; max-age=31536000; samesite=lax`;
            router.push(lp(target, barePath(pathname)));
          }}
        >
          {t.switchTo(localeNames[target])}
        </button>
        <button type="button" className="underline-offset-2 hover:underline" onClick={dismiss}>{t.stay}</button>
        <button type="button" aria-label="Close" onClick={dismiss} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
