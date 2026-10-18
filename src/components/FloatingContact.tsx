"use client";
import { useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";

/** Floating WhatsApp / Zalo / Messenger / call buttons */
export function FloatingContact({ locale, whatsapp, zalo, messenger, tel }: { locale: Locale; whatsapp: string; zalo: string; messenger: string; tel: string }) {
  const [open, setOpen] = useState(false);
  const d = getDict(locale);
  const items = [
    { label: "WhatsApp", href: whatsapp, cls: "bg-[#25D366]" },
    { label: "Zalo", href: zalo, cls: "bg-[#0068FF]" },
    { label: "Messenger", href: messenger, cls: "bg-[#0084FF]" },
  ];
  return (
    <div className="no-print fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-6">
      {open && (
        <ul className="grid gap-2">
          {items.map((i) => (
            <li key={i.label}>
              <a href={i.href} target="_blank" rel="noopener" className={`flex h-11 items-center rounded-full px-4 text-sm font-semibold text-white shadow-lg ${i.cls}`}>{i.label}</a>
            </li>
          ))}
          <li>
            <a href={`tel:${tel}`} className="flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-lg">
              <Phone className="size-4" /> {d.nav.callUs}
            </a>
          </li>
        </ul>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? d.nav.close : d.nav.whatsapp} className="grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover">
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
