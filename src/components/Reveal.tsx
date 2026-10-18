"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Fades/slides children in once when scrolled into view (respects reduced motion via CSS).
 * Content is visible in the server HTML (crawlers, no-JS, slow hydration); only sections that are
 * still below the fold after hydration are hidden and then revealed.
 */
export function Reveal({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" }) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setHidden(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHidden(false);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`reveal ${hidden ? "reveal-hidden" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
