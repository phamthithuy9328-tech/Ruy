// Seed the database: destinations, categories, the real AmGo tours (prisma/data/amgo-tours.json), starter guides
// (as drafts), message templates and the first admin. Run: npm run db:seed  — it wipes tours, bookings and customers first.
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import { destinations, categories, posts, postBody, templates } from "./seed-data.mjs";
const db = new PrismaClient();
const tours = JSON.parse(fs.readFileSync(new URL("./data/amgo-tours.json", import.meta.url), "utf8"));
// Vietnamese translations by slug (title, summary, highlights[], itinerary[], includes, excludes, notes, packing, cancellation, meetingPoint)
const viFile = new URL("./data/amgo-tours.vi.json", import.meta.url);
const vi = fs.existsSync(viFile) ? Object.fromEntries(JSON.parse(fs.readFileSync(viFile, "utf8")).map((x) => [x.slug, x])) : {};
const viOf = (t) => {
  const v = vi[t.slug];
  if (!v) return undefined;
  const { slug, highlights, ...rest } = v;
  return { ...rest, highlights: (highlights ?? []).map((text, i) => ({ icon: t.highlights[i]?.icon ?? "check", text })) };
};
const DEPARTURE_DAYS = 90; // bookable dates generated for tours with a price; edit or add more in Admin › Tours
const SEATS = 20;

function scryptHash(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
}

async function main() {
  await db.$transaction([
    db.webhookDelivery.deleteMany(), db.webhook.deleteMany(), db.paymentLog.deleteMany(), db.booking.deleteMany(), db.lead.deleteMany(), db.customerEvent.deleteMany(), db.customer.deleteMany(),
    db.review.deleteMany(), db.departure.deleteMany(), db.tourCategory.deleteMany(), db.tour.deleteMany(), db.category.deleteMany(), db.destination.deleteMany(),
    db.post.deleteMany(), db.messageTemplate.deleteMany(), db.discountCode.deleteMany(), db.messageLog.deleteMany(),
  ]);
  const destMap = {};
  const byDest = (slug) => tours.filter((t) => t.dest === slug).sort((x, y) => y.popularity - x.popularity);
  for (const [i, d] of destinations.filter((d) => byDest(d.slug).length).entries()) {
    const cover = byDest(d.slug).find((t) => t.images.length)?.images[0] ?? `/images/${d.slug}-1.svg`;
    destMap[d.slug] = await db.destination.create({ data: { slug: d.slug, name: d.name, region: d.region, description: d.description, featured: d.featured, sortOrder: i, image: cover, tr: { vi: d.vi } } });
  }
  const catMap = {};
  for (const [i, c] of categories.entries()) {
    catMap[c.slug] = await db.category.create({ data: { slug: c.slug, name: c.name, description: c.description, icon: c.icon, group: c.group, sortOrder: i, tr: { vi: c.vi } } });
  }
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00+07:00");
  const tourMap = {};
  for (const t of tours) {
    const price = t.priceOnRequest ? 0 : t.priceFrom;
    tourMap[t.slug] = await db.tour.create({
      data: {
        slug: t.slug, title: t.title, summary: t.summary, destinationId: destMap[t.dest].id, days: t.days, nights: t.nights, durationSlug: t.durationSlug, transport: t.transport, currency: t.currency,
        priceFrom: price, images: t.images.length ? t.images : [`/images/${t.dest}-1.svg`],
        highlights: t.highlights, itinerary: t.itinerary, includes: t.includes, excludes: t.excludes,
        cancellation: t.cancellation, notes: t.notes, packing: t.packing, faqs: [], meetingPoint: t.meetingPoint, mapQuery: t.mapQuery, popularity: t.popularity,
        depositPercent: price >= 400 ? 30 : 50, allowHold: price > 0 && price < 400, seoDesc: t.seoDesc,
        ...(vi[t.slug] ? { tr: { vi: viOf(t) } } : {}),
        categories: { create: t.categories.filter((c) => catMap[c]).map((c) => ({ categoryId: catMap[c].id })) },
      },
    });
    if (!price) continue; // price on request: the tour page shows an enquiry box instead of dates
    const child = t.priceChild ?? Math.round(price * 0.75);
    const step = t.days <= 2 ? 1 : 7;
    const rows = [];
    for (let d = 2; d <= DEPARTURE_DAYS; d += step) {
      rows.push({ tourId: tourMap[t.slug].id, date: new Date(today.getTime() + d * 86400000), priceAdult: price, priceChild: child, priceInfant: 0, seatsTotal: SEATS, seatsBooked: 0 });
    }
    await db.departure.createMany({ data: rows });
  }
  for (const [i, p] of posts.entries()) {
    const d = p.dest ? destMap[p.dest] : null;
    const place = d?.name ?? "Vietnam";
    const placeVi = d ? destinations.find((x) => x.slug === p.dest).vi.name : "Việt Nam";
    await db.post.create({
      data: {
        slug: p.slug, title: p.title, category: p.cat, destinationSlug: p.dest, durationSlug: p.dur, image: tours.find((t) => t.slug === p.tour)?.images[0] ?? `/images/${p.img}.svg`, author: "The AmGo team", published: false,
        tags: [place, p.cat], excerpt: p.intro, content: postBody("en", p.intro, place, p.tour), publishedAt: new Date(today.getTime() - (i + 1) * 5 * 86400000),
        tr: { vi: { title: p.vi.title, excerpt: p.vi.intro, content: postBody("vi", p.vi.intro, placeVi, p.tour), author: "Đội ngũ AmGo" } },
      },
    });
  }
  const hero = tours.find((t) => t.dest === "ha-long-bay" && t.images.length)?.images[0];
  if (hero) await db.setting.upsert({ where: { key: "home" }, create: { key: "home", value: JSON.stringify({ heroImage: hero }) }, update: {} });
  for (const [key, locale, name, channel, subject, body] of templates) await db.messageTemplate.create({ data: { key, locale, name, channel, subject, body } });
  await db.discountCode.create({ data: { code: "WELCOME10", percent: 10, maxUses: 500 } });
  await db.discountCode.create({ data: { code: "CAMON5", percent: 5 } });
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@amgotravel.com";
  const adminPw = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe-AmGo-2026!";
  await db.adminUser.upsert({ where: { email: adminEmail }, create: { email: adminEmail, name: "Admin", role: "admin", passwordHash: scryptHash(adminPw) }, update: {} });
  console.log(`Seeded ${tours.length} tours (${tours.filter((t) => !t.priceOnRequest).length} bookable online, ${tours.filter((t) => t.priceOnRequest).length} price on request), ${posts.length} draft guides. Admin: ${adminEmail}`);
}
main().finally(() => db.$disconnect());
