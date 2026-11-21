# Business Logic & Endpoint Execution Steps: Checkout & Payments

All endpoints accept JSON. Errors per README §3.5 with plain-language messages (§11 Usability).
Endpoints here are **public** (guest checkout FR-011).

| Method | Path | Summary |
|---|---|---|
| GET | `/api/delivery-zones` | Active zones |
| POST | `/api/checkout/quote` | Live-priced summary (no hold) |
| POST | `/api/checkout/orders` | Create order + hold + payment link |
| POST | `/api/webhooks/flutterwave` | Signed payment notification |
| POST | `/api/orders/lookup` | Confirmation / track status |

---

## Step 1 — `GET /api/delivery-zones`

1. **Context:** public; `Cache-Control: public, s-maxage=300`.
2–3. `delivery_zones.find({ active: true }).sort({ sortOrder: 1 })`.
4–5. None. 6. `200 DeliveryZone[]` `{ id, name, fee, etaText }`.

## Step 2 — `POST /api/checkout/quote`

1. **Context:** public; rate limit 30/min/IP.
2. **Validation:** `QuoteRequest` → 400 `VALIDATION_ERROR`.
3. **Processing:**
   - load variants (with product, `status: "published"`) by ids — missing/inactive → 409
     `ITEM_UNAVAILABLE` with names (plain-language);
   - prices are **server truth**: `unitPrice = salePrice ?? price` — client-sent prices are
     ignored (never trust the browser);
   - effective availability `available = stockQty − heldQty` (made-to-order → ignore stock);
   - fee per specs §3.5 (pickup → 0; threshold → 0; else zone fee); missing zone with
     `deliveryMethod: "delivery"` → 422 `ZONE_INVALID`;
   - `freeDeliveryGap` when a threshold is configured and unmet;
   - `expectedDeliveryWindow` preview (cut-off/blackout/lead-time aware).
4–5. None (quote holds nothing). 6. `200 QuoteSummary`.

## Step 3 — `POST /api/checkout/orders` (the critical path)

1. **Context:** public; rate limit 10/min/IP (429).
2. **Validation:** `CheckoutRequest` → 400; `deliveryMethod: "delivery"` requires `address` +
   `zoneId` (422 `ZONE_INVALID`).
