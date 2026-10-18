import Image from "next/image";
import Link from "next/link";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import { fmtDate, readingTime } from "@/lib/format";
import type { Post } from "@prisma/client";

export function PostCard({ post: raw, locale }: { post: Post; locale: Locale }) {
  const d = getDict(locale).blog;
  const p = loc(raw, locale);
  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={raw.image} alt="" fill unoptimized sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      </div>
      <div className="grid gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{d.categories[raw.category] ?? raw.category}</p>
        <h3 className="line-clamp-2 text-base font-semibold">
          <Link href={lp(locale, `/blog/${raw.slug}`)} className="after:absolute after:inset-0">{p.title}</Link>
        </h3>
        <p className="line-clamp-2 text-sm">{p.excerpt}</p>
        <p className="text-xs text-muted">
          {fmtDate(raw.publishedAt, locale)} · {d.minRead(readingTime(p.content))}
        </p>
      </div>
    </article>
  );
}
