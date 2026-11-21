# Ligera Production Launch, SEO, AEO & Local Search Checklist (`ligerascents.com`)

> Canonical domain: **`https://ligerascents.com`**
> Studio address: **43 Onabola Street, Pedro Road, Gbagada, Lagos**
> Opening hours: **Mon–Sat, 9:00 AM – 6:00 PM WAT** (`Mo–Sa 09:00–18:00`)
> Phone / WhatsApp: **0809 661 3114** (`+2348096613114`)
> Instagram: **@ligera.est26** (`https://www.instagram.com/ligera.est26/`)
> Primary email identity: **`orders@ligerascents.com`**

---

## 1. Domain, DNS & HTTPS

- [ ] Point `ligerascents.com` apex (`A` / `ALIAS` / `ANAME`) and `www.ligerascents.com` (`CNAME`) DNS records to your production host.
- [ ] Enable HTTPS/TLS certificates for both `ligerascents.com` and `www.ligerascents.com`.
- [ ] Configure a permanent **301 redirect** from `https://www.ligerascents.com/*` (and `http://`) to `https://ligerascents.com/*` so canonical signals never split across hosts.
- [ ] Verify `/shop` returns a `301`/`308` permanent redirect to `/collections`.

---

## 2. Environment Variables & Email (`orders@ligerascents.com`)

Confirm all production secrets are configured (using `web/.env` for Docker/VM or your hosting dashboard):

