// Edge of the app: legacy 301 redirects, locale routing (English at /, others under /vi…),
// geo-based currency default and language suggestion, admin session gate.
// Crawlers are never redirected; language is only *suggested* (see LanguageSuggestion).
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currencyForCountry } from "@/lib/currency";
import { countryLocale, defaultLocale, locales } from "@/i18n/config";

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/|api/|images/|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|css|js|txt|xml)$).*)"],
};

// Country → currency / language overrides edited in the admin (Setting "geo")
type Geo = { currency: Record<string, string>; locale: Record<string, string> };
type Routing = { redirects: Map<string, { to: string; permanent: boolean }>; geo: Geo };
const emptyRouting: Routing = { redirects: new Map(), geo: { currency: {}, locale: {} } };

// The middleware never touches the database: it reads redirects and geo rules from /api/routing,
// cached for a minute. If that call fails the site still works, just without them.
let routingCache: { at: number; data: Routing } | null = null;
async function getRouting(origin: string): Promise<Routing> {
  if (routingCache && Date.now() - routingCache.at < 60_000) return routingCache.data;
  try {
    const res = await fetch(`${origin}/api/routing`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const json = (await res.json()) as { redirects: { from: string; to: string; permanent: boolean }[]; geo: Geo };
    const data: Routing = { redirects: new Map(json.redirects.map((r) => [r.from.replace(/\/$/, "") || "/", { to: r.to, permanent: r.permanent }])), geo: json.geo };
    routingCache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.error("middleware: could not load /api/routing", e);
    routingCache = { at: Date.now() - 50_000, data: routingCache?.data ?? emptyRouting }; // retry in ~10s
    return routingCache.data;
  }
}

function detectCountry(req: NextRequest) {
  // ?country=XX lets you test geo behaviour locally; production uses the CDN's geo header
  return (
    req.nextUrl.searchParams.get("country")?.toUpperCase() ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    null
  );
}

function suggestedLocale(req: NextRequest, country: string | null, geo: Geo) {
  const mapped = country ? (geo.locale[country] ?? countryLocale[country]) : null;
  if (mapped && (locales as readonly string[]).includes(mapped)) return mapped;
  const al = req.headers.get("accept-language") ?? "";
  const first = al.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return (locales as readonly string[]).includes(first) ? first : defaultLocale;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin: cheap cookie gate here, full session check in the admin layout
  if (pathname.startsWith("/admin")) {
    const raw = req.cookies.get("amgo_admin")?.value;
    if (pathname === "/admin/login") return NextResponse.next();
    if (!raw) return NextResponse.redirect(new URL("/admin/login", req.url));
    // Sliding idle timeout: re-sign the session with a fresh timestamp (full check happens in the admin layout)
    const [uid, ts, sig] = raw.split(".");
    const key = process.env.SESSION_SECRET ?? "dev-only-secret-change-me";
    const mac = (v: string) => crypto.createHmac("sha256", key).update(v).digest("base64url");
    const res = NextResponse.next();
    if (sig === mac(`admin:${uid}.${ts}`) && Date.now() - Number(ts) > 5 * 60_000 && Date.now() - Number(ts) < Number(process.env.ADMIN_SESSION_IDLE_MINUTES ?? 60) * 60_000) {
      const payload = `${uid}.${Date.now()}`;
      res.cookies.set("amgo_admin", `${payload}.${mac(`admin:${payload}`)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 12 * 3600 });
    }
    return res;
  }

  const { redirects, geo } = await getRouting(req.nextUrl.origin);
  const hit = redirects.get(pathname.replace(/\/$/, "") || "/");
  if (hit) return NextResponse.redirect(new URL(hit.to, req.url), hit.permanent ? 301 : 302);

  // /en/... is the same as /... → canonical redirect
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 301);
  }

  const country = detectCountry(req);
  const reqHeaders = new Headers(req.headers);
  if (country) reqHeaders.set("x-amgo-country", country);
  reqHeaders.set("x-amgo-path", pathname);
  const geoCurrency = req.cookies.get("cur")?.value ?? currencyForCountry(country, geo.currency);
  reqHeaders.set("x-amgo-currency", geoCurrency);

  const seg = pathname.split("/")[1];
  const prefixed = (locales as readonly string[]).includes(seg) && seg !== defaultLocale;
  let res: NextResponse;
  if (prefixed) res = NextResponse.next({ request: { headers: reqHeaders } });
  else {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  }

  // Remember geo defaults (the visitor's own choice, set by the switcher, always wins)
  if (!req.cookies.get("cur")) res.cookies.set("cur", geoCurrency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (!req.cookies.get("lang_suggest")) res.cookies.set("lang_suggest", suggestedLocale(req, country, geo), { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}
