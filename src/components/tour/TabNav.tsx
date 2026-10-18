"use client";
import { useEffect, useState } from "react";

/** Sticky in-page tabs that highlight the section in view */
export function TabNav({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-120px 0px -60% 0px" });
    tabs.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [tabs]);
  return (
    <nav className="sticky top-16 z-20 -mx-4 border-b border-line bg-white/95 px-4 backdrop-blur md:mx-0 md:px-0">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} aria-current={active === t.id ? "true" : undefined} className={`inline-flex h-12 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium ${active === t.id ? "border-primary text-primary" : "border-transparent text-body hover:text-ink"}`}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
