# Technical Specification: Order Lifecycle, Fulfillment & Refunds

Domain: **orders-fulfillment** — the 9-state order lifecycle after payment (admin status
actions with customer emails), order tracking, admin order list/detail with filters, the
"Verify payment" self-heal (AC-004), Failed & Abandoned view, printable packing slips, stock
restoration on cancellation, Flutterwave refunds, and CSV export.

Shared contract: `workflows/README.md` §3 (enums, transition matrix §3.3, stock semantics
§3.4). Collections `orders`/`payments`/`variants`/`stock_adjustments` are defined in
`checkout-payments/specs.md` §3 and `catalog/specs.md` §3; this domain defines the state
machine service and the admin read/act surface.

## 1. Executive Summary & Architecture Overview

An order is a **snapshotted, append-only-annotated document**: item prices/zone fee never
change post-creation (AC-007), while status moves append to `statusTimeline[]` (AD-041) through
one guarded, atomic transition function — `transitionOrder(orderId, to, { actor, note })` —
shared by every admin action so the matrix in README §3.3 is enforced in exactly one place.
Each successful transition optionally triggers `order.status.customer` email (AD-002/NT-003)
and always writes `activity_logs`. Cancellation of a paid order returns stock through the same
atomic `$inc` pattern as the paid commit, honoring the per-order `restoreStockOnCancel` toggle
(AD-031). Refunds call Flutterwave and flip both `paymentStatus` and `status` to `refunded`
with the customer informed of amount and timing (NT-004).

Staff can list, view, transition, cancel, and print orders (packing + fulfillment work) but see
no revenue aggregates and cannot refund/export — those stay owner-only (AC-009).

## 2. Feature Flowchart & Infrastructure Integration (Mermaid)

```mermaid
flowchart TD
    subgraph AdminUI["Admin portal /admin/orders"]
        LIST["Filterable list"]
        DET["Order detail: timeline, actions"]
        VP["Verify payment"]
        PS["Packing slip"]
        CSV["Export CSV"]
    end
    subgraph API
        TR["PATCH /api/admin/orders/:id/status"]
        CN["POST /api/admin/orders/:id/cancel"]
        RF["POST /api/admin/orders/:id/refund"]
        V["GET /api/admin/orders/:id/verify-payment"]
    end
    subgraph Core["transitionOrder() (single guarded path)"]
        GUARD{"status guard + matrix"}
        TL["$push statusTimeline[]"]
        MAIL["enqueue order.status.customer (NT-003)"]
        LOG["append activity_logs"]
    end
    subgraph Stores[("MongoDB")]
        O[("orders")]
        V2[("variants + stock_adjustments")]
        P[("payments")]
    end
    FLW["Flutterwave verify / refund API"]

    LIST --> DET --> TR --> GUARD
    GUARD -- ok --> TL --> MAIL --> LOG
    GUARD -- illegal --> E409["409 INVALID_TRANSITION"]
    CN -->|paid? restoreStockOnCancel| V2
    RF --> FLW --> P
    VP --> FLW -->|successful + amount matches| O
    DET --> PS
    LIST --> CSV
```

## 3. Order Status Transition Service

### 3.1 Transition matrix (normative — README §3.3)

| From | Allowed to | Guards & side effects |
|---|---|---|
| `pending_payment` | `paid` *(system only: webhook/verify)* · `abandoned` *(system only: expiry job)* · `cancelled` *(owner/staff)* | manual cancel releases holds (`heldQty −qty`), no stock return |
| `paid` | `processing` · `cancelled` | cancel restores stock when `restoreStockOnCancel` (AD-031) |
| `processing` | `ready_for_pickup` · `out_for_delivery` · `cancelled` | cancel restores stock |
| `ready_for_pickup` | `delivered` *(collected)* · `cancelled` | — |
| `out_for_delivery` | `delivered` · `cancelled` | — |
| `delivered` | *(terminal)* | — |
| `cancelled` | `refunded` *(owner)* | requires Flutterwave refund success |
| `refunded` | *(terminal)* | — |
| `abandoned` | *(terminal; verify-payment may re-key to `paid` via pending transition replay)* | — |

`POST /verify-payment` on an `abandoned` order whose hold already released: if Flutterwave
says the charge succeeded and amounts match, order flips `paid` via the checkout-payments paid
commit (stock committed fresh — may go negative-safe with clamped `$inc`, mismatch surfaced to
owner as oversold line warning).

### 3.2 transitionOrder (atomic, single implementation)

