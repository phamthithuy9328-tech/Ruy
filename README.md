# AmGo Travel website

The AmGo Travel booking site for international travelers. **English and USD are the defaults**, with Vietnamese and 7 more display currencies. Customers book and pay online through OnePay. There is a built-in admin for tours, bookings and customers (CRM).

- Stack: Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · Prisma (SQLite locally, PostgreSQL in production)
- Site: `/` (English, no prefix) and `/vi/...` (Vietnamese)
- Admin: `/admin` (English UI with a Vietnamese toggle)

## Run locally

```bash
cp .env.example .env          # set SEED_ADMIN_PASSWORD
npm install
npm run db:push               # create the database
npm run db:seed               # the 153 real AmGo tours, destinations, draft guides, templates, first admin
npm run dev                   # http://localhost:3000
```

Admin login is at `http://localhost:3000/admin/login`. The email is `SEED_ADMIN_EMAIL` and the password is `SEED_ADMIN_PASSWORD`. If you don't set one, the default is `ChangeMe-AmGo-2026!`, so **change it right after you first log in** (My account). Turn on 2FA there too.

To test geo detection locally, add `?country=VN`, `?country=DE` or `?country=JP` to the URL.

## Deploy to production

1. Push the code to a GitHub repo, then import it into Vercel (or any Node 20+ host).
2. Create a PostgreSQL database (Neon, Supabase, Vercel Postgres, ...). In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`, set `DATABASE_URL`, then run `npx prisma db push && npm run db:seed` once.
3. Set the environment variables from `.env.example`. These are required: `NEXT_PUBLIC_SITE_URL`, `SESSION_SECRET` and `CRON_SECRET`.
4. Cron: `vercel.json` calls `/api/cron` every 15 minutes. Vercel Hobby only allows daily jobs, so on Hobby use cron-job.org (or similar) to call `GET https://<domain>/api/cron` with the header `Authorization: Bearer <CRON_SECRET>`. The job expires unpaid holds, sends abandoned-checkout and pre/post-trip reminders, and refreshes exchange rates daily.
5. Set the OnePay IPN URL to `https://<domain>/api/onepay/ipn` and the return URL to `https://<domain>/api/onepay/return`.
6. Use a CDN that sends a country header (Vercel `x-vercel-ip-country` or Cloudflare `cf-ipcountry`), so currency is picked automatically from the visitor's location.

## Tours from amgotravel.com

The tours come from the WordPress export of amgotravel.com (`prisma/data/amgotravel-export.json`, 153 tours).
`node scripts/import-amgo-tours.mjs` converts it into `prisma/data/amgo-tours.json`, which `npm run db:seed` loads.

- Tours with a price on the old site (79) are bookable online, with daily departures for the next 90 days (multi-day tours weekly), 20 seats each, child price from the old site or 75% of the adult price, infants free. Adjust dates, seats and prices per tour in Admin › Tours.
- Tours without a price (74) are **price on request**: `priceFrom = 0`. The tour page shows an enquiry form and WhatsApp instead of dates. To make one bookable, enter a price and add departures in the admin.
- Photos stay on amgotravel.com (remote URLs). Keep that site online, or move the photos and update the URLs.
- Vietnamese tour text is in `prisma/data/amgo-tours.vi.json` (machine-assisted translation, keyed by slug). Have a Vietnamese speaker review it in Admin › Tours (VI column). Any empty VI field falls back to English.
- No reviews are imported; ratings appear once real reviews are approved in Admin › Reviews. The starter travel guides are seeded as drafts.
- `npm run db:seed` wipes tours, bookings and customers. Run it once on a new database, never on production after launch.

## OnePay payments

| `ONEPAY_MODE` | Behaviour |
|---|---|
| `mock` (default) | Built-in payment simulator. Lets you test success and failure without credentials. |
| `sandbox` | OnePay test gateway (`mtf.onepay.vn`). Needs the test credentials OnePay issues. |
| `production` | Real payments. |

