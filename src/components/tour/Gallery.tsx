"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";

export function Gallery({ images, title, locale }: { images: string[]; title: string; locale: Locale }) {
  const d = getDict(locale);
  const labels = { all: d.tour.allPhotos, photo: d.tour.photo, close: d.nav.close };
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;
  // Mosaic of 5, 3, 2 or 1 photos depending on how many the tour has
  const shown = n >= 5 ? 5 : n >= 3 ? 3 : n;
  const grid: Record<number, string> = { 5: "md:grid-cols-4 md:grid-rows-2", 3: "md:grid-cols-3 md:grid-rows-2", 2: "md:grid-cols-2", 1: "", 0: "" };
  const first: Record<number, string> = { 5: "aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto", 3: "aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto", 2: "aspect-[4/3]", 1: "aspect-[4/3] md:aspect-[21/9]" };
  const step = useCallback((dir: number) => setOpen((i) => (i === null ? null : (i + dir + n) % n)), [n]);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  return (
    <>
      <div className={`relative grid gap-2 overflow-hidden rounded-2xl ${grid[shown]}`}>
        {images.slice(0, shown).map((src, i) => (
          <button key={src} type="button" onClick={() => setOpen(i)} aria-label={labels.photo(i + 1, n)} className={`relative overflow-hidden bg-surface ${i === 0 ? first[shown] : "hidden aspect-[4/3] md:block"}`}>
            <Image src={src} alt={i === 0 ? title : ""} fill priority={i === 0} unoptimized sizes={i === 0 ? "(min-width:768px) 50vw, 100vw" : "25vw"} className="object-cover transition hover:scale-[1.03]" />
          </button>
        ))}
        {n > 1 && <button type="button" onClick={() => setOpen(0)} className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink shadow">
          <Images className="size-4" /> {labels.all}
        </button>}
      </div>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={labels.photo(open + 1, n)} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95">
          <button type="button" onClick={() => setOpen(null)} aria-label={labels.close} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white"><X /></button>
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/10 text-white md:left-6"><ChevronLeft /></button>
          <div className="relative h-[70vh] w-[90vw] max-w-5xl">
            <Image src={images[open]} alt={labels.photo(open + 1, n)} fill unoptimized className="object-contain" sizes="90vw" />
          </div>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/10 text-white md:right-6"><ChevronRight /></button>
          <p className="absolute bottom-4 text-sm text-white/80">{labels.photo(open + 1, n)}</p>
        </div>
      )}
    </>
  );
}
