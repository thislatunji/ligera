# Business Logic & Endpoint Execution Steps: Catalog

All endpoints accept JSON. Errors per README §3.5. Actor context via `requireAuth()` /
`requireRole("owner")`. Every admin mutation ends with an `activity_logs` append (steps
abbreviated as **+log**).

| Method | Path | Summary | Auth |
|---|---|---|---|
| GET | `/api/products` | Published catalog | public |
| GET | `/api/products/:slug` | Product detail | public |
| GET | `/api/search/suggest` | Suggestions | public |
| GET | `/api/categories` | Taxonomy | public |
| GET | `/api/admin/products` | Admin catalog | staff |
| POST | `/api/admin/products` | Create product | owner |
| PUT | `/api/admin/products/:id` | Edit product | owner |
| PATCH | `/api/admin/products/:id/status` | Status transition | owner |
| POST | `/api/admin/products/:id/duplicate` | Duplicate | owner |
| DELETE | `/api/admin/products/:id` | Delete (draft/archived) | owner |
| POST | `/api/admin/products/:id/variants` | Add variant | owner |
| PUT | `/api/admin/variants/:id` | Edit variant | owner |
| DELETE | `/api/admin/variants/:id` | Remove variant | owner |
| POST | `/api/admin/variants/:id/stock` | Manual stock adjustment | staff |
| GET | `/api/admin/variants/low-stock` | Low-stock list | staff |
| GET | `/api/admin/products/export.csv` | CSV export | owner |
| POST | `/api/admin/products/import.csv` | CSV import | owner |
| GET/POST/PUT/DELETE | `/api/admin/categories[/:id]` | Taxonomy CRUD | owner |

---

## Step 1 — `GET /api/products`

