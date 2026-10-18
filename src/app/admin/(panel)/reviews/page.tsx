import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { fmtDate } from "@/lib/format";
import { adminT } from "../../i18n";

// Keeps Tour.rating / reviewCount in sync with approved reviews
async function recount(tourId: number) {
  const agg = await db.review.aggregate({ where: { tourId, approved: true }, _avg: { rating: true }, _count: true });
  await db.tour.update({ where: { id: tourId }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count } });
}

export default async function Reviews({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireAdmin("reviews");
  const t = adminT(user.locale);
  const { show = "pending" } = await searchParams;
  const rows = await db.review.findMany({ where: show === "all" ? {} : { approved: show === "approved" }, orderBy: { createdAt: "desc" }, take: 200, include: { tour: { select: { title: true } } } });

  async function act(fd: FormData) {
    "use server";
    const u = await requireAdmin("reviews");
    const id = Number(fd.get("id"));
    const r = await db.review.findUniqueOrThrow({ where: { id } });
    if (fd.get("op") === "delete") await db.review.delete({ where: { id } });
    else await db.review.update({ where: { id }, data: { approved: fd.get("op") === "approve" } });
    await recount(r.tourId);
    await audit(u.email, `review.${fd.get("op")}`, String(id));
    redirect(`/admin/reviews?show=${show}`);
  }

  return (
    <div>
      <h1 className="text-2xl">{t.reviews}</h1>
      <nav className="mt-4 flex gap-2 text-sm">
        {["pending", "approved", "all"].map((s) => <a key={s} href={`?show=${s}`} className={`rounded-full px-3 py-1 ${s === show ? "bg-primary text-white" : "bg-white"}`}>{s}</a>)}
      </nav>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 && <p className="text-muted">Nothing here.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm"><span className="font-medium text-ink">{r.name}</span> · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.tour.title} · {fmtDate(r.createdAt, "en")}</p>
            <p className="mt-2">{r.content}</p>
            <form action={act} className="mt-3 flex gap-3 text-sm">
              <input type="hidden" name="id" value={r.id} />
              {r.approved ? <button name="op" value="hide" className="text-warning">Hide</button> : <button name="op" value="approve" className="text-success">Approve</button>}
              <button name="op" value="delete" className="text-danger">{t.delete}</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
