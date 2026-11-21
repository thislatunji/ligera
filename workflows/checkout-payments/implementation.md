# Step-by-Step TDD Implementation Plan: Checkout & Payments

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run tests/checkout`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server; Flutterwave client (`lib/integrations/flutterwave.ts`)
  mocked with `vi.mock` — a `FakeFlutterwave` fixture script drives staging-only contract tests.
- **Clock control:** `vi.useFakeTimers()` for hold expiry, cut-off and blackout tests.
- **Coverage:** ≥ 85% on `lib/services/checkout/**` and `lib/integrations/flutterwave.ts`
  (money-critical).

## 2. Target File Structure

```text
web/src/
├── app/
│   ├── checkout/page.tsx
│   ├── order/[orderNumber]/page.tsx
│   ├── track/page.tsx
│   └── api/
│       ├── delivery-zones/route.ts
│       ├── checkout/quote/route.ts
│       ├── checkout/orders/route.ts
│       ├── webhooks/flutterwave/route.ts
│       └── orders/lookup/route.ts
├── lib/
│   ├── integrations/flutterwave.ts        # createPaymentLink, verifyTransaction, refundTransaction
│   ├── services/checkout/{quote.ts, place-order.ts, payment-webhook.ts, fees.ts, window.ts,
│   │                      lookup.ts, hold-release.ts}
│   └── api/schemas/checkout.ts  api/types/checkout.ts
├── components/{MiniCart.tsx, CheckoutForm.tsx, OrderSummaryPanel.tsx, HoldCountdown.tsx,
│               TrackOrderForm.tsx, SoldOutNotice.tsx}
└── tests/checkout/*.test.ts
web/scripts/migrations/20261110000003-orders-payments.ts
```

## 3. Phase 0: Module Foundation & Schema Setup

- **0.1 [VERIFY]** migration creates `orders`, `payments`, `delivery_zones`, `customers` with
  §3.4 indexes; seed: 4 Lagos zones (fee 2000–6000, etaText), freeThreshold 150,000, cutOff
  15:00, one blackout date.
- **0.2** seed helper: 3 products × 2 variants; one variant with `stockQty: 1` (last-unit
  fixture); one made-to-order product with `leadTimeDays: 5`.

## 4. Phase 1: `GET /api/delivery-zones` + fee/window logic (FR-013, AD-051)

- **1.1 [RED]** fees tests: pickup → 0; subtotal ≥ threshold → 0; zone fee otherwise; window:
  before cut-off same day eta, after cut-off +1 working day, blackout +1 day, made-to-order
  adds leadTimeDays; zone snapshot stored on order (AC-007).
- **1.2 [RED]** route test: active-only, sorted, cache header.
- **1.3 [GREEN]** `services/checkout/fees.ts` + `window.ts` + route.
- **1.4 [VERIFY]** PASS.

## 5. Phase 2: `POST /api/checkout/quote`

- **2.1 [RED]** server-priced quote (client prices ignored); sold-out line flagged but
  non-blocking (quote informs UI); `ITEM_UNAVAILABLE` when product unpublished; threshold gap
  returned; `ZONE_INVALID`.
- **2.2–2.4]** route tests → `services/checkout/quote.ts` → VERIFY.

## 6. Phase 3: `POST /api/checkout/orders` — reservation + creation (FR-010–015, AC-005/007)

- **3.1 [RED]** `place-order.test.ts`:
  - happy path: order `pending_payment`, `holdExpiresAt = +30 min`, items snapshot with
    server prices, zone snapshot, counter orderNumber `LG-000001`, customer upsert by email
    (marketingConsent stored), payment doc pending, 201 with `paymentUrl` (mocked link).
  - **last-unit race (AC-005):** fire two concurrent placements for the `stockQty: 1`
    variant → exactly one 201; the other 409 `STOCK_SOLD_OUT` naming the item; loser's
    earlier reservations fully compensated (`heldQty` back to baseline).
  - multi-line partial failure: second line fails → first line's hold compensated, no order
    doc left behind.
  - made-to-order line never reserves, still orderable at qty 10 (AD-033).
  - delivery without zone/address → 422; rate limit → 429.
  - Flutterwave link failure → 502, holds released, order deleted (no orphan pending orders).
- **3.2 [RED]** route tests: zod mapping, Nigerian phone regex, contact/address validation.
- **3.3 [GREEN]** `services/checkout/place-order.ts` + `integrations/flutterwave.ts`
  (`createPaymentLink`).
- **3.4 [VERIFY]** PASS.

## 7. Phase 4: `POST /api/webhooks/flutterwave` (FR-016, AC-001–003)

- **4.1 [RED]** `payment-webhook.test.ts`:
  - wrong `verif-hash` → 401, zero DB writes.
  - successful charge → order `paid` + `paymentStatus: "successful"` + `verifiedAt`; each
    variant `stockQty`/`heldQty` decremented together; `stock_adjustments` rows `order_paid`;
    popularity incremented; NT-001 + NT-002 enqueued exactly once each (mock enqueue counts).
  - **duplicate webhook** → second delivery: 200, no state change, no second email (§10).
  - amount mismatch → no state change, NT-008 enqueued.
  - `failed` event → payment failed, order still `pending_payment` (job will abandon).
  - unknown tx_ref → 200 ack, nothing.
  - verify call failure (Flutterwave 5xx) → 500 to force Flutterwave retry (order untouched).
- **4.2 [RED]** route test: header gating, JSON parse, delegation.
- **4.3 [GREEN]** `services/checkout/payment-webhook.ts` (uses
  `verifyTransaction` re-verification; strip card fields before persist).
- **4.4 [VERIFY]** PASS.

## 8. Phase 5: hold release job (AC-003)

- **5.1 [RED]** `hold-release.test.ts`: expired order → `abandoned` + holds released
  (`available` restored); not-yet-expired untouched; already-paid untouched; webhook-vs-job
  race → exactly one outcome; failed-payment order also abandoned with payment failed; 100-doc
  batch limit respected.
- **5.2–5.4]** tests → `services/checkout/hold-release.ts` wired into platform scheduler →
  VERIFY.

## 9. Phase 6: `POST /api/orders/lookup` (FR-017/018)

- **6.1 [RED]** email match (case-insensitive), phone match, mismatch → 404, shape
  `OrderStatusView`, rate limit.
- **6.2–6.4]** route tests → `services/checkout/lookup.ts` → VERIFY.

## 10. Phase 7: Frontend — cart, checkout, confirmation, track

- **7.1 [RED]** component tests:
  - cart: add/update/remove; mini-cart drawer with subtotal; 7-day TTL clears a stale cart
    (fake timers); persists across reload.
  - checkout: single page, sections in PRD order; fee updates on zone change (mocked quote);
    free-delivery progress hint; gift note + hide-prices switch; sold-out 409 renders
    remove-this-item call to action; pay button disabled while quoting.
  - confirmation: polls while pending (fake timers); Paid → receipt view + `purchase` event
    fired once (sessionStorage guard); timeout → retry CTA.
  - track form validates orderNumber pattern + requires email or phone.
- **7.2 [GREEN]** implement pages/components; `begin_checkout` fired on pay click.
- **7.3 [VERIFY]** vitest + `npm run build`.

## 11. Phase 8: Flutterwave sandbox contract run (staging only)

- **8.1** `npm run test:flw` (tagged staging suite, real sandbox keys): successful card →
  Paid within seconds; failed → pending→abandoned; abandoned by timeout; webhook signature
  rejection. Assertions mirror AC-001–AC-003 (minus live email).
- **8.2 [VERIFY]** staging log shows NT-001/NT-002 enqueued < 60s after charge.

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run tests/checkout` green; coverage ≥ 85% on services + integration.
- [ ] Cross-file audit: `OrderStatus`/`PaymentStatus` enums, `LG-000000` format, endpoint
      paths identical to README §3 and sibling docs.
- [ ] No card data in `rawEvent` fixtures (grep `card` / `pan`); no client-trusted prices.
- [ ] Race suite run 50× (loop) with zero double-commit / zero lost holds.
- [ ] Error copy reviewed against §11 plain-language standard.
- [ ] UAT: AC-001, AC-002 (email within 60 s), AC-003 (30-min release), AC-005 recorded.
