# Business Logic & Endpoint Execution Steps: Orders & Fulfillment

All endpoints accept JSON. Guards: `staff` (owner or staff) unless marked **owner**. All
mutations append `activity_logs` (**+log**). Order resolution: `:id` = ObjectId **or**
`orderNumber`.

| Method | Path | Summary | Auth |
|---|---|---|---|
| GET | `/api/admin/orders` | List + filters + search | staff |
| GET | `/api/admin/orders/:id` | Detail | staff |
| PATCH | `/api/admin/orders/:id/status` | Transition | staff |
| POST | `/api/admin/orders/:id/cancel` | Cancel + stock rules | staff |
| POST | `/api/admin/orders/:id/refund` | Refund | **owner** |
| GET | `/api/admin/orders/:id/verify-payment` | Re-check payment | staff |
| GET | `/api/admin/orders/:id/packing-slip` | Printable HTML | staff |
| GET | `/api/admin/orders/export.csv` | Accounting CSV | **owner** |

---

## Step 1 — `GET /api/admin/orders`

1. **Context:** `requireAuth()`.
2. **Validation:** `AdminOrderQuery` → 400.
3. **Processing:** build the query: `status`/`paymentStatus`/`zoneId`/date-range equality and
   range; `q` → prefix-regex on `orderNumber` **or** `customer.name` **or** `customer.phone`;
   `view=actionable` → `status: "paid"`; `view=failed_abandoned` →
   `status: { $in: ["abandoned", "pending_payment"], paymentStatus: { $in: ["pending",
   "failed"] } }` (AD-043). Sort `createdAt: -1` (WAT display client-side). Compute
   `needsAction` and `giftOrder` flags per row.
4–5. None (read; no log).
6. `200 { data: AdminOrderListRow[], meta: { page, limit, total } }`.

## Step 2 — `GET /api/admin/orders/:id`

1. `requireAuth()`. 2. Resolve order (id or orderNumber) → 404 `NOT_FOUND`.
3. Load with payment sub-doc; project `AdminOrderDetail` (timeline enriched with actor names
   from `users`; internal notes reverse-chron).
4–5. None. 6. `200 AdminOrderDetail`.

## Step 3 — `PATCH /api/admin/orders/:id/status` (AD-042)

1. `requireAuth()`.
2. `StatusUpdate` → 400; `status` must be in the manual set (`paid`/`abandoned` are
   system-only).