```typescript
// web/src/lib/services/orders/transition.ts
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "abandoned", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [], cancelled: ["refunded"], refunded: [], abandoned: [],
};

export async function transitionOrder(orderId, to: OrderStatus, actor: { userId; role },
  opts?: { note?: string; emailCustomer?: boolean }) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ALLOWED[to].length ? [fromOf(to)] : [] } }, // matrix guard
    { status: to, $push: { statusTimeline: { status: to, at: new Date(),
        byUserId: actor.userId, note: opts?.note ?? "" } } },
    { new: true },
  );
  // 409 INVALID_TRANSITION when null (illegal from→to or concurrent move)
  if (opts?.emailCustomer !== false) await enqueueNotification("order.status.customer",
    { orderId: order._id });       // NT-003 — deduped once per (order, status)
  await logActivity(actor.userId, `order.status.${to}`, { type: "order", id: orderId },
    { before: previousStatus, after: to });
  return order;
}
```

### 3.3 Stock restoration on cancel (AD-031)

For `cancelled` from `paid|processing|ready_for_pickup|out_for_delivery` **and**
`order.restoreStockOnCancel === true`: per item `Variant.findOneAndUpdate({ _id },
{ $inc: { stockQty: +qty } })` + `stock_adjustments` (`order_cancelled`, actor) + low-stock
recheck (NT-007). Pending cancels release `heldQty` instead (checkout §3.6). The toggle is
per-order and owner-settable from the order detail.

### 3.4 Indexing strategy (this domain's queries)

| Index (on `orders`) | Query |
|---|---|
| `{ status: 1, createdAt: -1 }` | admin list status filter (AD-040) |
| `{ paymentStatus: 1, createdAt: -1 }` | failed/abandoned view (AD-043) |
| `{ deliveryZoneId: 1 }` | zone filter (AD-040) |
| `{ createdAt: -1 }` | date-range filter + default sort |
| text scan on `orderNumber`/`customer.name`/`customer.phone` (exact-prefix regex, indexed by `{ "customer.phone": 1 }`) | search (AD-040) |

### 3.5 Packing slip (AD-044)

Server-rendered print HTML (`GET .../packing-slip`, `Content-Type: text/html`) at A5 print CSS:
logo, order number, date, customer + address/zone (or pickup), item table
(name — label, sku, qty), gift note printed when present, **prices hidden when
`order.hidePrices`** (FR-019), "Fragile — gypsum" handling banner for gypsum-category lines
(PRD §5 note). `window.print()` triggered client-side; no PII beyond the ship-to label.

### 3.6 Verify payment (AC-004, AD-043)

`GET /api/admin/orders/:id/verify-payment` (owner/staff):
1. Load order + payment; short-circuit if already `paid`.
2. If `payment.linkId` known → `GET /v3/transactions/verify/:linkId` (or lookup by `tx_ref`
   filter) via `integrations/flutterwave.ts`.
3. `successful` + amount/currency match → run the **checkout-payments paid-commit function**
   (single shared implementation — no duplicate logic) → order self-corrects to `paid`.
4. `successful` + mismatch → enqueue `payment.mismatch.owner` (NT-008).
5. `failed`/not found → return latest known state with a plain-language explanation.

### 3.7 Security & authorization rules

| Operation | Role |
|---|---|
| List/detail/status/cancel/packing-slip/verify-payment | owner **or staff** |
| Refund, CSV export, `restoreStockOnCancel` toggle | **owner** |

Staff-facing payloads redact nothing structural (order totals are needed for fulfillment) but
**revenue aggregates and exports remain owner-only** (AC-009 interpretation: staff see
individual order amounts required to do their job; dashboard revenue/AOV is the protected
figure). All mutations append `activity_logs`.

## 4. API Architecture & Contracts Summary

Guards: `staff` for list/detail/act/print/verify; `owner` for refund/export. Full contract in
`api-contract.md`.

| Method | Path | Summary |
|---|---|---|
| GET | `/api/admin/orders` | Filterable list + search (AD-040) |
| GET | `/api/admin/orders/:id` | Detail with timeline + internal notes (AD-041) |
| PATCH | `/api/admin/orders/:id/status` | Status transition (AD-042) |
| POST | `/api/admin/orders/:id/cancel` | Cancel with stock rules (AD-031) |
| POST | `/api/admin/orders/:id/refund` | Flutterwave refund (owner) |
| GET | `/api/admin/orders/:id/verify-payment` | Re-check payment (AC-004) |
| GET | `/api/admin/orders/:id/packing-slip` | Printable HTML (AD-044) |
| GET | `/api/admin/orders/export.csv` | Accounting CSV (AD-045) |

## 5. Verification & Testing Strategy

- Unit: matrix table exhaustively (every legal + illegal pair), email dedupe keys.
- Integration: transition guards under concurrency (two simultaneous PATCHes → one wins);
  cancel restores stock exactly once; refund flow with mocked Flutterwave; verify-payment
  heal path on an `abandoned`-then-charge-later fixture; CSV columns; staff 403s on refund.
- E2E manual: owner daily routine §7.4 (paid → processing → packing slip → out for delivery →
  delivered with NT-003 at each step).
