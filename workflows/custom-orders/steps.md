# Business Logic & Endpoint Execution Steps: Custom Orders

All endpoints accept JSON. Errors per README §3.5. Owner routes via `requireRole("owner")`.

| Method | Path | Summary | Auth |
|---|---|---|---|
| POST | `/api/custom-requests` | Submit request (FR-030/031) | public |
| GET | `/api/admin/custom-requests` | Inbox list (AD-046) | owner |
| GET | `/api/admin/custom-requests/:id` | Detail + notes | owner |
| PATCH | `/api/admin/custom-requests/:id/status` | Status change | owner |
| POST | `/api/admin/custom-requests/:id/quote` | Quote + payment link | owner |

---

## Step 1 — `POST /api/custom-requests`

1. **Context:** public; rate limit 5/min/IP (429 `RATE_LIMITED`).
2. **Validation:** `CustomRequestInput` → 400 `VALIDATION_ERROR`; honeypot `_hp` non-empty →
   silently `201` with a dummy number (spam trap, no row written).
3. **Processing:** `requestNumber = nextNumber("custom_request")` (counter `$inc` →
   `CR-000123`).
4. **Persistence:** insert `custom_requests` doc (`status: "new"`); reference image already
   uploaded client-side via the public Cloudinary preset (publicId + url + fixed alt).
5. **Async:** enqueue both halves of NT-005 —
   `custom_request.submitted.customer` (acknowledgement with requestNumber + "we reply within
   48 hours") and `custom_request.submitted.owner` (alert with a summary + admin link).
6. **Response:** `201 { requestNumber, expectedResponseTime: "48 hours" }` (confirmation view
   per §7.3.2).

## Step 2 — `GET /api/admin/custom-requests`

1. `requireRole("owner")` → 403 for staff.
2. Optional `status` filter; `q` matches contact email/name or requestNumber; sort
   `createdAt: -1`.
3–5. Read-only. 6. `200 CustomRequestRow[]` (≤ 100 rows, newest first).

## Step 3 — `GET /api/admin/custom-requests/:id`

1. `requireRole("owner")`. 2. Resolve → 404.
3–5. Read-only; notes reverse-chron; linked orderNumber included when paid.
6. `200 CustomRequestDetail`.

## Step 4 — `PATCH /api/admin/custom-requests/:id/status`

1. `requireRole("owner")`.
2. `StatusUpdateInput` → 400.
3. **Matrix guard** (specs §3.5): e.g. `declined → quoted` → 409 `INVALID_TRANSITION`
   ("Declined requests can't be quoted."). `accepted` is normally system-set; manual set
   allowed for offline payments (note required).
4. Update status + append `notes[{ userId, userName, note, at }]` when a note is provided.
   **+log** `custom_request.status.<to>` `{ before, after }`.
5. **Async:** none (decline/complete need no email in MVP — NT table §10 stops at quoted).
6. `200 { id, status }`.

## Step 5 — `POST /api/admin/custom-requests/:id/quote`

1. `requireRole("owner")`.
2. `QuoteInput` → 422 `QUOTE_INVALID` when `amount < 1000`; 404 unknown.
3. **Pre-condition:** status ∈ `{new, quoted}` (re-quote allowed) else 409.
4. **Processing (external call):** `POST /v3/payments` Flutterwave —
   `tx_ref = requestNumber`, `amount = quoteAmount`, `currency: "NGN"`, customer contact,
   `redirect_url = APP_URL/custom-requests/thanks`, Ligera branding. On failure → 502
   `PAYMENT_LINK_FAILED`, **no state change**.
5. **Persistence:** set `quoteAmount`, `quotedAt`, `paymentLink { linkId, linkUrl, txRef,
   amount, status: "pending" }`, status → `quoted`; append the owner note.
   **+log** `custom_request.quote` `{ after: { amount } }`.
6. **Async:** enqueue `custom_request.quoted.customer` (NT-006) — quote summary, amount
   (delivery included or not), the payment link, and "48 hours to accept".
7. **Response:** `200 QuoteResult { requestNumber, quoteAmount, paymentLinkUrl,
   deliveryIncluded }`.

## Shared webhook branch — `handleCustomRequestPayment` (dispatched by `POST
/api/webhooks/flutterwave` when `tx_ref` starts with `CR-`)

1. Signature gate and payload validation happen once in the shared handler
   (checkout-payments steps Step 4.1–4.2).
2. Resolve `custom_requests` by `paymentLink.txRef = tx_ref` — unknown → `200 { ok: true }`
   (ack + ignore).
3. **Idempotency guard:** `findOneAndUpdate({ requestNumber: txRef, "paymentLink.status": {
   $ne: "successful" } }, ...)`.
4. **Re-verify** via `GET /v3/transactions/verify/:id` (never trust the payload);
   amount must equal `paymentLink.amount` and currency `NGN` — mismatch → enqueue
   `payment.mismatch.owner` (NT-008), no state change.
5. **Convert to a real order (exactly-once, guarded by `orderId: null`):**
   - create `orders` doc: `orderNumber = nextNumber("order")` (LG-…), `source:
     "custom_request"`, customer snapshot from request contact, one line item
     `{ name: "Custom order — <spaceOrSetting>", sku: requestNumber, unitPrice:
     quoteAmount, qty: 1 }`, `subtotal = total = quoteAmount`, `deliveryFee: 0` (or the
     owner-noted inclusion), `deliveryMethod: "delivery"` with placeholder address noted as
     bespoke, `status: "paid"`, `paymentStatus: "successful"` + initial timeline;
   - create `payments` doc `{ orderId, provider: "flutterwave", reference: requestNumber,
     linkId, amount, status: "successful", verifiedAt }`;
   - link `custom_requests.orderId` + status `accepted` + `paymentLink.status:
     "successful"`.
6. **Async:** enqueue `order.paid.customer` (NT-001 receipt for the bespoke order) and
   `order.paid.owner` (NT-002) — reusing the checkout notification payloads.
7. Return `200 { ok: true }` to Flutterwave (idempotent on duplicates).

---

## Frontend execution notes

- `/custom-orders/page.tsx` (server): short brand intro ("bespoke scents for your space"),
  expected response time, then the client form (`CustomRequestForm`): sections in PRD order —
  space/setting, product types (chips), scent preferences (textarea), quantity, budget range
  (select bands), event date (calendar), optional reference image (Cloudinary unsigned
  preset upload with preview + progress), contact; zod errors inline plain-language; success
  view with requestNumber.
- `/admin/custom-requests/page.tsx` (owner): inbox table with status chips (New badge count on
  the admin sidebar — feeds dashboard action list), filter tabs; detail drawer with quote
  composer (amount, delivery-included toggle, note), payment-link resend, notes thread,
  decline with reason, link to the generated order when paid.
