import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Legacy redirects and the admin's country → currency/language rules, read by the middleware
 *  (which has no database access of its own, so it stays light and can't crash on a DB error). */
export async function GET() {
  const [redirects, geoRow] = await Promise.all([db.redirect.findMany({ select: { from: true, to: true, permanent: true } }), db.setting.findUnique({ where: { key: "geo" } })]);
  let geo = { currency: {}, locale: {} };
  try {
    if (geoRow) geo = { ...geo, ...JSON.parse(geoRow.value) };
  } catch {}
  return NextResponse.json({ redirects, geo });
}
