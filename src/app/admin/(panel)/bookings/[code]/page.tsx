import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { bookingPayload, bookingVars, releaseSeats } from "@/lib/booking";
import { emit, logEvent } from "@/lib/crm";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/currency";
import { fmtDate } from "@/lib/format";
import { arr } from "@/lib/json";

export default async function BookingDetail({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin("bookings");
  const { code } = await params;
  const b = await db.booking.findUnique({ where: { code }, include: { customer: true, tour: true, departure: true, payments: { orderBy: { createdAt: "asc" } } } });
  if (!b) notFound();
  const m = (v: number) => formatMoney(v, b.baseCurrency, "en");

  async function setStatus(fd: FormData) {
    "use server";
    const user = await requireAdmin("bookings");
    const status = String(fd.get("status"));
    if (!["pending", "paid", "cancelled", "refunded"].includes(status)) return;
    const cur = await db.booking.findUniqueOrThrow({ where: { code } });
    const data: { status: string; amountPaid?: number; expiresAt?: null } = { status };
    if (status === "paid") Object.assign(data, { amountPaid: Number(fd.get("amountPaid") || cur.total), expiresAt: null }); // e.g. bank transfer received
    if ((status === "cancelled" || status === "refunded") && !["cancelled", "refunded"].includes(cur.status)) await releaseSeats(cur.id);
    await db.booking.update({ where: { code }, data });
    await logEvent(cur.customerId, "booking", `${user.name} set ${code} to ${status}`);
    await audit(user.email, "booking.status", `${code}: ${cur.status} → ${status}`);
    await emit("booking.status_changed", { ...(await bookingPayload(cur.id)), previous_status: cur.status });
    if (status === "paid" && cur.status !== "paid") {
      const { vars, to } = await bookingVars(cur.id);
      await notify("booking_confirmation", to, vars);
      await notify("booking_confirmation_chat", to, vars);
    }
    redirect(`/admin/bookings/${code}`);
  }
  async function resend() {
    "use server";
    const user = await requireAdmin("bookings");
    const cur = await db.booking.findUniqueOrThrow({ where: { code } });
    const { vars, to } = await bookingVars(cur.id);
    await notify("booking_confirmation", to, vars);
    await audit(user.email, "booking.resend", code);
    redirect(`/admin/bookings/${code}`);
  }

  const box = "rounded-xl border border-line bg-white p-5";
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/bookings" className="text-sm text-muted">← Bookings</Link>
        <h1 className="mt-1 font-mono text-2xl">{b.code} <span className="text-base font-normal text-muted">· {b.status}</span></h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={box}>
          <h2 className="text-lg">Trip</h2>
          <p className="mt-2 font-medium text-ink">{b.tour.title}</p>
          <p>{fmtDate(b.departure.date, "en", { weekday: "long" })} · {b.adults} adults, {b.children} children, {b.infants} infants</p>
          <p className="mt-2 text-sm">Travelers: {arr<{ name: string }>(b.passengers).map((p) => p.name).join(", ") || "–"}</p>
          <p className="mt-2 text-sm">Note: {b.note || "–"}</p>
        </div>
        <div className={box}>
          <h2 className="text-lg">Customer</h2>
          <p className="mt-2"><Link href={`/admin/customers/${b.customerId}`} className="font-medium text-primary">{b.customer.name}</Link></p>
          <p className="text-sm">{b.customer.email} · {b.customer.phone}</p>
          <p className="text-sm">Country {b.customer.country ?? "–"} · Language {b.locale} · Viewed in {b.currency}</p>
        </div>
        <div className={box}>
          <h2 className="text-lg">Money</h2>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
            <dt>Subtotal</dt><dd>{m(b.subtotal)}</dd>
            <dt>Discount</dt><dd>{b.discount ? `−${m(b.discount)} (${b.discountCode})` : "–"}</dd>
            <dt>Total</dt><dd className="font-semibold">{m(b.total)}</dd>
            <dt>Paid</dt><dd>{m(b.amountPaid)}</dd>
            <dt>Plan / method</dt><dd>{b.paymentPlan} / {b.method ?? "–"}</dd>
            <dt>Charged</dt><dd>{b.chargeCurrency && b.chargeAmount != null ? `${formatMoney(b.chargeAmount / 100, b.chargeCurrency, "en")} @ ${b.fxRate}` : "–"}</dd>
            <dt>Shown to customer</dt><dd>{formatMoney(b.displayTotal, b.currency, "en")}</dd>
            <dt>Hold expires</dt><dd>{b.expiresAt ? fmtDate(b.expiresAt, "en", { hour: "2-digit", minute: "2-digit" }) : "–"}</dd>
          </dl>
        </div>
        <div className={box}>
          <h2 className="text-lg">Update status</h2>
          <form action={setStatus} className="mt-3 grid gap-2">
            <select name="status" defaultValue={b.status} className="input"><option>pending</option><option>paid</option><option>cancelled</option><option>refunded</option></select>
            <input name="amountPaid" type="number" placeholder={`Amount received (${b.baseCurrency}), for "paid"`} className="input" />
            <button className="btn btn-primary">Save</button>
          </form>
          <form action={resend} className="mt-2"><button className="btn btn-outline w-full">Resend confirmation email</button></form>
        </div>
      </div>
      <div className={box}>
        <h2 className="text-lg">Payment log</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Time</th><th>Kind</th><th>Txn ref</th><th>Gateway</th><th>Amount</th><th>Verified</th><th>Code</th></tr></thead>
          <tbody>
            {b.payments.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2">{fmtDate(p.createdAt, "en", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                <td>{p.kind}</td><td className="font-mono text-xs">{p.txnRef}</td><td>{p.gateway}</td><td>{formatMoney(p.amount / 100, p.currency, "en")}</td><td>{p.verified ? "✓" : "✗"}</td><td>{p.responseCode ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
