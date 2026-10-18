import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { currencies } from "@/lib/currency";
import { slugify } from "@/lib/format";
import { durationSlugs, transportSlugs } from "@/lib/taxonomy";
import { Fields, Flash, readFields, type FieldDef } from "../../../forms";

const content: FieldDef[] = [
  { name: "title", label: "Title", tr: true, required: true },
  { name: "summary", label: "Summary", kind: "textarea", tr: true, required: true },
  { name: "highlights", label: "Highlights", kind: "json", tr: true, rows: 6 },
  { name: "itinerary", label: "Itinerary", kind: "json", tr: true, rows: 12 },
  { name: "includes", label: "Included", kind: "json", tr: true, rows: 5 },
  { name: "excludes", label: "Not included", kind: "json", tr: true, rows: 4 },
  { name: "cancellation", label: "Cancellation policy", kind: "textarea", tr: true },
  { name: "notes", label: "Good to know", kind: "json", tr: true, rows: 4 },
  { name: "packing", label: "What to bring", kind: "json", tr: true, rows: 4 },
  { name: "faqs", label: "FAQs", kind: "json", tr: true, rows: 8 },
  { name: "meetingPoint", label: "Meeting point", tr: true },
  { name: "seoTitle", label: "SEO title", tr: true },
  { name: "seoDesc", label: "SEO description", kind: "textarea", tr: true, rows: 2 },
];
const settings: FieldDef[] = [
  { name: "slug", label: "URL slug", hint: "Leave empty to generate from the title. Changing it adds a 301 redirect automatically." },
  { name: "days", label: "Days", kind: "number", required: true },
  { name: "nights", label: "Nights", kind: "number", required: true },
  { name: "durationSlug", label: "Duration group", kind: "select", options: durationSlugs, required: true },
  { name: "transport", label: "Transport", kind: "select", options: transportSlugs, required: true },
  { name: "currency", label: "Base currency of prices", kind: "select", options: currencies, required: true, hint: "Prices below and on departures are in this currency; visitors see them converted." },
  { name: "priceFrom", label: "Price from (per adult), 0 = price on request", kind: "number", required: true },
  { name: "originalPrice", label: "Original price (shown struck through)", kind: "number" },
  { name: "badge", label: "Badge", kind: "select", options: ["bestseller", "few-seats", "deal"] },
  { name: "images", label: "Images (URLs, first is the cover)", kind: "json", rows: 5 },
  { name: "mapQuery", label: "Google Maps query" },
  { name: "depositPercent", label: "Deposit %", kind: "number" },
  { name: "holdHours", label: "Hold without payment (hours)", kind: "number" },
  { name: "allowHold", label: "Allow hold", kind: "bool" },
  { name: "allowTransfer", label: "Allow bank transfer", kind: "bool" },
  { name: "popularity", label: "Popularity (sort weight)", kind: "number" },
  { name: "published", label: "Published", kind: "bool" },
];
const blank = { images: [], highlights: [], itinerary: [], includes: [], excludes: [], notes: [], packing: [], faqs: [], currency: "USD", depositPercent: 30, holdHours: 24, allowHold: true, allowTransfer: true, published: false, durationSlug: "day-trip", transport: "coach", cancellation: "Free cancellation up to 24 hours before departure.", meetingPoint: "", mapQuery: "" };