- [ ] Set `APP_URL="https://ligerascents.com"` and `NEXT_PUBLIC_SITE_URL="https://ligerascents.com"`.
- [ ] Set `FLW_REDIRECT_URL="https://ligerascents.com/custom-requests/thanks"`.
- [ ] Set `EMAIL_FROM="Ligera <orders@ligerascents.com>"`.
- [ ] Provision real production credentials (currently commented out in `web/.env`):
  - [ ] `MONGODB_URI` (production MongoDB Atlas cluster `/ligera`)
  - [ ] `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` (strong random secrets)
  - [ ] `FLW_SECRET_KEY` & `FLW_SECRET_HASH` (live Flutterwave keys + webhook hash)
  - [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - [ ] `RESEND_API_KEY`
  - [ ] `OWNER_EMAIL="orders@ligerascents.com"`, `OWNER_NAME`, `OWNER_PASSWORD` (for owner seed)
- [ ] Set up the live **`orders@ligerascents.com`** mailbox (e.g. Google Workspace, Zoho Mail, or Cloudflare Email Routing).
- [ ] Verify `ligerascents.com` in **Resend** and publish SPF, DKIM, and DMARC DNS records so order confirmations and quotes land in customer inboxes.

---

## 3. Database Migrations, Seeds & Catalog Readiness

Once `MONGODB_URI` is connected to production:

- [ ] Run database migrations & seed scripts from `web/`:
  - `scripts/migrations/20261110000001-catalog.ts`
  - `scripts/migrations/20261110000002-seed-taxonomy.ts`
  - `scripts/migrations/20261110000003-orders-payments.ts`
  - `scripts/migrations/20261110000004-custom-requests.ts`
  - `scripts/migrations/20261110000005-notification-logs.ts`
  - `scripts/migrations/20261110000006-admin-portal.ts`
  - `scripts/seed-owner.ts`
- [ ] Verify active Lagos **Delivery Zones** in MongoDB / Admin (e.g. `Ikeja`, `Surulere`, `Lekki`, `Victoria Island`, plus any additional Lagos neighborhoods such as `Gbagada`, `Ikoyi`, `Yaba`).
- [ ] Confirm nationwide Nigeria shipping guidance & Gbagada studio pickup details in Studio Admin (`content_pages` and `settings`), replacing any remaining test/legacy `ligera.ng` values in your existing database if previously seeded.
- [ ] Upload high-resolution product photos with descriptive alt text and fill out `description`, `scentNotes`, `burnTime`, `dimensions`, `finish`, `ingredients`, `safetyInfo`, and optional `seo.title` / `seo.metaDescription` for every published product.

---

## 4. Technical SEO, Structured Data & Performance Verification

Run these checks right after deploying `https://ligerascents.com`:

- [ ] Verify `https://ligerascents.com/robots.txt`:
  - Allows `/` for standard search & AI crawlers (`OAI-SearchBot`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`).
  - Disallows `/admin`, `/auth`, `/cart`, `/checkout`, `/api/`, `/custom-requests/thanks`.
  - Points to `Sitemap: https://ligerascents.com/sitemap.xml`.
- [ ] Verify `https://ligerascents.com/sitemap.xml` includes `/`, `/collections`, all 4 `/collections/*` category pages, `/our-story`, `/custom-orders`, `/delivery-returns`, `/faqs`, `/candle-safety`, `/visit-us`, `/privacy`, `/terms`, and all published `/products/*` URLs.
- [ ] Verify `https://ligerascents.com/llms.txt` returns `200 OK` (`text/plain`) with studio details, Naira pricing, delivery zones, and product links.
- [ ] Confirm `<meta name="robots" content="noindex, nofollow">` appears on `/admin`, `/auth`, `/cart`, `/checkout`, and `/custom-requests/thanks`.
- [ ] Verify **Google Search Console** (`https://ligerascents.com` via DNS TXT record) and submit `https://ligerascents.com/sitemap.xml`.
- [ ] Test key URLs (`/`, `/collections/scented-candles`, `/products/amber-hush`, `/faqs`, `/custom-orders`, `/visit-us`) in **Google Rich Results Test** and **Schema.org Validator** (`Organization`, `HomeGoodsStore`, `WebSite`, `Product` + `Offer` `NGN`, `ItemList`, `FAQPage`, `Service`, `BreadcrumbList`).
- [ ] Test OpenGraph / WhatsApp / X link previews on `/` and `/products/amber-hush` (`https://ligerascents.com/opengraph-image`).
- [ ] Run **PageSpeed Insights (Mobile)** on `/` and `/collections` to confirm LCP and video payload perform smoothly on mobile networks.

---

## 5. Local SEO (Lagos & Nigeria) & AEO Presence

Because `.com` has no automatic Nigeria country signal, off-site citations anchor `ligerascents.com` to Lagos and get Ligera cited by Google Maps and AI engines:

- [ ] **Google Business Profile** (critical for *"scented candles near me"* and Lagos local pack):
  - Name: **Ligera**
  - Address: **43 Onabola Street, Pedro Road, Gbagada, Lagos**
  - Hours: **Monday – Saturday, 9:00 AM – 6:00 PM**
  - Phone: **0809 661 3114** (`+2348096613114`)
  - Website: **`https://ligerascents.com`**
  - Category: *Candle Store* / *Home Goods Store*
  - Add real studio & product photos and request reviews from Lagos & Abuja customers mentioning products and locations.
- [ ] **Exact Map Coordinates**: Once your Google Business Profile pin is verified on Google Maps, copy the exact verified latitude & longitude into `HomeGoodsStore` JSON-LD (`geo: { "@type": "GeoCoordinates", latitude, longitude }`) in `web/src/lib/seo/jsonld.ts`.
- [ ] **Bing Places for Business** (directly powers ChatGPT Search & Microsoft Copilot local business answers) — use the exact same NAP, hours, and `https://ligerascents.com`.
- [ ] **Apple Business Connect** — register the Gbagada studio for iPhone Apple Maps & Siri queries.
- [ ] **Google Merchant Center** (Nigeria / `NGN`) — connect product catalog for free Google Shopping visibility.
- [ ] **Instagram (`@ligera.est26`)** — update bio link to `https://ligerascents.com` and add Gbagada, Lagos location tags on posts/reels.

---

## 6. Post-Deploy Production Smoke Tests

- [ ] Browse `/`, `/collections`, all 4 `/collections/*` pages, and multiple `/products/*` pages with JavaScript disabled (`curl -s https://ligerascents.com`) to confirm full SSR HTML, pricing, and metadata render.
- [ ] Add an item to cart and verify a test checkout flow + Flutterwave webhook (`/api/webhooks/flutterwave`).
- [ ] Submit a test inquiry on `/custom-orders` and confirm the pre-filled WhatsApp message opens `2348096613114`.
- [ ] Confirm `/visit-us`, `/delivery-returns`, `/faqs`, and `/candle-safety` load cleanly on desktop and mobile.
