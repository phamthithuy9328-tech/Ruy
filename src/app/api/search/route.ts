import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isLocale } from "@/i18n/config";

export async function GET(req: Request) {
  if (!rateLimit(`search:${clientIp(req)}`, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const l = url.searchParams.get("locale") ?? "en";
  const res = await search(q, isLocale(l) ? l : "en");
  return NextResponse.json(res, { headers: { "cache-control": "public, max-age=30" } });
}