3. **Processing & reservation (atomic, per specs §3.6):**
   1. Load variants + products (`published`, active). Any missing → 409 `ITEM_UNAVAILABLE`
      (no holds taken yet).
   2. **Reserve each line:** `Variant.findOneAndUpdate({ _id, active: true, $expr: { $gte:
      [{ $subtract: ["$stockQty", "$heldQty"] }, qty] } }, { $inc: { heldQty: qty } },
      { new: true })`. Made-to-order lines skip reservation (AD-033).
   3. **Failure compensation:** any null result → release already-reserved lines
      (`$inc heldQty: -qty`), respond 409 `STOCK_SOLD_OUT` with
      `{ items: [{ slug, name: "<Product> — <label>" }] }` ("…just sold out. Please remove it
      to continue.") — **before** any order/payment exists, so the loser never pays (AC-005).
4. **Persistence (single order creation):**
   - `orderNumber = nextNumber("order")` (counter `$inc`);
   - build order doc: items **snapshot** `{variantId, productId, name, sku, unitPrice
      (salePrice ?? price), qty, imageUrl}` (AC-007 — later price changes never mutate placed
      orders); `subtotal` from server prices; `deliveryFee` from zone snapshot; `total`;
     `holdExpiresAt = now + 30 min` (FR-015); `expectedDeliveryWindow`; `status:
      "pending_payment"`, `paymentStatus: "pending"`; initial `statusTimeline` entry;
   - upsert `customers` by email (`name`, `phone`, `marketingConsent`, `lastOrderAt`);
   - insert order + `payments` doc `{ orderId, provider: "flutterwave", reference:
      orderNumber, amount: total, status: "pending" }`.
5. **Async (external call before responding):** `POST /v3/payments` to Flutterwave
   (`tx_ref = orderNumber`, `amount = total`, `currency: "NGN"`, `customer { email, name,
   phone }`, `redirect_url = APP_URL/order/<orderNumber>`, `customizations { title: "Ligera",
   logo: gold mark }`). On success persist `linkId` + `linkUrl`. **On failure:** release all
   holds, delete the order+payment docs, return 502 `PAYMENT_LINK_FAILED` ("We couldn't start
   your payment. Please try again." — no dead end, cart intact).
   Fire GA4/Meta `begin_checkout` is client-side; `Purchase` fires on the confirmation page
   after Paid (platform domain).
6. **Response:** `201 CheckoutResult { orderNumber, total, paymentUrl, holdExpiresAt,
   expectedDeliveryWindow }`; client redirects the browser to `paymentUrl`.

## Step 4 — `POST /api/webhooks/flutterwave` (source of truth, FR-016)

1. **Context:** public but signature-gated: header `verif-hash` must equal `FLW_SECRET_HASH`
   (constant-time compare) → else 401 `WEBHOOK_INVALID` and nothing else happens.
2. **Validation:** `FlutterwaveWebhook` shape → malformed → 400 (Flutterwave will not retry
   shape errors; fine).
3. **Processing:**
   1. Parse `tx_ref` → load `payments` by `reference` (and its order). Unknown `tx_ref` →
      `200 { ok: true }` (ack, ignore — e.g. test webhooks).
   2. **Idempotency short-circuit:** if `payment.status === "successful"` **and**
      `order.status !== "pending_payment"` → already processed → `200 { ok: true }` with **no
      state change, no email** (§10 "sent once per event even if Flutterwave notifies twice").
   3. **Re-verify (never trust the payload):** `GET /v3/transactions/verify/:id` with
      `FLW_SECRET_KEY` — a Flutterwave-confirmed read of `{ status, amount, currency }`.
   4. **Amount/currency guard:** `data.amount === order.total && currency === "NGN"` else →
      enqueue `payment.mismatch.owner` (NT-008) and return 200 (alert path, no state change).
   5. Map Flutterwave status:
      - `successful` → **Paid commit** (Step 4.4 below).
      - `failed` → payment.status = `failed`; order stays `pending_payment` until the expiry
        job abandons it (AC-003 — no email to customer, no stock commit).
      - anything else → record raw summary only.
4. **Paid commit (exactly-once via status guard):**
   `Order.findOneAndUpdate({ _id, status: "pending_payment" }, { status: "paid",
   paymentStatus: "successful", verifiedAt: now, $push: statusTimeline })` — null result
   means a duplicate/racing delivery: stop, `200 { ok: true }`.
   Then, per item: `Variant.findOneAndUpdate({ _id }, { $inc: { stockQty: -qty, heldQty:
   -qty } })` + `stock_adjustments` (`order_paid`, system user) + product
   `popularity $inc qty`; low-stock check → `stock.low.owner` (NT-007) if
   `available ≤ lowStockThreshold`.
   `payments.rawEvent = stripped summary` (card fields removed).
5. **Async (both exactly once, ≤ 60s — G5/NT-001/NT-002):** `enqueueNotification`
   `order.paid.customer` (receipt: order number, items, delivery fee, total, address,
   delivery window) and `order.paid.owner` (alert + admin link). The 30s queue processor
   guarantees the 60-second target.
6. **Response:** always `200 { ok: true }` for accepted deliveries (idempotent), so
   Flutterwave does not endlessly retry; alert-path failures are surfaced via NT-008 instead.

## Step 5 — `POST /api/orders/lookup`

1. **Context:** public; rate limit 20/min/IP.
2. **Validation:** `OrderLookupRequest` → 400.
3. **Processing:** find order by `orderNumber`; verify `email` or `phone` matches
   (`customer.email` or `customer.phone`, case-insensitive email). No match → 404 `NOT_FOUND`
   ("We couldn't find an order with those details." — no enumeration signal).
4–5. None. 6. `200 OrderStatusView` (status, paymentStatus, items, totals, window, placedAt).

---

## Hold release job — `release-expired-holds` (cron, every minute)

1. `orders.find({ status: "pending_payment", holdExpiresAt: { $lt: now } }).limit(100)`.
2. Per order: guard `Order.findOneAndUpdate({ _id, status: "pending_payment" }, { status:
   "abandoned", $push: statusTimeline })` — null → webhook won the race; skip.
3. Release each line's hold: `Variant.findOneAndUpdate({ _id, heldQty: { $gte: qty } },
   { $inc: { heldQty: -qty } })` (guard makes double-release impossible).
4. If Flutterwave had reported `failed`, set `payment.status = "failed"` (else leave
   `pending`).
5. No customer email is ever sent (AC-003). Errors → `captureError()`; self-heals next tick.
6. Webhook racing the job after step 2: the paid-commit status guard (Step 4.4) finds
   `pending_payment` false → treated as duplicate → verify-payment heals (AC-004 path).

## Frontend execution notes

- **Cart (`src/lib/cart.tsx` extension):** lines keyed by `variantId` (adds variant label,
  product slug, imageUrl); localStorage with **7-day TTL** (FR-010: `savedAt` stamp, expired
  carts cleared on load); mini-cart sheet (vaul drawer) with running subtotal + "Checkout".
- **One-page checkout (`/checkout/page.tsx`):** sections in PRD order — contact, address +
  zone dropdown (fee updates immediately via debounced `POST /api/checkout/quote` — FR-013),
  delivery method (pickup hides address/zone), gift note + hide-prices toggle (FR-019), order
  summary with delivery fee and total **before** pay (FR-012); sticky pay button; 30-minute
  hold countdown chip. Errors plain-language per field (§11); 409 sold-out highlights the
  offending line with a remove action (no dead end).
- **Confirmation (`/order/[orderNumber]/page.tsx`):** reads the just-used email from
  `sessionStorage` (checkout hand-off) → `POST /api/orders/lookup`; polls every 5s while
  `paymentStatus === "pending"` and hold not expired; on Paid renders order number, summary,
  expected window (FR-017) and fires GA4/Meta `purchase` once (sessionStorage guard); on
  failure/timeout offers "Try paying again" (re-init payment link via quote-free retry — admin
  regenerate disabled in MVP; owner can resend from order page).
- **Track (`/track/page.tsx`):** orderNumber + email-or-phone form → same lookup endpoint
  (FR-018).
