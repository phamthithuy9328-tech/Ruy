import Link from "next/link";
import { getDict } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { postCategorySlugs } from "@/lib/taxonomy";

export function BlogHeader({ locale, active }: { locale: Locale; active?: string }) {
  const d = getDict(locale).blog;
  return (
    <nav aria-label={d.title} className="container-x no-scrollbar mb-8 flex gap-2 overflow-x-auto">
      {[["", d.all], ...postCategorySlugs.map((c) => [c, d.categories[c]])].map(([slug, label]) => (
        <Link key={slug} href={lp(locale, slug ? `/blog/${slug}` : "/blog")} aria-current={active === slug ? "page" : undefined} className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${active === slug ? "border-primary bg-primary text-white" : "border-line text-ink hover:border-primary"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

