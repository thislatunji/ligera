# API Contract & Schema Specification: Orders & Fulfillment

Shared conventions: `workflows/README.md` §3.5. Guards: `staff` (owner or staff) / `owner`.

## 1. Global Overview

- **Path prefix:** `/api/admin/orders`. **Auth:** `ligera_at` cookie.
- **IDs:** route params accept either the order `id` (ObjectId) or its `orderNumber`
  (`LG-000123`) — both resolve to the same document.
- **CSV:** `text/csv` attachment. **Packing slip:** `text/html` (print stylesheet).

## 2. Endpoints Matrix

| Method | Path | Summary | Auth | Request | Success |
|---|---|---|---|---|---|
| GET | `/api/admin/orders` | List + filters + search | staff | `AdminOrderQuery` | 200 `{ data: AdminOrderListRow[], meta }` |
| GET | `/api/admin/orders/:id` | Order detail | staff | — | 200 `AdminOrderDetail` |
| PATCH | `/api/admin/orders/:id/status` | Transition status | staff | `{ status, note?, emailCustomer? }` | 200 `{ id, status, statusTimeline[] }` |
| POST | `/api/admin/orders/:id/cancel` | Cancel (stock rules) | staff | `{ reason, restoreStock? }` | 200 `{ id, status: "cancelled", restoredStock: boolean }` |
| POST | `/api/admin/orders/:id/refund` | Refund via Flutterwave | owner | `{ amount?, note? }` | 200 `{ id, status: "refunded", refundAmount }` |
| GET | `/api/admin/orders/:id/verify-payment` | Re-check with Flutterwave | staff | — | 200 `VerifyPaymentResult` |
| GET | `/api/admin/orders/:id/packing-slip` | Printable HTML | staff | — | 200 `text/html` |
| GET | `/api/admin/orders/export.csv` | Accounting CSV | owner | `ExportQuery` | 200 `text/csv` |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Unknown order | 404 | `NOT_FOUND` | `{ error: "Order not found." }` |
| Illegal transition | 409 | `INVALID_TRANSITION` | `{ error: "You can't move a delivered order back to processing." , from, to }` |
| Refund of unpaid order | 409 | `NOT_PAID` | `{ error: "Only paid orders can be refunded." }` |
| Flutterwave refund failure | 502 | `REFUND_FAILED` | `{ error: "Flutterwave could not process the refund. Try again shortly." }` |
| Staff on owner route | 403 | `AUTH_FORBIDDEN` | `{ error: "Only the owner can refund orders." }` |
| Refund exceeded amount | 422 | `REFUND_EXCEEDED` | `{ error: "Refund can't be more than the order total." }` |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod in `web/src/lib/api/schemas/orders.ts`.

### 4.1 Client Request DTOs

```typescript
export const AdminOrderQuery = z.object({
  status: z.enum(["pending_payment","paid","processing","ready_for_pickup","out_for_delivery",
                  "delivered","cancelled","refunded","abandoned"]).optional(),
  paymentStatus: z.enum(["pending","successful","failed","refunded"]).optional(),
  zoneId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  q: z.string().trim().max(60).optional(),     // orderNumber | name | phone
  view: z.enum(["actionable","failed_abandoned","all"]).optional(), // AD-043
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const StatusUpdate = z.object({
  status: z.enum(["processing","ready_for_pickup","out_for_delivery","delivered",
                  "cancelled","refunded"]),
  note: z.string().max(300).optional(),
  emailCustomer: z.boolean().default(true),   // AD-042 "can email"
});

export const CancelInput = z.object({
  reason: z.string().trim().min(3).max(300),
  restoreStock: z.boolean().optional(),        // overrides order.restoreStockOnCancel once
});

export const RefundInput = z.object({
  amount: z.number().int().positive().optional(),  // default: full order.total
  note: z.string().max(300).optional(),
});

export const ExportQuery = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: z.enum(["pending_payment","paid","processing","ready_for_pickup","out_for_delivery",
                  "delivered","cancelled","refunded","abandoned"]).optional(),
});
```

### 4.2 Response DTOs

```typescript
export interface AdminOrderListRow {
  id: string; orderNumber: string;
  customer: { name: string; email: string; phone: string };
  status: "pending_payment"|"paid"|"processing"|"ready_for_pickup"|"out_for_delivery"|
          "delivered"|"cancelled"|"refunded"|"abandoned";
  paymentStatus: "pending"|"successful"|"failed"|"refunded";
  deliveryZoneName?: string; deliveryMethod: "delivery"|"pickup";
  itemCount: number; total: number;
  placedAt: string; updatedAt: string;
  giftOrder: boolean;                          // giftNote or hidePrices set
  needsAction: boolean;                        // paid & not yet processing
}

export interface AdminOrderDetail extends AdminOrderListRow {
  items: { name: string; sku: string; label: string; unitPrice: number; qty: number;
    imageUrl: string }[];
  subtotal: number; deliveryFee: number; discount: number; total: number;
  deliveryAddress?: { address: string; city: string; state: string };
  giftNote?: string; hidePrices: boolean;
  payment: { reference: string; linkUrl?: string; amount: number;
    status: "pending"|"successful"|"failed"|"refunded"; verifiedAt?: string };
  statusTimeline: { status: string; at: string; byUserName?: string; note?: string }[];
  internalNotes: { id: string; userId: string; userName: string; note: string; at: string }[];
  restoreStockOnCancel: boolean;
  source: "storefront"|"custom_request";
  expectedDeliveryWindow: string;
}

export interface VerifyPaymentResult {
  checked: true;
  outcome: "already_paid" | "paid_now" | "successful_pending_apply" | "not_found"
         | "failed" | "amount_mismatch";
  orderStatus: string;
  message: string;   // plain-language owner-facing summary
}
```

