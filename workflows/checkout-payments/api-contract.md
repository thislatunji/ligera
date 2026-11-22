# API Contract & Schema Specification: Checkout & Payments

Shared conventions: `workflows/README.md` §3.5. All endpoints in this domain are **public**
(guest checkout FR-011) except where noted.

## 1. Global Overview

- **Money:** integer Naira. **tx_ref:** equals `orderNumber` (`LG-000123`).
- **Flutterwave env:** `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH` (webhook
  `verif-hash`), `APP_URL` (redirect base).
- **Rate limits:** `POST /api/checkout/orders` 10/min/IP; `GET /api/checkout/orders/:orderNumber/status` 60/min/IP; `GET /api/checkout/orders/:orderNumber/verify-status` 30/min/IP; `POST /api/orders/lookup` 20/min/IP.

## 2. Endpoints Matrix

| Method | Path | Summary | Auth | Request | Success |
|---|---|---|---|---|---|
| GET | `/api/delivery-zones` | Active zones (name, fee, etaText) | public | — | 200 `DeliveryZone[]` |
| POST | `/api/checkout/quote` | Live-priced cart summary; no hold | public | `QuoteRequest` | 200 `QuoteSummary` |
| POST | `/api/checkout/orders` | Create order, reserve stock, return payment link | public | `CheckoutRequest` | 201 `CheckoutResult` |
| GET | `/api/checkout/orders/:orderNumber/status` | Public no-PII payment/order status poll | public | — | 200 `PublicOrderPaymentView` |
| GET | `/api/checkout/orders/:orderNumber/verify-status` | Public active Flutterwave verification + status | public | `?transaction_id=` (opt) | 200 `PublicOrderPaymentView` |
| POST | `/api/webhooks/flutterwave` | Signed payment notification | public (signature) | `FlutterwaveWebhook` | 200 `{ ok: true }` |
| POST | `/api/orders/lookup` | Order status for confirmation/track | public | `OrderLookupRequest` | 200 `OrderStatusView` |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Invalid checkout fields | 400 | `VALIDATION_ERROR` | zod `details` |
| Cart item not purchasable (inactive/unpublished) | 409 | `ITEM_UNAVAILABLE` | `{ error: "…is no longer available.", items: [...] }` |
| Insufficient stock (some lines) | 409 | `STOCK_SOLD_OUT` | `{ error: "…just sold out. Please remove it to continue.", items: [{ slug, name }] }` |
| Zone inactive/unknown | 422 | `ZONE_INVALID` | `{ error: "Choose a delivery zone." }` |
| Webhook signature mismatch | 401 | `WEBHOOK_INVALID` | `{ error: "Invalid signature." }` |
| Webhook amount/currency mismatch | 200 | — | processed as NT-008 owner alert; 200 to avoid Flutterwave retries |
| Lookup: order not found or contact mismatch | 404 | `NOT_FOUND` | `{ error: "We couldn't find an order with those details." }` |
| Payment link creation failed (Flutterwave 5xx) | 502 | `PAYMENT_LINK_FAILED` | `{ error: "We couldn't start your payment. Please try again." }` |
| Rate limited | 429 | `RATE_LIMITED` | `{ error: "Too many attempts. Please wait a moment." }` |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod in `web/src/lib/api/schemas/checkout.ts`.

### 4.1 Client Request DTOs

```typescript
export const CartLineInput = z.object({
  variantId: z.string(),
  qty: z.number().int().min(1).max(99),
});

export const QuoteRequest = z.object({
  items: z.array(CartLineInput).min(1).max(50),
  zoneId: z.string().optional(),
  deliveryMethod: z.enum(["delivery", "pickup"]).default("delivery"),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const CheckoutRequest = z.object({
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().regex(/^(\+?234|0)\d{9,10}$/, "Enter a valid Nigerian phone number."),
  }),
  address: z.object({
    address: z.string().trim().min(4).max(300),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(2).max(50),   // Nigerian state
  }).optional(),                               // required when deliveryMethod = delivery
  zoneId: z.string().optional(),
  deliveryMethod: z.enum(["delivery", "pickup"]).default("delivery"),
  giftNote: z.string().trim().max(500).default(""),
  hidePrices: z.boolean().default(false),     // FR-019
  marketingConsent: z.boolean().default(false),
  items: z.array(CartLineInput).min(1).max(50),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const OrderLookupRequest = z.object({
  orderNumber: z.string().trim().regex(/^LG-\d{6}$/),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
}).refine((v) => v.email || v.phone, "Provide the email or phone used at checkout.");

export const FlutterwaveWebhook = z.object({
  event: z.string(),                            // "charge.completed" etc.
  data: z.object({
    id: z.number(),
    tx_ref: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),                         // "successful" | "failed" | ...
    created_at: z.string().optional(),
  }).passthrough(),                             // card fields stripped before persist
});
```

### 4.2 Response DTOs

```typescript
export interface QuoteSummary {
  items: { variantId: string; productId: string; slug: string; name: string; label: string;
    unitPrice: number; qty: number; lineTotal: number; available: number; soldOut: boolean }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryGap?: number;                    // amount left to free delivery
  expectedDeliveryWindow?: string;
}

export interface CheckoutResult {
  orderNumber: string;                         // LG-000123
  total: number;
  paymentUrl: string;                          // Flutterwave hosted link
  holdExpiresAt: string;                       // ISO — cart/checkout countdown
  expectedDeliveryWindow: string;
}

export interface OrderStatusView {             // FR-017 confirmation + FR-018 track
  orderNumber: string;
  status: "pending_payment" | "paid" | "processing" | "ready_for_pickup" |
          "out_for_delivery" | "delivered" | "cancelled" | "refunded" | "abandoned";
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  items: { name: string; qty: number; unitPrice: number }[];
  subtotal: number; deliveryFee: number; total: number;
  expectedDeliveryWindow: string;
  placedAt: string;                            // ISO, WAT displayed
  giftNote?: string;
}

export interface PublicOrderPaymentView {      // Public guest callback view (strictly no PII)
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryMethod: "delivery" | "pickup";
  deliveryZoneName: string;
  items: { name: string; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  expectedDeliveryWindow: string;
  placedAt: string;
  paidAt: string | null;
  paymentUrl: string | null;                   // Returned only while status === "pending_payment"
}
```

