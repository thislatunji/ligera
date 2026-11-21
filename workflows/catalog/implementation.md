# Step-by-Step TDD Implementation Plan: Catalog

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run <file>`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server (platform Phase 0 fixtures reused:
  `tests/setup.ts`, `seedOwner()` helper).
- **Mocking:** Cloudinary URL builder mocked; GA4/Meta `track()` mocked in component tests;
  no network in tests.
- **Coverage:** ≥ 80% on `lib/services/catalog/**`.

## 2. Target File Structure

```text
web/src/
├── app/
│   ├── shop/page.tsx                        # filters + grid (server component)
│   ├── spaces/[slug]/page.tsx
│   ├── products/[slug]/page.tsx             # generateMetadata + JSON-LD
│   └── api/
│       ├── products/route.ts  products/[slug]/route.ts
│       ├── search/suggest/route.ts
│       ├── categories/route.ts
│       └── admin/
│           ├── products/route.ts  products/[id]/route.ts
│           ├── products/[id]/status/route.ts  products/[id]/duplicate/route.ts
│           ├── products/[id]/variants/route.ts
│           ├── variants/[id]/route.ts  variants/[id]/stock/route.ts
│           ├── variants/low-stock/route.ts
│           ├── products/export.csv/route.ts  products/import.csv/route.ts
│           └── categories/route.ts  categories/[id]/route.ts
├── lib/services/catalog/{queries.ts, admin.ts, stock.ts, csv.ts, suggest.ts}
├── lib/api/schemas/catalog.ts  lib/api/types/catalog.ts
├── components/
│   ├── ProductCard.tsx  ProductGallery.tsx  AddToCartBar.tsx
│   ├── ShopFilters.tsx  SearchBox.tsx  ScentNotesBlock.tsx
│   └── admin/{ProductTable.tsx, ProductEditor.tsx, VariantRows.tsx, StockAdjustDialog.tsx,
│              ImageManager.tsx, CategoryManager.tsx, CsvButtons.tsx}
└── tests/catalog/*.test.ts
web/scripts/migrations/{20261110000001-catalog.ts, 20261110000002-seed-taxonomy.ts}
```

## 3. Phase 0: Foundation & Schema Setup

- **0.1 [VERIFY]** Run migrations (§3.3 of specs) — collections + indexes exist; seed taxonomy
  present; re-run is a no-op.
- **0.2** Seed helper `tests/catalog/seed.ts`: 12 products across the 6 PRD categories, space
  tags, 1–3 variants each, one sold-out, one low-stock, one made-to-order, one draft, one
  archived.

## 4. Phase 1: `GET /api/products` (FR-001, FR-003, FR-004, FR-005)

- **1.1 [RED]** `queries.test.ts`: published-only (draft/archived excluded); category filter
  by slug; space filter; `q` text match ranks name over description; price range on
  effective price; sorts (newest/price-asc/price-desc/popular); pagination `limit ≤ 24` +
  `meta.total`; badges (`in_stock`/`low_stock`/`sold_out`/`made_to_order`) correct incl.
  heldQty subtraction; sale price reflected in `priceFrom`.
- **1.2 [RED]** route test: query-string parsing, 400 with zod issues, cache header set.
- **1.3 [GREEN]** `services/catalog/queries.ts` + `app/api/products/route.ts`; denormalized
  `variants.minPrice` maintained by seed helper too.
- **1.4 [VERIFY]** suite PASS.

## 5. Phase 2: `GET /api/products/:slug` + suggest + categories (FR-002, FR-006)

- **2.1 [RED]** detail: 404 on unknown/unpublished; variants sorted with
  available/lowStock/soldOut; gallery ≥ 4 images honored; `pairsWith` resolves published
  products only; made-to-order + leadTimeDays surfaced; Cloudinary URL widths (400/1200).
- **2.2 [RED]** suggest: 2-char minimum, ≤ 8, score order. categories: type filter, active only.
- **2.3 [GREEN]** services + routes.
- **2.4 [VERIFY]** PASS.

## 6. Phase 3: Product create/edit/status/duplicate/delete (AD-020, AD-022, AC-006)

- **3.1 [RED]** `admin.test.ts`:
  - create: persists product + variants, `minPrice` computed, activity log row
    `product.create`, 201 `{ id }`.
  - create with duplicate SKU → 409 `SKU_TAKEN`; missing alt text → 400.
  - edit: diff logged with before/after; slug change on published → 409 `SLUG_IMMUTABLE`.
  - status: legal transitions pass; `archived → published` → 409 `INVALID_TRANSITION`;
    publish is instantly visible via public `GET /api/products` (AC-006).
  - duplicate: "(Copy)" name, fresh slugs/skus, `draft`, `popularity: 0`.
  - delete: draft ok; published → 409 `PRODUCT_PUBLISHED`; order-referenced → 409
    `PRODUCT_IN_USE`.
  - staff token on any of these → 403 `AUTH_FORBIDDEN` (AC-009).
- **3.2 [RED]** route tests delegation + role guards.
- **3.3 [GREEN]** `services/catalog/admin.ts` + routes.
- **3.4 [VERIFY]** PASS.

## 7. Phase 4: Variants + stock adjustments (AD-021, AD-030, AD-033)

- **4.1 [RED]** variant add/edit/delete + SKU uniqueness + `VARIANT_IN_USE` guard;
  `minPrice` recompute. Stock: signed `$inc` with floor guard → 422 `STOCK_NEGATIVE` when it
  would go below 0; adjustment row written with reason + userId; low-stock threshold crossing
  enqueues `stock.low.owner` (mocked enqueue) exactly once per day per variant; staff may
  adjust, may not set prices.
- **4.2–4.4]** route tests → `services/catalog/stock.ts` + routes → VERIFY.

## 8. Phase 5: Low-stock list + CSV export/import (AD-024, AD-012/013 feed)

- **5.1 [RED]** low-stock aggregation excludes made-to-order; includes sold-out; threshold
  override. export CSV header + rows match §15 col list; import: update-by-slug+sku, create
  new, per-row error report, idempotent re-import, ≤ 5MB / 2,000 rows guard.
- **5.2–5.4]** tests → `services/catalog/csv.ts` + routes → VERIFY.

## 9. Phase 6: Categories CRUD (AD-023)

- **6.1 [RED]** create/update/delete; `SLUG_TAKEN`; delete-with-products → 409
  `CATEGORY_IN_USE`; type discriminator preserved; log entries written.
- **6.2–6.4]** routes → VERIFY.

## 10. Phase 7: Storefront pages (FR-001–006, AC-011, AC-012)

- **7.1 [RED]** component/page tests (jsdom):
  - `ProductCard` renders photo/name/priceFrom/badge; two-per-row class at 390px; image
    `loading="lazy"` + width 400 URL.
  - `/products/[slug]` renders scent notes (top/heart/base), gallery, variant selector,
    sticky add-to-cart on mobile, WhatsApp link with product name in query, pairs-well-with
    row; `generateMetadata` returns unique title/description per product (AC-012); JSON-LD
    `Product` node present with offers.
  - ShopFilters update URL searchParams (category, space, price, sort).
  - SearchBox debounces (fake timers) ≥ 2 chars and renders suggestions.
  - Sold-out variant disables add-to-cart (FR-005).
- **7.2 [GREEN]** pages + components; Watermelon UI `HoverLift` excerpt on cards,
  `RevealOnScroll` on category tiles (reduced-motion respected).
- **7.3 [VERIFY]** vitest + `npm run build`; manual: Rich Results Test passes on a product
  URL (AC-012); Lighthouse mobile perf ≥ 90 on `/shop`.

## 11. Phase 8: Admin UI (§14, G8)

- **8.1 [RED]** admin tests: products table filters (status, low stock, q); inline stock edit
  opens `StockAdjustDialog` (reason required); editor sections save via API; image manager
  upload→sign→attach flow with alt text required; drag-reorder persists `position`; CSV
  buttons call endpoints; staff sees table + stock but **no** price-edit controls and no
  costPrice column (AC-009).
- **8.2 [GREEN]** `components/admin/*` wired to `lib/api` client functions.
- **8.3 [VERIFY]** PASS; timebox check: publishing a new 4-photo, 2-size product ≤ 10 min
  (G8/AC-006) during UAT dry-run.

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run` green across catalog suites; coverage ≥ 80% on services.
- [ ] Cross-file audit: endpoint paths, DTO names, `ProductStatus`/badge/reason enums match
      `workflows/README.md` §3 exactly.
- [ ] No `costPrice` or `heldQty` in any public response (grep on serialized fixtures).
- [ ] All images have alt text; contrast check on new components (AC-013).
- [ ] Migrations committed; seed taxonomy matches PRD §5 names.
- [ ] 1,000-product fixture: shop page p95 query < 150ms against Atlas test cluster (§11
      scalability).
