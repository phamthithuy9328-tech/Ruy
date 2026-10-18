// GDPR / Decree 13 data-subject access: everything we hold about one customer, as JSON
import { db } from "@/lib/db";
import { access, audit, currentAdmin, type Role } from "@/lib/admin-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentAdmin();
  if (!user || !access.customers.includes(user.role as Role)) return new Response("Forbidden", { status: 403 });
  const id = Number((await params).id);
  const c = await db.customer.findUnique({ where: { id }, include: { leads: true, events: true, bookings: { include: { tour: { select: { title: true } }, departure: { select: { date: true } } } } } });
  if (!c) return new Response("Not found", { status: 404 });
  const messages = await db.messageLog.findMany({ where: { to: { in: [c.email ?? "", c.phone].filter(Boolean) } } });
  await audit(user.email, "gdpr.export", `customer ${id}`);
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), customer: c, messages }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="customer-${id}.json"` },
  });
}