### 4.3 Internal service DTO

```typescript
export interface ActorContext { userId: string; role: "owner" | "staff"; }
// transitionOrder(orderId, to, actor, { note, emailCustomer }) — specs §3.2
```

## 5. OpenAPI 3.0 Specification (orders slice)

```yaml
openapi: 3.0.3
info: { title: Ligera Orders Admin API, version: 1.0.0 }
servers: [{ url: https://app.ligera.ng }, { url: http://localhost:3000 }]
paths:
  /api/admin/orders:
    get:
      summary: Filterable order list
      security: [{ cookieAuth: [] }]
      parameters:
        - { in: query, name: status, schema: { type: string } }
        - { in: query, name: paymentStatus, schema: { type: string } }
        - { in: query, name: zoneId, schema: { type: string } }
        - { in: query, name: dateFrom, schema: { type: string, format: date } }
        - { in: query, name: dateTo, schema: { type: string, format: date } }
        - { in: query, name: q, schema: { type: string } }
        - in: query
          name: view
          schema: { type: string, enum: [actionable, failed_abandoned, all] }
        - { in: query, name: page, schema: { type: integer } }
        - { in: query, name: limit, schema: { type: integer } }
      responses:
        "200":
          description: Order rows
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { $ref: "#/components/schemas/AdminOrderListRow" } }
                  meta: { type: object }
        "401": { $ref: "#/components/responses/Error" }
  /api/admin/orders/{id}:
    get:
      summary: Order detail
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      responses:
        "200":
          description: Detail
          content:
            application/json:
              schema: { $ref: "#/components/schemas/AdminOrderDetail" }
        "404": { $ref: "#/components/responses/Error" }
  /api/admin/orders/{id}/status:
    patch:
      summary: Transition status
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [processing, ready_for_pickup, out_for_delivery, delivered, cancelled, refunded] }
                note: { type: string }
                emailCustomer: { type: boolean, default: true }
      responses:
        "200": { description: Updated }
        "409": { $ref: "#/components/responses/Error" }
  /api/admin/orders/{id}/cancel:
    post:
      summary: Cancel order with stock rules
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reason]
              properties:
                reason: { type: string, minLength: 3 }
                restoreStock: { type: boolean }
      responses:
        "200": { description: Cancelled }
        "409": { $ref: "#/components/responses/Error" }
  /api/admin/orders/{id}/refund:
    post:
      summary: Refund via Flutterwave (owner)
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                amount: { type: integer }
                note: { type: string }
      responses:
        "200": { description: Refunded }
        "403": { $ref: "#/components/responses/Error" }
        "502": { $ref: "#/components/responses/Error" }
  /api/admin/orders/{id}/verify-payment:
    get:
      summary: Re-check payment with Flutterwave
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      responses:
        "200":
          description: Verification outcome
          content:
            application/json:
              schema:
                type: object
                properties:
                  checked: { type: boolean }
                  outcome: { type: string }
                  message: { type: string }
  /api/admin/orders/{id}/packing-slip:
    get:
      summary: Printable packing slip HTML
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      responses:
        "200": { description: text/html print document }
  /api/admin/orders/export.csv:
    get:
      summary: Orders CSV export (owner)
      security: [{ cookieAuth: [] }]
      responses:
        "200": { description: text/csv attachment }
        "403": { $ref: "#/components/responses/Error" }
components:
  securitySchemes: { cookieAuth: { type: apiKey, in: cookie, name: ligera_at } }
  responses:
    Error:
      description: Error envelope
      content:
        application/json:
          schema:
            type: object
            properties: { error: { type: string }, code: { type: string } }
  schemas:
    AdminOrderListRow:
      type: object
      properties:
        id: { type: string }
        orderNumber: { type: string }
        customer: { type: object }
        status: { type: string }
        paymentStatus: { type: string }
        total: { type: integer }
        placedAt: { type: string, format: date-time }
    AdminOrderDetail:
      allOf:
        - $ref: "#/components/schemas/AdminOrderListRow"
        - type: object
          properties:
            items: { type: array, items: { type: object } }
            statusTimeline: { type: array, items: { type: object } }
            payment: { type: object }
            giftNote: { type: string }
            hidePrices: { type: boolean }
```
