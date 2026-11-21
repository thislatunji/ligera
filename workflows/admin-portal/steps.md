# Business Logic & Endpoint Execution Steps: Admin Portal

All endpoints accept JSON. All routes here are **owner**-guarded via `requireRole("owner")`
(except the public content read). Every mutation appends `activity_logs` (**+log**).

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/dashboard` | Executive snapshot (AD-010–013) |
| GET | `/api/admin/activity-logs` | Audit trail (AD-003) |
| GET/PUT | `/api/admin/settings` | Settings singleton |
| GET/PUT | `/api/admin/content[/:slug]` | Content pages (AD-061) |
| GET | `/api/content/:slug` | Public content read |
| GET | `/api/admin/customers` (+ `/export.csv`) | Customer list (AD-064) |
| GET/POST/PUT/DELETE | `/api/admin/delivery-zones[/:id]` | Zones CRUD (AD-050) |

---

## Step 1 — `GET /api/admin/dashboard?period=`

1. **Context:** `requireRole("owner")` (revenue — AC-009).
2. **Validation:** `period ∈ {today, 7d, 30d}` → 400.
3. **Processing (parallel aggregations):**
   - compute WAT window `[start, end)` and the previous window (same length, immediately
     before — AD-010 comparison);
   - headline: `orders` with `paidAt` in window (statuses `paid…delivered` + `refunded`
     counted at their paid amount) → `revenue = Σ total`, `paidOrders = count`,
     `averageOrderValue = revenue / paidOrders`; same for previous window;
   - action list: counts of `orders { status: "paid" }` (awaiting processing), custom
     requests `{ status: "new" }`, payments failed/abandoned (orders `abandoned` or
     `pending_payment` with `paymentStatus ∈ {pending, failed}`) — AD-011;
   - top products: unwind items → group by `productId` → units + revenue → top 5;
   - revenue by category: items → `$lookup` products → group `categoryId` (AD-012);
   - low stock: catalog service rows (available ≤ threshold or sold out, not made-to-order) —
     AC-008 surface;
   - stock value: `Σ costPrice × stockQty` and `Σ effPrice × stockQty` over variants (AD-013).
4–5. None (read). 6. `200 DashboardSnapshot` (single response — G4 in one screen).

## Step 2 — `GET /api/admin/activity-logs`

1. `requireRole("owner")`. 2. `ActivityLogQuery` → 400.
3. Filters; `action` prefix match; newest first; paging; `before/after` included in rows
   (money-relevant fields per AD-003: prices, stock, delivery fees, settings).
4–5. None. 6. `200 { data: ActivityLogRow[], meta }`.

## Step 3 — `GET /api/admin/settings` / `PUT /api/admin/settings`

1. `requireRole("owner")`.
2. `SettingsPatch` (zod, deep-partial per top-level key) → 400 with field errors.
3. **Processing:** merge patch onto current singleton; validate cross-field sanity
   (e.g. cutoff `HH:MM` WAT; whatsapp digits only). Cache: `getSettings()` 60 s in-process
   cache is invalidated on write so the storefront reflects changes on next render.
4. **Persistence:** save singleton. **+log** `settings.update` with the before/after diff of
   changed keys (delivery fee changes logged here — AD-003).
5. **Async:** none.
6. `200 Settings`.

## Step 4 — `GET/PUT /api/admin/content[/:slug]` (AD-061, FR-040/050)

1. `requireRole("owner")`. 2. `ContentPageInput` → 400; slug ∈ the 7 fixed slugs (404
   otherwise).
3. **Processing:** markdown-lite sanitization (paragraphs, lists, links only — no raw HTML
   injection into storefront pages); image alt mandatory.
4. Update `content_pages` + `updatedBy`. **+log** `content.update` `{ after: { slug } }`.
5–6. None; `200 ContentPage`.

## Step 5 — `GET /api/content/:slug` (public)

1. Public; `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
2. Slug exists → 404 branded page otherwise.
3–5. Read + image URL resolution (Cloudinary). 6. `200 ContentPage` — storefront pages
(`/our-story`, `/faqs`, `/delivery-returns`, `/policies/[slug]`, home hero from settings)
render from this.

## Step 6 — `GET /api/admin/customers` + `/export.csv` (AD-064)

1. `requireRole("owner")` (spend = revenue data).
2. `CustomerQuery` → 400.
3. Aggregation: `customers` with `orders` joined by email → `orderCount`, `totalSpend` (paid
   orders only), `lastOrderAt`; `consentOnly` filters `marketingConsent: true` (NDPA consent
   export).
4–5. None. CSV columns:
   `email, name, phone, order_count, total_spend, last_order_at, marketing_consent,
   created_at`. **+log** `customers.export`.
6. `200` list or `text/csv` attachment.

## Step 7 — `POST/PUT/DELETE /api/admin/delivery-zones[/:id]` (AD-050)

1. `requireRole("owner")`. 2. `ZoneInput` → 400.
3. **Pre-condition (delete):** zone referenced by `orders.deliveryZoneId` → 409
   `ZONE_IN_USE` ("Deactivate this zone instead — past orders use it."). Create/update free.
4. Write zone. **+log** `delivery_zone.create/update/delete` `{ before, after }` — fee
   changes are the AD-003-listed money changes; AC-007: checkout snapshots the fee at order
   time, so past orders are unaffected.
5. **Async:** invalidate the public zones cache (`GET /api/delivery-zones`).
6. `201/200 { id }` / `200 { ok: true }`.

---

## Frontend execution notes (admin shell)

- `/admin` layout: sidebar (Dashboard, Orders, Products, Custom Requests, Customers,
  Settings, Activity) — **staff sees Orders + Products (stock tab) only** (AC-009); owner
  sees all. Watermelon UI dashboard blocks: `CountUpStat` headline row with period selector
  and comparison arrows (▲/▼), action list cards linking to filtered lists, low-stock table,
  category revenue bars (recharts), top products list.
- `/admin/settings`: tabs — Store (AD-062), Delivery (zones table + threshold/cutoff/
  blackout/pickup — AD-050–052), Homepage (announcement/hero/featured/Instagram — AD-060),
  Email templates (AD-063, preview via notifications domain), each save → activity log.
- `/admin/customers`: table + consent filter + CSV button.
- `/admin/activity`: filterable log with before/after diff viewer.
- Storefront consumption: home page renders `settings.homepage` (announcement bar, hero,
  featured collections, Instagram strip, newsletter signup → consent-stored email captured in
  `customers` with `marketingConsent`), header/footer social + hours (FR-041), content pages
  from `GET /api/content/:slug`.