1. **Context:** public; `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
2. **Validation:** `ProductQuery` → 400 `VALIDATION_ERROR` with issues (plain-language).
3. **Processing:** aggregation on `products`:
   - match `status: "published"`, optional `categoryId` (resolved from `category` slug),
     `spaceTagIds` (resolved from `space` slug), text search on `q` (text index), price range on
     denormalized `variants.minPrice`;
   - `$lookup` active `variants` → compute `priceFrom`, `badge` per README §3.4 availability
     (`madeToOrder` short-circuits to `made_to_order`);
   - sort mapping: `newest → { createdAt: -1 }`, `price-asc/-desc → { "variants.minPrice": ±1 }`,
     `popular → { popularity: -1, createdAt: -1 }`;
   - facet: page slice (≤ 24) + `total`.
4. **Persistence:** none (read).
5. **Async:** none.
6. **Response:** `200 { data: ProductCard[], meta: { page, limit, total } }`; image URLs
   Cloudinary `f_auto,q_auto,w_400` (≤ 150KB mobile).

## Step 2 — `GET /api/products/:slug`

1–2. Public; slug exists **and** `status: "published"` — else 404 `NOT_FOUND`
("We couldn't find that product.").
3. Load product + active variants (sorted by `price`), map images to Cloudinary URLs (gallery
   width 1200, cards 400), compute `available`/`lowStock`/`soldOut` per variant, resolve
   `pairsWith` (published only, ≤ 4).
4–5. None.
6. `200 ProductDetail`.

## Step 3 — `GET /api/search/suggest?q=`

1–2. Public; `q ≥ 2` chars else `200 []`.
3. `products.find({ status: "published", $text: { $search: q } }).limit(8)` project
   `{ slug, name, image }` score-sorted.
4–5. None. 6. `200 Suggestion[]`.

## Step 4 — `GET /api/categories`

1–3. Public; optional `type` filter; `active: true`; sorted `sortOrder, name`.
4–5. None. 6. `200 Category[]`.

## Step 5 — `GET /api/admin/products`

1. `requireAuth()` (staff or owner).
2. `AdminProductQuery` → 400.
3. Same aggregation as Step 1 but **all statuses**, name/SKU substring `q`, `lowStock` filter
   (any variant `available ≤ lowStockThreshold`), owner gets `costPrice` in rows — staff rows
   redact it.
4–5. None (+no log on reads). 6. `200 { data: AdminProductRow[], meta }`.

## Step 6 — `POST /api/admin/products` (create)

1. `requireRole("owner")`.
2. `ProductUpsert` → 400 (alt text on every image enforced — AC-013).
3. **Processing:**
   - generate unique slug (`slugify(name)` + suffix loop);
   - validate every `variants[].sku` free (unique index) → 409 `SKU_TAKEN`;
   - compute denormalized `variants.minPrice` (min effective price).
4. **Persistence:** insert `products` doc + each `variants` doc; recompute nothing else.
   **+log** `product.create` (after = new doc).
5. **Async:** none.
6. `201 { id }`.

## Step 7 — `PUT /api/admin/products/:id` (edit)

1. `requireRole("owner")`. 2. Body `ProductUpsert`; 404 if id unknown.
3. Diff incoming vs current (name/description/seo/images order/...); **slug immutable after
   first publish** (409 `SLUG_IMMUTABLE` if changed while published); recompute
   `variants.minPrice`; validate SKU changes.
4. Update product + upsert variant set (create new, update existing, deactivate missing).
   **+log** `product.update` with `{ before, after }` diff (AD-020, AC-007 context).
5–6. None; `200 { id }`.

## Step 8 — `PATCH /api/admin/products/:id/status`

1. `requireRole("owner")`. 2. `{ status }` enum → 400.
3. Transition check against §3.6 machine (specs) → 409 `INVALID_TRANSITION` on illegal move
   (e.g. archived → published must go through draft).
4. Update status. **+log** `product.status.change` `{ before, after }`.
5. **Async:** none (storefront reads pick it up on next request — AD-022 instant).
6. `200 { id, status }`.

## Step 9 — `POST /api/admin/products/:id/duplicate`

1–2. Owner; source may be any status.
3. Clone with `name + " (Copy)"`, fresh slug + `(2,3…)` SKU suffixes `-C1`, `status: "draft"`,
   images/space tags/scent copied, `popularity: 0`.
4. Insert product + variants. **+log** `product.duplicate`.
5–6. None; `201 { id }`.

## Step 10 — `DELETE /api/admin/products/:id`

1–2. Owner; 404 unknown.
3. **Pre-condition:** `status ∈ {draft, archived}` else 409 `PRODUCT_PUBLISHED`.
4. Check `orders.items[].productId` references — if any, instead hard-delete is refused;
   keep as archived (409 `PRODUCT_IN_USE`). Otherwise delete variants + product.
   **+log** `product.delete` (before = summary snapshot).
5–6. None; `200 { ok: true }`.

## Step 11 — `POST /api/admin/products/:id/variants` & `PUT /api/admin/variants/:id`

1. Owner. 2. `VariantInput` → 400; SKU uniqueness → 409.
3. Recompute parent `variants.minPrice`.
4. Insert/update variant. **+log** `variant.create` / `variant.update` (diff includes price —
   AC-009 ensures only owner).
5–6. `201/200 { id }`.

## Step 12 — `DELETE /api/admin/variants/:id`

1–2. Owner; 404 unknown.
3. If referenced by `orders.items[].variantId` → 409 `VARIANT_IN_USE` (deactivate instead).
4. Delete + recompute `minPrice`. **+log** `variant.delete`.
5–6. `200 { ok: true }`.

## Step 13 — `POST /api/admin/variants/:id/stock` (AD-030)

1. `requireAuth()` (owner **or staff**).
2. `StockAdjustmentInput` → 400; `reason` limited to manual set
   (`restock|damaged|sample|correction`) — order-driven reasons are system-only.
3. **Atomic:** `findOneAndUpdate({ _id, $expr: { $gte: ["$stockQty", -change] } },
   { $inc: { stockQty: change } }, { new: true })` — if no match → 422 `STOCK_NEGATIVE`.
4. Insert `stock_adjustments` `{ variantId, change, reason, userId, note }`.
   **+log** `stock.adjust` `{ before: oldQty, after: newQty }`.
5. **Async:** if post-adjust `available ≤ lowStockThreshold` → enqueue
   `stock.low.owner` notification (NT-007, notifications domain; dedupe per variant per day).
6. `200 { stockQty, available }`.

## Step 14 — `GET /api/admin/variants/low-stock`

1. `requireAuth()` (staff). 2. Optional `threshold` override.
3. Aggregate variants with `$lookup` product where
   `stockQty − heldQty ≤ lowStockThreshold` and product not `madeToOrder` (AD-032/033).
4–5. None. 6. `200 LowStockRow[]`.

## Step 15 — `GET /api/admin/products/export.csv`

1. Owner. 2. None.
3. Stream all products + variants to CSV columns:
   `product_id, name, slug, status, category, spaces, variant_sku, label, price, sale_price,
   cost_price, stock_qty, low_stock_threshold, made_to_order, lead_time_days`.
4–5. None. 6. `200 text/csv` (`Content-Disposition: attachment; filename="ligera-catalog.csv"`),
   +log `catalog.export`.

## Step 16 — `POST /api/admin/products/import.csv`

1. Owner. 2. `multipart/form-data` with `file` (≤ 5MB, ≤ 2,000 rows).
3. Parse rows; match by `product_slug + variant_sku` → update price/sale/threshold/stock;
   new sku → create variant; errors collected per row (422 `IMPORT_ROW_ERROR` report at end,
   valid rows still applied).
4. Batch writes; recompute affected `minPrice`. **+log** `catalog.import`
   `{ after: ImportReport }`.
5–6. None; `200 ImportReport`.

## Step 17 — `/api/admin/categories` CRUD

1. Owner. 2. `CategoryInput` → 400; slug uniqueness → 409 `SLUG_TAKEN`.
3. Delete guard: category with products attached (or children) → 409 `CATEGORY_IN_USE`
   (reassign or deactivate instead).
4. Insert/update/delete. **+log** `category.create/update/delete`.
5–6. `200/201` payloads.

---

## Frontend execution notes (storefront + admin UI)

- `/shop` (`app/shop/page.tsx`): server component reads `ProductQuery` from `searchParams`,
  calls the service layer directly (no HTTP hop); filter drawer (category/space/price), sort
  select, 24-per-page pagination, `ProductCard` grid `grid-cols-2` from 390px.
- `/spaces/[slug]`: same page component with `space` fixed + hero strip.
- `/products/[slug]`: `generateMetadata` from product `seo` (fallback name + first 160 chars),
  JSON-LD `Product` (offers from variants, image array), gallery (embla), sticky add-to-cart
  (mobile), WhatsApp click-to-chat with pre-filled product name (FR-032), "Pairs well with"
  row. Client `AddToCart` writes the cart context (checkout-payments domain) and fires
  `add_to_cart` GA4/Meta events.
- Admin `/admin/products` table + `/admin/products/[id]` editor sections (basics, photos with
  drag-reorder, pricing & variants, stock, scent & space, SEO) per §14; image upload flow:
  `POST /api/admin/uploads/sign` → direct Cloudinary POST → attach `{publicId, alt}`.
- Search box with debounced `GET /api/search/suggest` (≥ 2 chars) on desktop header + mobile
  sheet.