- **International cards** (Visa/Master/JCB/Amex) are charged in `ONEPAY_INTL_CURRENCY`, which defaults to **USD**. If your OnePay contract only settles in VND, set it to `VND`.
- **Domestic cards and VietQR** are always charged in VND.
- Before the customer pays, checkout shows the charged amount and the exchange rate. The booking stores the display currency, the charged currency and amount, and the rate.
- Only the **IPN** (server-to-server, signature verified, amount and currency checked, idempotent) marks a booking as paid. The return page only displays the result.

Steps to go live: get sandbox credentials from OnePay and test with `ONEPAY_MODE=sandbox`. Once they approve, switch to production credentials and `ONEPAY_MODE=production`.

## Languages and currencies

**Currencies**: USD, VND, EUR, GBP, AUD, SGD, KRW, JPY. Each tour's prices are entered in its own base currency (usually USD). Visitors see prices converted using the rates under Admin › Languages & currencies. On that page you can:
- refresh rates (rates also refresh automatically every day)
- override a rate manually
- add a markup %
- set a rounding step per currency
- hide a currency
- set country → currency/language rules

The visitor's own choice is saved in a cookie and always wins.

**Language**: the site never redirects visitors (or Googlebot). It only shows a suggestion bar that the visitor can dismiss. Every page has `hreflang` en/vi + `x-default`, and the sitemap includes both languages.

**Adding a new language** (for example Korean `ko`):
1. Add `"ko"` to `locales` in `src/i18n/config.ts` (and to `localeNames`, `htmlLang`, `ogLocale`; add country hints in `countryLocale` if needed).
2. Copy `src/i18n/en.ts` to `src/i18n/ko.ts`, translate it, and register it in `src/i18n/index.ts`.
3. Add translations for the static pages in `src/content/pages.ts`.
4. Translators (role `translator`) log in to the admin. A KO column appears automatically on every tour, guide and message template. Any field left empty falls back to English.

## Admin

| Role | Access |
|---|---|
| admin | Everything, including staff, webhooks, rates, audit log |
| sales | Bookings, customers, promo codes |
| editor | Tours, guides, reviews, message templates |
| translator | Translation fields only (cannot change prices or English content) |

- Tours: English content and the VI translation side by side; departures and prices; categories; SEO. Changing a slug automatically creates a 301 redirect.
- Guides (blog): Markdown, scheduled publishing (future publish date). Use `[[tour:slug]]` to embed a tour card.
- Customers (CRM): timeline, notes, tags, CSV export, and GDPR / Decree 13 data export or erasure.
- 301 redirects for URLs from the old website: Admin › Languages & currencies.

## Customer messages

Templates are edited per language under Admin › Message templates, and each customer gets messages in their own language. The channels are:
- Email via Resend
- WhatsApp via the Cloud API
- Zalo ZNS (Vietnamese customers), falling back to SMS through eSMS

If a channel has no API key, the message is only **logged** under Admin › Audit log. Nothing is sent, which makes testing safe.

## Webhooks (n8n / Make / Zapier)

Set them up under Admin › Webhooks. Events:
- `lead.created`
- `booking.created`
- `payment.succeeded`
- `payment.failed`
- `checkout.abandoned`
- `trip.upcoming`
- `trip.completed`
- `booking.status_changed`

Each call is a JSON POST: `{ "event", "created_at", "data" }` with these headers:
- `x-amgo-event`
- `x-amgo-signature` = HMAC-SHA256(raw body, secret), hex

Sample payloads for every event are on the admin page. A "Send test" button is also there.

## Security

- HTTPS/HSTS and CSP headers (`next.config.ts`).
- Admin auth: scrypt password hashing, 2FA (TOTP), idle session timeout, rate-limited login, and an audit log of every change.
- Checkout endpoints require a per-booking cookie.
- Optional Turnstile on the forms; rate limits on the APIs.
- Analytics and pixels load only after the visitor accepts cookies.
- No secrets in the code: use environment variables (`.env*` is git-ignored, except `.env.example`).

## Directory layout

```
prisma/            schema, seed data (seed-data.mjs holds the sample tour content)
src/app/[locale]/  public pages (en at /, vi at /vi)
src/app/admin/     admin
src/app/api/       search, leads, bookings, onepay (ipn/return), cron
src/lib/           booking, onepay, currency, crm, notify, search, seo...
src/i18n/          language config + dictionaries
src/middleware.ts  language/currency detection, redirects, admin gate
```
