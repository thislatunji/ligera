# Step-by-Step TDD Implementation Plan: Admin Portal

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run tests/admin-portal`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server; fake timers for WAT-boundary tests; recharts
  rendering mocked in component tests.
- **Fixture:** `seedDashboardMonth()` — 45 paid orders across 3 weeks (two products
  dominant), 3 pending_payment (1 expired → abandoned), 2 low-stock variants, 6 customers (2
  consented), 2 new custom requests, settings defaults.
- **Coverage:** ≥ 80% on `lib/services/admin/**`.

## 2. Target File Structure

```text
web/src/
├── app/admin/
│   ├── page.tsx                       # dashboard
│   ├── settings/page.tsx              # tabbed settings
│   ├── customers/page.tsx
│   ├── activity/page.tsx
│   └── (products/orders/custom-requests routes live in their domains)
├── app/
│   ├── our-story/page.tsx  faqs/page.tsx  delivery-returns/page.tsx
│   ├── contact/page.tsx  policies/[slug]/page.tsx
│   └── api/
│       ├── content/[slug]/route.ts    # public
│       └── admin/
│           ├── dashboard/route.ts
│           ├── activity-logs/route.ts
│           ├── settings/route.ts
│           ├── content/route.ts  content/[slug]/route.ts
│           ├── customers/route.ts  customers/export.csv/route.ts
│           └── delivery-zones/route.ts  delivery-zones/[id]/route.ts
├── lib/services/admin/
│   ├── dashboard.ts                   # aggregations
│   ├── settings.ts                    # singleton + 60s cache
│   ├── content.ts  customers.ts  activity.ts  zones.ts
├── lib/api/schemas/admin.ts  lib/api/types/admin.ts
├── components/admin/{DashboardHeadline.tsx, ActionList.tsx, LowStockTable.tsx,
│   CategoryRevenueChart.tsx, SettingsTabs.tsx, ZoneTable.tsx, CustomerTable.tsx,
│   ActivityLogViewer.tsx}
└── tests/admin-portal/*.test.ts
web/scripts/migrations/20261110000006-admin-portal.ts
```

## 3. Phase 0: Module Foundation & Schema Setup

- **0.1 [VERIFY]** migration creates `content_pages` (7 seeded pages incl. NDPA-aligned
  Privacy — FR-050), seeds `settings` defaults, adds `orders { status: 1, paidAt: 1 }` and
  `{ "items.productId": 1, status: 1 }` indexes; re-run is a no-op.

## 4. Phase 1: `GET /api/admin/dashboard` (AD-010–013)

- **1.1 [RED]** `dashboard.test.ts` against the fixture:
  - revenue/paidOrders/AOV exact for `today`, `7d`, `30d`; previous-period comparison exact
    (AD-010);
  - WAT midnight boundary: an order paid 23:59 WAT vs 00:01 WAT lands in the right day
    (fake timers);
  - action list counts (paid-awaiting, new requests, failed/abandoned) exact (AD-011);
  - top products: units + revenue ordering (AD-012);
  - revenue by category correct via product lookup;
  - low stock includes threshold-crossers and sold-out, excludes made-to-order (AD-013,
    AC-008 surface);
  - stock value at cost and selling exact;
  - staff token → 403 `AUTH_FORBIDDEN` (AC-009).
- **1.2 [RED]** route test (period parsing, 400).
- **1.3 [GREEN]** `services/admin/dashboard.ts` + route.
- **1.4 [VERIFY]** PASS.

## 5. Phase 2: settings singleton + zones (AD-050–052, AD-060–063, AC-007)

- **2.1 [RED]** settings:
  - get returns merged defaults; partial PUT updates only the patched top-level keys;
  - 60 s cache: two gets → one DB read (fake timers); write invalidates immediately;
  - invalid cutoff/whatsapp/fee → 400 with field errors;
  - `+log` row has before/after diff of changed keys.
- **2.2 [RED]** zones CRUD: create/update/delete; delete of an order-referenced zone → 409
  `ZONE_IN_USE`; inactive zone hidden from public `GET /api/delivery-zones`; **checkout
  quote uses a changed fee immediately** (integration with checkout service — AC-007).
- **2.3 [GREEN]** `settings.ts` + `zones.ts` + routes.
- **2.4 [VERIFY]** PASS.

## 6. Phase 3: content pages (AD-061, FR-040/050)

- **3.1 [RED]** list/read/update owner flow; public read returns sections with resolved
  image URLs + 404 for unknown slug; markdown-lite sanitization strips raw HTML/script;
  alt text required; `updatedBy` stamped; update visible on public read within cache TTL.
- **3.2–3.4]** route tests → `content.ts` → VERIFY.

## 7. Phase 4: customers + CSV (AD-064)

- **4.1 [RED]** aggregation by email join: orderCount/totalSpend (paid only)/lastOrderAt
  exact on fixture; `consentOnly` filter; `q` search; CSV columns + attachment; staff → 403;
  `+log` on export.
- **4.2–4.4]** tests → `customers.ts` → VERIFY.

## 8. Phase 5: activity log viewer (AD-003)

- **5.1 [RED]** filters (user, action prefix, entity, dates), newest-first paging, rows
  include before/after; owner-only.
- **5.2–5.4]** tests → `activity.ts` → VERIFY.

## 9. Phase 6: Admin UI (§14, G3/G4, AC-009)

- **6.1 [RED]** component tests:
  - dashboard: headline `CountUpStat` row with period selector + comparison direction;
    action-list cards deep-link to filtered lists; low-stock table links to product editor;
    category chart renders data keys.
  - shell: staff navigation shows Orders + Products only; owner sees all — revenue widgets
    absent for staff (AC-009).
  - settings tabs: save flows call the right endpoints; zones table inline edit; blackout
    date picker; pickup toggle.
  - customers: consent filter + CSV button; activity: diff viewer renders before/after.
- **6.2 [GREEN]** pages + components (Watermelon UI dashboard blocks; recharts bars).
- **6.3 [VERIFY]** vitest + `npm run build`; manual G4 check: "how much this week and what's
  low" answerable in one screen ≤ 10 s.

## 10. Phase 7: Storefront consumption (FR-040/041/050)

- **7.1 [RED]** home renders announcement bar + hero + featured collections +
  Instagram strip + newsletter signup from settings; header/footer show WhatsApp/Instagram/
  hours (FR-041); content pages render public content API output; 404 branded fallback for
  unknown policy slug.
- **7.2 [GREEN]** storefront pages.
- **7.3 [VERIFY]** PASS + `npm run build`.

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run tests/admin-portal` green; coverage ≥ 80% on services.
- [ ] Cross-file audit: `SettingsPatch`/`DashboardSnapshot` field names, zone fields, period
      enum match README §3 + sibling docs; endpoint paths identical.
- [ ] Owner-only guard on every revenue/settings surface; staff 403 suite green (AC-009).
- [ ] Every dashboard number has a fixture-backed test (no untested aggregation).
- [ ] Settings cache invalidated on write (no stale storefront hero in tests).
- [ ] Privacy page content aligned with NDPA 2023 (review vs PRD FR-050 wording).
- [ ] Manual G3/G4 walkthrough recorded; quick-guide one-pager drafted for the owner (§11
      Maintainability).