### 4.3 Webhook internal DTO (server-injected metadata)

```typescript
export interface VerifiedPayment {             // result of signature + API re-verify
  orderId: string;
  orderNumber: string;
  flwTransactionId: number;
  txRef: string;
  amount: number; currency: string;
  status: "successful" | "failed" | "abandoned";
  rawSummary: Record<string, unknown>;         // card/pan fields stripped
  processedAt: Date;                           // server clock
}
```

## 5. OpenAPI 3.0 Specification (checkout slice)

```yaml
openapi: 3.0.3
info: { title: Ligera Checkout API, version: 1.0.0 }
servers: [{ url: https://app.ligera.ng }, { url: http://localhost:3000 }]
paths:
  /api/delivery-zones:
    get:
      summary: Active delivery zones
      responses:
        "200":
          description: Zones
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: string }
                    name: { type: string }
                    fee: { type: integer, description: Naira }
                    etaText: { type: string }
  /api/checkout/quote:
    post:
      summary: Live-priced cart summary (no stock hold)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [items]
              properties:
                items:
                  type: array
                  items:
                    type: object
                    required: [variantId, qty]
                    properties:
                      variantId: { type: string }
                      qty: { type: integer, minimum: 1, maximum: 99 }
                zoneId: { type: string }
                deliveryMethod: { type: string, enum: [delivery, pickup], default: delivery }
      responses:
        "200":
          description: Quote
          content:
            application/json:
              schema:
                type: object
                properties:
                  subtotal: { type: integer }
                  deliveryFee: { type: integer }
                  total: { type: integer }
                  items: { type: array, items: { type: object } }
        "409": { $ref: "#/components/responses/Error" }
  /api/checkout/orders:
    post:
      summary: Place guest order with stock hold and payment link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [contact, items]
              properties:
                contact:
                  type: object
                  required: [name, email, phone]
                  properties:
                    name: { type: string }
                    email: { type: string, format: email }
                    phone: { type: string, pattern: '^\+?234\d{9,10}$' }
                address: { type: object }
                zoneId: { type: string }
                deliveryMethod: { type: string, enum: [delivery, pickup] }
                giftNote: { type: string, maxLength: 500 }
                hidePrices: { type: boolean }
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      variantId: { type: string }
                      qty: { type: integer }
      responses:
        "201":
          description: Order created
          content:
            application/json:
              schema:
                type: object
                properties:
                  orderNumber: { type: string, example: LG-000123 }
                  total: { type: integer }
                  paymentUrl: { type: string }
                  holdExpiresAt: { type: string, format: date-time }
                  expectedDeliveryWindow: { type: string }
        "409": { $ref: "#/components/responses/Error" }
        "422": { $ref: "#/components/responses/Error" }
        "502": { $ref: "#/components/responses/Error" }
  /api/checkout/orders/{orderNumber}/status:
    get:
      summary: Public no-PII order payment status for confirmation polling
      parameters:
        - in: path
          name: orderNumber
          required: true
          schema: { type: string, pattern: '^LG-\d{6}$' }
      responses:
        "200":
          description: PublicOrderPaymentView (no customer PII)
          content:
            application/json:
              schema: { type: object }
        "400": { $ref: "#/components/responses/Error" }
        "404": { $ref: "#/components/responses/Error" }
        "429": { $ref: "#/components/responses/Error" }
  /api/checkout/orders/{orderNumber}/verify-status:
    get:
      summary: Actively verify Flutterwave payment server-side for guest callback page
      parameters:
        - in: path
          name: orderNumber
          required: true
          schema: { type: string, pattern: '^LG-\d{6}$' }
        - in: query
          name: transaction_id
          required: false
          schema: { type: string }
      responses:
        "200":
          description: PublicOrderPaymentView (no customer PII)
          content:
            application/json:
              schema: { type: object }
        "400": { $ref: "#/components/responses/Error" }
        "404": { $ref: "#/components/responses/Error" }
        "429": { $ref: "#/components/responses/Error" }
  /api/webhooks/flutterwave:
    post:
      summary: Flutterwave payment notification (verif-hash gated)
      parameters:
        - in: header
          name: verif-hash
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                event: { type: string, example: charge.completed }
                data:
                  type: object
                  properties:
                    id: { type: integer }
                    tx_ref: { type: string }
                    amount: { type: number }
                    currency: { type: string }
                    status: { type: string }
      responses:
        "200": { description: Accepted (idempotent) }
        "401": { $ref: "#/components/responses/Error" }
  /api/orders/lookup:
    post:
      summary: Order status by orderNumber + email or phone
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [orderNumber]
              properties:
                orderNumber: { type: string, pattern: '^LG-\d{6}$' }
                email: { type: string, format: email }
                phone: { type: string }
      responses:
        "200":
          description: Order status view
          content:
            application/json:
              schema: { type: object }
        "404": { $ref: "#/components/responses/Error" }
components:
  responses:
    Error:
      description: Error envelope
      content:
        application/json:
          schema:
            type: object
            properties:
              error: { type: string }
              code: { type: string }
              items: { type: array, items: { type: object } }
```
