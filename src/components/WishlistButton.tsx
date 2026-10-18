"use client";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "amgo_wishlist";
const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};

export function WishlistButton({ slug, label }: { slug: string; label: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(read().includes(slug)), [slug]);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const list = read();
        const next = on ? list.filter((s) => s !== slug) : [...list, slug];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        setOn(!on);
      }}
      className="relative z-10 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm transition hover:scale-105"
    >
      <Heart className={`size-5 ${on ? "fill-danger text-danger" : ""}`} strokeWidth={1.75} />
    </button>
  );
}
