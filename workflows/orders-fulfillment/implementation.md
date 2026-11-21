# Step-by-Step TDD Implementation Plan: Orders & Fulfillment

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run tests/orders`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server; `integrations/flutterwave.ts` mocked.
- **Fixtures:** `seedOrders()` builds orders in every state of the 9-state machine, one paid
  order with `hidePrices` + gift note, one pending_payment with live hold, one abandoned.
- **Coverage:** ≥ 85% on `lib/services/orders/**` (state machine is business-critical).

## 2. Target File Structure

```text
web/src/
├── app/admin/orders/
│   ├── page.tsx                    # filterable list + quick views
│   └── [id]/page.tsx               # detail + actions
├── app/api/admin/orders/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── [id]/status/route.ts
│   ├── [id]/cancel/route.ts
│   ├── [id]/refund/route.ts
│   ├── [id]/verify-payment/route.ts
│   ├── [id]/packing-slip/route.ts
│   └── export.csv/route.ts
├── lib/services/orders/
│   ├── transition.ts               # the single guarded state machine
│   ├── list.ts  detail.ts  cancel.ts  refund.ts
│   ├── verify-payment.ts           # reuses checkout paid-commit
│   ├── packing-slip.tsx            # render-to-string print doc
│   └── export-csv.ts
├── lib/api/schemas/orders.ts  lib/api/types/orders.ts
└── tests/orders/*.test.ts
```

## 3. Phase 0: Module Foundation

- **0.1 [VERIFY]** `transition.ts` skeleton compiles; seed fixtures load; matrix table
  exported from a single source (imported by API, UI and tests — no duplication).

## 4. Phase 1: transitionOrder service (AD-042)

- **1.1 [RED]** exhaustive matrix tests: **every** legal pair from README §3.3 succeeds
  (appends timeline, returns new doc); **every** illegal pair → 409
  `INVALID_TRANSITION` (e.g. `delivered → processing`, `refunded → cancelled`,
  `pending_payment → delivered`); system-only states (`paid`, `abandoned`) rejected from the
  manual endpoint; concurrent double-PATCH → exactly one succeeds, other 409; `emailCustomer:
  false` suppresses enqueue; `+log` row written per success.
- **1.2 [GREEN]** implement `transition.ts` (guarded `findOneAndUpdate`).
- **1.3 [VERIFY]** PASS.

## 5. Phase 2: list + detail endpoints (AD-040/041)

- **2.1 [RED]** filters (status, paymentStatus, zone, dateFrom/To); `q` matches orderNumber,
  name or phone; `view=actionable` → only `paid`; `view=failed_abandoned` → abandoned +
  pending/failed payments; pagination meta; timeline enriched with actor names; `giftOrder`
  and `needsAction` flags.
- **2.2 [RED]** route tests (query parsing, 400s, auth 401).
- **2.3 [GREEN]** `services/orders/list.ts` + `detail.ts` + routes.
- **2.4 [VERIFY]** PASS.

## 6. Phase 3: cancel + stock rules (AD-031)

- **3.1 [RED]** pending cancel releases `heldQty` (available restored, stockQty untouched);
  paid cancel with restore → `stockQty +qty` + `stock_adjustments` `order_cancelled`;
  restore off (toggle or override) → stock untouched; reason mandatory; NT-004 enqueued;
  illegal-state cancel → 409.
- **3.2–3.4]** route tests → `cancel.ts` → VERIFY.

## 7. Phase 4: refund (**owner**) (NT-004)

- **4.1 [RED]** owner-only (staff 403 `AUTH_FORBIDDEN`); unpaid → 409 `NOT_PAID`; amount
  default full, over-total → 422; Flutterwave mock success → `payments.status: "refunded"` +
  order `refunded` + NT-004 with amount/timing; mock failure → 502 with no state change.
- **4.2–4.4]** routes → `refund.ts` → VERIFY.

## 8. Phase 5: verify-payment (AC-004)

- **5.1 [RED]** already-paid short circuit; abandoned order + late charge → flips to `paid`
  via shared commit (stock committed, NT-001/002 enqueued once); amount mismatch → NT-008
  enqueued, no state change; not-found/failed outcomes reported with owner-readable message;
  pending order with successful charge → heals to paid (AC-004 exact scenario).
- **5.2–5.4]** route tests → `verify-payment.ts` (imports checkout paid-commit) → VERIFY.

## 9. Phase 6: packing slip (AD-044)

- **9.1 [RED]** HTML contains order number/items/qty; **prices absent when `hidePrices`**;
  gift note rendered when present; fragile banner for gypsum lines; A5 print CSS present;
  no-store header.
- **9.2–9.4]** tests → `packing-slip.tsx` render-to-string → VERIFY.

## 10. Phase 7: CSV export (**owner**)

- **10.1 [RED]** columns match Step 8 list; date/status filters applied; staff → 403;
  attachment header; `+log` recorded.
- **10.2–10.4]** tests → `export-csv.ts` → VERIFY.

## 11. Phase 8: Admin UI (§14, AC-009)

- **8.1 [RED]** component tests:
  - list: filters reflect URL state; quick-view tabs; search box debounced.
  - detail: only legal next-status buttons enabled (matrix-driven); email checkbox default
    on; timeline renders entries with actor names; verify-payment button on pending payment;
    refund hidden for staff (AC-009); restore-stock toggle owner-only.
  - packing-slip button opens new print tab (mock `window.open`).
- **8.2 [GREEN]** pages + `components/admin/orders/*` (Watermelon UI `CountUpStat` for
  headline counts, table blocks for rows).
- **8.3 [VERIFY]** PASS + `npm run build`.

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run tests/orders` green; coverage ≥ 85% on services.
- [ ] Matrix table imported from one module everywhere (UI + API + tests).
- [ ] Cross-file audit: enums/status names/orderNumber format identical to README §3; NT
      event names (`order.status.customer`, `order.cancelled.customer`,
      `payment.mismatch.owner`) match notifications domain.
- [ ] Manual §7.4 run-through: paid → processing (NT-003) → packing slip print → out for
      delivery (NT-003 with delivery contact) → delivered (NT-003).
- [ ] AC-004 demo recorded: charged-but-unpaid order heals via button.
- [ ] No PII in logs; CSV export contains only accounting fields.
