import Link from "next/link";
import Image from "next/image";
import { getDict, loc } from "@/i18n";
import { lp, type Locale } from "@/i18n/config";
import type { Destination } from "@prisma/client";

type Props = { dest: Destination & { _count: { tours: number } }; topTours: { slug: string; title: string; tr: unknown }[]; locale: Locale; large?: boolean };

export function DestinationTile({ dest: raw, topTours, locale, large }: Props) {
  const d = getDict(locale);
  const dest = loc(raw, locale);
  return (
    <div className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-surface ${large ? "aspect-[4/3] sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]"}`}>
      <Image src={raw.image} alt="" fill unoptimized sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="text-lg font-bold text-white">
          <Link href={lp(locale, `/destinations/${raw.slug}`)} className="after:absolute after:inset-0">
            {dest.name}
          </Link>
        </h3>
        <p className="text-sm text-white/85">{d.nav.toursCount(raw._count.tours)}</p>
        {topTours.length > 0 && (
          <ul className="mt-0 grid max-h-0 gap-1 overflow-hidden text-sm opacity-0 transition-all duration-300 group-hover:mt-2 group-hover:max-h-40 group-hover:opacity-100 group-focus-within:mt-2 group-focus-within:max-h-40 group-focus-within:opacity-100">
            {topTours.map((t) => (
              <li key={t.slug} className="relative z-10">
                <Link href={lp(locale, `/tour/${t.slug}`)} className="line-clamp-1 hover:underline">
                  → {loc(t, locale).title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
