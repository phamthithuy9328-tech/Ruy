import { db } from "@/lib/db";
import { access, audit, currentAdmin, type Role } from "@/lib/admin-auth";
import { arr } from "@/lib/json";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  const user = await currentAdmin();
  if (!user || !access.customers.includes(user.role as Role)) return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const rows = await db.customer.findMany({ where: sp.get("status") ? { status: sp.get("status")! } : {}, orderBy: { createdAt: "desc" }, include: { _count: { select: { bookings: true } } } });
  const head = ["id", "name", "email", "phone", "country", "locale", "currency", "status", "tags", "source", "bookings", "created"];
  const lines = rows.map((c) => [c.id, c.name, c.email, c.phone.startsWith("email:") ? "" : c.phone, c.country, c.locale, c.currency, c.status, arr<string>(c.tags).join("|"), c.source, c._count.bookings, c.createdAt.toISOString()].map(csv).join(","));
  await audit(user.email, "export", `customers (${rows.length})`);
  return new Response("﻿" + [head.join(","), ...lines].join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="amgo-customers-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
