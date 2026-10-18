// Converts the amgotravel.com tour export (WordPress, prisma/data/amgotravel-export.json) into the
// site's tour format (prisma/data/amgo-tours.json), which `npm run db:seed` loads.
// Run again after a new export: node scripts/import-amgo-tours.mjs
import fs from "node:fs";

const src = JSON.parse(fs.readFileSync(new URL("../prisma/data/amgotravel-export.json", import.meta.url), "utf8").replace(/^﻿/, ""));

// Destination from the title first, then from the WordPress "organizer" (tour group)
const DEST = [
  ["ha-long-bay", /ha ?long|lan ha|cat ba|bai tu long/i],
  ["ha-giang", /ha giang/i],
  ["cao-bang", /cao bang|ban gioc/i],
  ["sapa", /sapa|sa pa|fansipan|lao cai|y ty|bac ha/i],
  ["ninh-binh", /ninh binh|trang an|tam coc|hoa lu|bai dinh|mua cave/i],
  ["pu-luong", /pu luong|mai chau/i],
  ["hue", /\bhue\b/i],
  ["hoi-an", /hoi an|tra que|cam thanh|cham island|my son|tra nhieu/i],
  ["da-nang", /da nang|marble|ba na|son tra/i],
  ["hanoi", /hanoi|ha noi/i],
  ["ha-long-bay", /cruise/i],
];
const ORG_DEST = [["ha-long-bay", /ha long/i], ["sapa", /sapa|ha giang|tay bac/i], ["pu-luong", /pu luong/i], ["hue", /hue/i], ["hanoi", /.*/]];

