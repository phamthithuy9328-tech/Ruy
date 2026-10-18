import { db } from "@/lib/db";
import { access, audit, currentAdmin, type Role } from "@/lib/admin-auth";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  const user = await currentAdmin();
  if (!user || !access.bookings.includes(user.role as Role)) return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const rows = await db.booking.findMany({ where: sp.get("status") ? { status: sp.get("status")! } : {}, orderBy: { createdAt: "desc" }, include: { customer: true, tour: true, departure: true } });
  const head = ["code", "created", "status", "tour", "departure", "adults", "children", "infants", "base_currency", "total", "paid", "charge_currency", "charge_amount", "display_currency", "method", "name", "email", "phone", "country", "locale", "source"];
  const lines = rows.map((b) =>
    [b.code, b.createdAt.toISOString(), b.status, b.tour.title, b.departure.date.toISOString().slice(0, 10), b.adults, b.children, b.infants, b.baseCurrency, b.total, b.amountPaid, b.chargeCurrency, b.chargeAmount != null ? b.chargeAmount / 100 : "", b.currency, b.method, b.customer.name, b.customer.email, b.customer.phone, b.customer.country, b.locale, b.customer.source].map(csv).join(","),
  );
  await audit(user.email, "export", `bookings (${rows.length})`);
  return new Response("﻿" + [head.join(","), ...lines].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="amgo-bookings-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
