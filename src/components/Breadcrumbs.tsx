import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "./JsonLd";
import { site } from "@/lib/site";

export function Breadcrumbs({ items, label }: { items: { name: string; href?: string }[]; label: string }) {
  return (
    <>
      <nav aria-label={label} className="container-x py-3 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
              {it.href && i < items.length - 1 ? (
                <Link href={it.href} className="hover:text-primary">{it.name}</Link>
              ) : (
                <span aria-current="page" className="line-clamp-1 text-ink">{it.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.href ? site.url + it.href : undefined })),
        }}
      />
    </>
  );
}
