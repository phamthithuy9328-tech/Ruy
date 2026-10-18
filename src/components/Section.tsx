import Link from "next/link";
import { Reveal } from "./Reveal";

export function Section({ title, sub, more, children, className = "" }: { title: string; sub?: string; more?: { href: string; label: string }; children: React.ReactNode; className?: string }) {
  return (
    <Reveal className={`container-x py-10 md:py-14 ${className}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-[32px]">{title}</h2>
          {sub && <p className="mt-2 text-muted">{sub}</p>}
        </div>
        {more && (
          <Link href={more.href} className="shrink-0 text-sm font-semibold text-primary hover:underline">
            {more.label} →
          </Link>
        )}
      </div>
      {children}
    </Reveal>
  );
}