const INCLUDE = /^(what is included|tour price includes|tour inclusions?|inclusions?|included|includes?|exclusive includes)\b/i;
const EXCLUDE = /^(what is not included|not included|exclusions?|excluded|excludes?|thing not mentioned)\b/i;
const CHILD = /^(children|children'?s? polic|children polic|price for children|policy for children|children’s polic)/i;
const NOTES = /^(good to know|special notes?|notes about|departure times|about food|policy for single|personal documents|quick details)/i;
const PACK = /^(items to bring|what should we bring|what to bring)/i;
const HIGHLIGHTS = /^(highlights|tour highlights)/i;

const clean = (s) => s.replace(/\s+/g, " ").replace(/^[-–•*]\s*/, "").trim();
const isJunk = (l) => /^(photo|photos|photo credits)\b|^you may also like|^price:|^to book|wikimedia commons|cc by|^\(?image/i.test(l);

function sections(content) {
  const out = { intro: [], highlights: [], includes: [], excludes: [], notes: [], children: [], packing: [], other: [] };
  let cur = "intro";
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{2,4}\s*(.+)$/)?.[1] ?? (/^[A-Z][A-Z0-9 &’'/()-]{5,}:?\s*$/.test(line) ? line.replace(/:$/, "") : null);
    if (heading) {
      const h = heading.replace(/[:]/g, "").trim();
      cur = HIGHLIGHTS.test(h) ? "highlights" : EXCLUDE.test(h) ? "excludes" : INCLUDE.test(h) ? "includes" : CHILD.test(h) ? "children" : PACK.test(h) ? "packing" : NOTES.test(h) ? "notes" : /cabins|suites/i.test(h) ? "skip" : "other";
      if (/departure times/i.test(h)) cur = "notes";
      continue;
    }
    if (isJunk(line) || cur === "skip") continue;
    const bullet = /^[-–•*]\s/.test(line);
    const text = clean(line);
    if (text.length < 3) continue;
    if (cur === "intro") { if (!bullet && text.length > 60) out.intro.push(text); continue; }
    if (cur === "other") { if (!bullet && text.length > 60) out.intro.push(text); else if (bullet) out.notes.push(text); continue; }
    if (cur === "highlights" && !bullet) { if (text.length > 60) out.intro.push(text); continue; }
    out[cur].push(text);
  }
  return out;
}

function duration(s, title) {
  const d = Number(s.match(/(\d+)\s*Day/i)?.[1] ?? 0);
  const n = Number(s.match(/(\d+)\s*Night/i)?.[1] ?? (d > 1 ? d - 1 : 0));
  const hours = Number(s.match(/([\d.]+)\s*Hour/i)?.[1] ?? 0);
  const days = d || 1;
  const slug = days === 1 ? "day-trip" : days === 2 ? "2-days" : days === 3 ? "3-days" : days <= 5 ? "4-5-days" : "6-plus-days";
  return { days, nights: d ? n : 0, hours, durationSlug: slug };
}

function categories(t, dest, days) {
  const s = `${t.title} ${t.organizers}`.toLowerCase();
  const c = new Set();
  if (days === 1) c.add("day-trips"); else c.add("multi-day");
  if (/cruise|ha long|lan ha|bai tu long/.test(s) && dest === "ha-long-bay") c.add("cruises");
  if (/cooking|food|market|farmer|culture|craft|village|lantern|imperial|city tour|night/.test(s)) c.add("food-culture");
  if (/motorbike|jeep|atv|trek|loop|hiking|bike|adventure|cao bang|pu luong|sapa|ha giang/.test(s)) c.add("trekking-adventure");
  if (/island|snorkel|beach|kayak|cham/.test(s)) c.add("beach-islands");
  if (/private/.test(s)) c.add("private-tours");
  if (/flexible/.test((t.categories || "").toLowerCase())) c.add("private-tours");
  if (/small group|small-group|group tour/.test(s)) c.add("small-group");
  return [...c];
}

const tours = src.map((t, i) => {
  const slug = t.url.replace(/\/$/, "").split("/").pop();
  const title = t.title.replace(/\s+/g, " ").trim();
  const dest = DEST.find(([, r]) => r.test(title))?.[0] ?? ORG_DEST.find(([, r]) => r.test(t.organizers))[0];
  const dur = duration(t.duration, title);
  const sec = sections(t.content);
  const usd = Number((t.price_from.match(/\$\s?([\d,.]+)/)?.[1] ?? "0").replace(/,/g, ""));
  const child = Number(t.price_text.match(/US\$\s?([\d,.]+)\s*per child/i)?.[1]?.replace(/,/g, "") ?? 0);
  const summary = (t.meta_description || sec.intro[0] || title).trim();
  // Multi-day programmes list "Day N: ..." under highlights; those become the itinerary
  const dayLines = sec.highlights.filter((h) => /^day \d+/i.test(h));
  const itinerary = dayLines.length
    ? dayLines.map((h) => { const [, n, rest] = h.match(/^day (\d+)\s*[:–-]?\s*(.*)$/i); return { title: `Day ${n}`, description: rest, meals: "" }; })
    : [{ title: dur.hours ? `${t.duration} · ${t.start_location || "Hotel pick-up"}` : "Programme", description: sec.intro.slice(0, 3).join("\n\n") || summary, meals: "" }];
  const highlights = sec.highlights.filter((h) => !/^day \d+/i.test(h)).slice(0, 8).map((text) => ({ icon: "check", text }));
  const images = [...new Set([t.featured_image, ...(t.image_urls || "").split("|").map((s) => s.trim())].filter(Boolean))];
  const cancel = t.content.split("\n").map(clean).filter((l) => /cancel/i.test(l) && l.length < 300);
  return {
    sourceId: Number(t.id), sourceUrl: t.url, slug, title, summary, dest, ...dur,
    transport: dest === "ha-long-bay" && /cruise|boat|junk/i.test(title) ? "cruise" : /walking|food tour by night/i.test(title) ? "walking" : "coach",
    currency: "USD", priceFrom: usd, priceChild: child || null, priceOnRequest: !usd,
    images, highlights, itinerary,
    includes: sec.includes, excludes: sec.excludes,
    notes: [...sec.notes, ...sec.children.map((c) => `Children: ${c.replace(/^children:?\s*/i, "")}`)],
    packing: sec.packing,
    cancellation: cancel.length ? cancel.join(" ") : "Contact AmGo Travel for the cancellation terms of this tour.",
    meetingPoint: t.start_location || "Hotel pick-up (confirmed after booking)",
    mapQuery: t.start_location && !/hotel/i.test(t.start_location) ? t.start_location : `${title.split(/[–-]/)[0].trim()}, Vietnam`,
    categories: categories(t, dest, dur.days),
    seoTitle: null, seoDesc: t.meta_description || null,
    popularity: src.length - i,
    publishedAt: t.published,
  };
});

// Two WordPress posts can end in the same slug: keep the first, suffix the rest with their id
const seen = new Set();
for (const t of tours) { if (seen.has(t.slug)) t.slug = `${t.slug}-${t.sourceId}`; seen.add(t.slug); }

fs.writeFileSync(new URL("../prisma/data/amgo-tours.json", import.meta.url), JSON.stringify(tours, null, 1));
const count = (k) => Object.entries(tours.reduce((a, t) => ({ ...a, [t[k]]: (a[t[k]] ?? 0) + 1 }), {})).map(([a, b]) => `${a}:${b}`).join(" ");
console.log(`${tours.length} tours · priced ${tours.filter((t) => !t.priceOnRequest).length} · on request ${tours.filter((t) => t.priceOnRequest).length}`);
console.log("dest", count("dest")); console.log("duration", count("durationSlug")); console.log("transport", count("transport"));
console.log("no includes", tours.filter((t) => !t.includes.length).length, "· no highlights", tours.filter((t) => !t.highlights.length).length, "· dup slugs", tours.length - new Set(tours.map((t) => t.slug)).size);