3. **Matrix guard:** `transitionOrder()` (specs §3.2) checks `ALLOWED[from]` → 409
   `INVALID_TRANSITION` with plain-language copy ("You can't move a delivered order back to
   processing.").
4. Atomic `findOneAndUpdate` push `statusTimeline { status, at, byUserId, note }` +
   **+log** `order.status.<to>` `{ before, after }`.
5. **Async:** if `emailCustomer !== false` → enqueue `order.status.customer` (NT-003) —
   short status update with order number; when moving to `out_for_delivery`, the template
   includes the delivery contact. Dedupe key `(orderId, status)` → one email per state even if
   re-triggered.
6. `200 { id, status, statusTimeline }`.

## Step 4 — `POST /api/admin/orders/:id/cancel` (AD-031)

1. `requireAuth()`.
2. `CancelInput` → 400 (`reason` mandatory — plain-language record).
3. **Pre-condition:** current status must allow `cancelled` (matrix) else 409.
4. **Persistence (atomic per item):**
   - from `pending_payment`: release holds — `Variant.findOneAndUpdate({ _id, heldQty: {
     $gte: qty } }, { $inc: { heldQty: -qty } })`; payment.status stays `pending`.
   - from `paid|processing|ready_for_pickup|out_for_delivery`: if
     `restoreStock ?? order.restoreStockOnCancel` → `Variant.findOneAndUpdate({ _id },
     { $inc: { stockQty: +qty } })` + `stock_adjustments` (`order_cancelled`, actor) +
     low-stock recheck (NT-007); else skip (owner switched off).
5. **Async:** enqueue `order.cancelled.customer` (NT-004) — what happened + refund timing if
   applicable. **+log** `order.cancel` `{ before, after, restoreStock }`.
6. `200 { id, status: "cancelled", restoredStock }`.

## Step 5 — `POST /api/admin/orders/:id/refund` (**owner**)

1. `requireRole("owner")` → 403 for staff ("Only the owner can refund orders.").
2. `RefundInput` → 400; default `amount = order.total`; `amount > total` → 422
   `REFUND_EXCEEDED`; unpaid order → 409 `NOT_PAID`.
3. **Processing:** Flutterwave `POST /v3/transactions/:id/refund` (via
   `integrations/flutterwave.ts`) — full or partial amount.
4. **Persistence:** on success — `payments.status = "refunded"`, order transition
   `cancelled → refunded` (or terminal record if not cancelled), timeline note with amount.
   On failure → 502 `REFUND_FAILED`, **no state change**.
5. **Async:** enqueue `order.cancelled.customer` (NT-004 refund variant: amount + "3–5
   working days" timing). **+log** `order.refund` `{ after: { amount } }`.
6. `200 { id, status: "refunded", refundAmount }`.

## Step 6 — `GET /api/admin/orders/:id/verify-payment` (AC-004)

1. `requireAuth()`. 2. Resolve order → 404.
3. **Processing (specs §3.6):**
   - already `paid` → `outcome: "already_paid"`.
   - else `GET /v3/transactions/verify/:linkId` (fallback: filter by `tx_ref =
     orderNumber`):
     - `successful` + amount matches → run the **shared paid-commit** from
       checkout-payments (`payment-webhook.ts` export) → `outcome: "paid_now"` — the order
       corrects itself (AC-004).
     - `successful` + mismatch → enqueue `payment.mismatch.owner` (NT-008);
       `outcome: "amount_mismatch"`.
     - `failed`/not found → `outcome: "failed" | "not_found"` with plain-language message.
4–5. **+log** `order.verify_payment` `{ after: outcome }`.
6. `200 VerifyPaymentResult`.

## Step 7 — `GET /api/admin/orders/:id/packing-slip` (AD-044)

1. `requireAuth()`. 2. Resolve → 404.
3. **Processing:** server-render print HTML (specs §3.5): A5 print CSS, logo, order number +
   date (WAT), customer + address/zone or pickup line, item rows (name — label, sku, qty),
   gift note when present, **prices hidden when `order.hidePrices`** (FR-019), gypsum
   "Fragile" handling banner when any item's product category is Gypsum Decor (PRD §5).
4–5. None (read-only render). 6. `200 text/html` (`Cache-Control: no-store`).

## Step 8 — `GET /api/admin/orders/export.csv` (**owner**, AD-045)

1. `requireRole("owner")`. 2. `ExportQuery` filters.
3. **Processing:** stream orders (date/status filtered) to CSV columns:
   `order_number, placed_at, status, payment_status, customer_name, customer_email,
   customer_phone, delivery_method, zone, address, items (name|label|qty|unit_price; …),
   subtotal, delivery_fee, total, gift_note, refunded_amount`.
4–5. None. **+log** `orders.export` `{ after: { count } }`.
6. `200 text/csv` attachment `ligera-orders-<yyyymmdd>.csv`.

---

## Frontend execution notes (admin portal)

- `/admin/orders/page.tsx`: filter bar (status, paymentStatus, zone, date range, search box),
  quick views **Actionable** (paid, awaiting processing) and **Failed & abandoned**
  (AD-043/011); mobile-first rows (owner works from a phone — §11).
- `/admin/orders/[id]/page.tsx`: status action buttons rendered from the matrix (only legal
  next states enabled), "email customer" checkbox default on, timeline with actor + note,
  packing-slip button (opens print HTML), "Verify payment" prominent on pending/abandoned
  payment rows, internal-notes composer, restore-stock toggle (owner), refund button (owner)
  with amount + confirmation.