export default async function TourEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireAdmin("tours");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  if (isNew && user.role === "translator") redirect("/admin/tours");
  const tour = isNew ? null : await db.tour.findUnique({ where: { id: Number(id) }, include: { categories: true, departures: { orderBy: { date: "asc" } } } });
  if (!isNew && !tour) notFound();
  const [destinations, categories] = await Promise.all([db.destination.findMany({ orderBy: { name: "asc" } }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]);
  const locked = user.role === "translator";
  const row = (tour ?? blank) as unknown as Record<string, unknown>;

  async function save(fd: FormData) {
    "use server";
    const u = await requireAdmin("tours");
    const lock = u.role === "translator";
    const cur = isNew ? null : await db.tour.findUniqueOrThrow({ where: { id: Number(id) } });
    let target = id;
    try {
      const { data, tr } = readFields(fd, [...content, ...settings], cur as unknown as Record<string, unknown> | null, lock);
      if (lock) {
        await db.tour.update({ where: { id: cur!.id }, data: { tr } });
      } else {
        data.slug = slugify(String(data.slug || data.title));
        const rest = { ...blank, ...data, tr, destinationId: Number(fd.get("destinationId")) } as Record<string, unknown>;
        const catIds = fd.getAll("categories").map(Number);
        if (cur) {
          await db.tour.update({ where: { id: cur.id }, data: { ...rest, categories: { deleteMany: {}, create: catIds.map((categoryId) => ({ categoryId })) } } as never });
          if (cur.slug !== data.slug) for (const p of ["", "/vi"]) await db.redirect.upsert({ where: { from: `${p}/tour/${cur.slug}` }, update: { to: `${p}/tour/${data.slug}` }, create: { from: `${p}/tour/${cur.slug}`, to: `${p}/tour/${data.slug}` } });
        } else {
          const created = await db.tour.create({ data: { ...rest, categories: { create: catIds.map((categoryId) => ({ categoryId })) } } as never });
          target = String(created.id);
        }
      }
      await audit(u.email, isNew ? "tour.create" : "tour.update", String(data.slug ?? cur?.slug));
    } catch (e) {
      redirect(`/admin/tours/${id}?error=${encodeURIComponent(e instanceof Error ? e.message.split("\n").pop()! : "Could not save")}`);
    }
    redirect(`/admin/tours/${target}?ok=Saved`);
  }

  async function addDeparture(fd: FormData) {
    "use server";
    const u = await requireAdmin("tours");
    if (u.role === "translator") return;
    const n = (k: string) => Number(fd.get(k) || 0);
    const dates = String(fd.get("dates") ?? "").split(/[\s,]+/).filter(Boolean);
    for (const d of dates)
      await db.departure.create({ data: { tourId: Number(id), date: new Date(d + "T00:00:00Z"), priceAdult: n("priceAdult"), priceChild: n("priceChild"), priceInfant: n("priceInfant"), seatsTotal: n("seatsTotal") } });
    await audit(u.email, "departure.add", `tour ${id}: ${dates.join(", ")}`);
    redirect(`/admin/tours/${id}?ok=Departures+added#departures`);
  }
  async function updateDeparture(fd: FormData) {
    "use server";
    const u = await requireAdmin("tours");
    if (u.role === "translator") return;
    const depId = Number(fd.get("id"));
    const dep = await db.departure.findUniqueOrThrow({ where: { id: depId } });
    if (fd.get("delete")) {
      if (dep.seatsBooked > 0) redirect(`/admin/tours/${id}?error=This+departure+has+bookings#departures`);
      await db.departure.delete({ where: { id: depId } });
    } else {
      const n = (k: string) => Number(fd.get(k) || 0);
      await db.departure.update({ where: { id: depId }, data: { priceAdult: n("priceAdult"), priceChild: n("priceChild"), priceInfant: n("priceInfant"), seatsTotal: Math.max(n("seatsTotal"), dep.seatsBooked) } });
    }
    await audit(u.email, "departure.update", `tour ${id}: departure ${depId}`);
    redirect(`/admin/tours/${id}?ok=Saved#departures`);
  }

  const box = "rounded-xl border border-line bg-white p-5";
  const sel = new Set(tour?.categories.map((c) => c.categoryId));
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/tours" className="text-sm text-muted">← Tours</Link>
        <h1 className="mt-1 text-2xl">{tour?.title ?? "New tour"}</h1>
        {tour && <a href={`/tour/${tour.slug}`} target="_blank" className="text-sm text-primary">View on site ↗</a>}
      </div>
      <Flash ok={sp.ok} error={sp.error} />
      {locked && <p className="rounded-lg bg-surface p-3 text-sm">You can edit translations only. English text is shown for reference.</p>}
      <form action={save} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className={box}>
          <h2 className="mb-1 text-lg">Content</h2>
          <p className="mb-4 text-xs text-muted">Lists are JSON. Highlights: {`[{"icon":"mountain","text":"…"}]`} · Itinerary: {`[{"title":"…","description":"…","meals":"B, L"}]`} · FAQs: {`[{"q":"…","a":"…"}]`} · others: {`["…","…"]`}. Empty translations fall back to English.</p>
          <Fields defs={content} row={row} baseLocked={locked} />
        </div>
        <div className="grid content-start gap-6">
          <div className={box}>
            <h2 className="mb-4 text-lg">Settings</h2>
            <label className="label mb-4 block">Destination
              <select name="destinationId" defaultValue={tour?.destinationId} disabled={locked} className="input mt-1">{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            </label>
            <fieldset className="mb-4" disabled={locked}>
              <legend className="label">Categories</legend>
              <div className="mt-1 grid gap-1 text-sm">{categories.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="categories" value={c.id} defaultChecked={sel.has(c.id)} className="accent-primary" />{c.name}</label>)}</div>
            </fieldset>
            <Fields defs={settings} row={row} baseLocked={locked} />
          </div>
          <button className="btn btn-primary sticky bottom-4">Save tour</button>
        </div>
      </form>
      {tour && (
        <div id="departures" className={box}>
          <h2 className="text-lg">Departures & prices ({tour.currency})</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Date</th><th>Adult</th><th>Child</th><th>Infant</th><th>Seats</th><th>Booked</th><th></th></tr></thead>
              <tbody>
                {tour.departures.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="py-2">{d.date.toISOString().slice(0, 10)}</td>
                    <td colSpan={6}>
                      <form action={updateDeparture} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={d.id} />
                        {(["priceAdult", "priceChild", "priceInfant", "seatsTotal"] as const).map((k) => <input key={k} name={k} type="number" defaultValue={d[k]} aria-label={k} disabled={locked} className="input h-9 min-h-0 w-28" />)}
                        <span className="w-16">{d.seatsBooked}</span>
                        {!locked && <><button className="text-primary">Save</button><button name="delete" value="1" className="text-danger">Delete</button></>}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!locked && (
            <form action={addDeparture} className="mt-4 grid gap-2 rounded-lg bg-surface p-4 md:grid-cols-6">
              <label className="label md:col-span-2">Dates (YYYY-MM-DD, several allowed)<input name="dates" required placeholder="2026-12-01, 2026-12-08" className="input mt-1" /></label>
              <label className="label">Adult<input name="priceAdult" type="number" required defaultValue={tour.priceFrom} className="input mt-1" /></label>
              <label className="label">Child<input name="priceChild" type="number" defaultValue={Math.round(tour.priceFrom * 0.75)} className="input mt-1" /></label>
              <label className="label">Infant<input name="priceInfant" type="number" defaultValue={0} className="input mt-1" /></label>
              <label className="label">Seats<input name="seatsTotal" type="number" defaultValue={12} className="input mt-1" /></label>
              <button className="btn btn-primary md:col-span-6">Add departures</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
