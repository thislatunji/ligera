# Step-by-Step TDD Implementation Plan: Custom Orders

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run tests/custom-orders`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server; Flutterwave mocked
  (`vi.mock("@/lib/integrations/flutterwave")`); `enqueueNotification` mocked with call
  assertions.
- **Coverage:** ≥ 80% on `lib/services/custom-requests/**`.

## 2. Target File Structure

```text
web/src/
├── app/
│   ├── custom-orders/page.tsx
│   ├── custom-requests/thanks/page.tsx       # post-quote redirect landing
│   └── api/
│       ├── custom-requests/route.ts           # public POST
│       └── admin/custom-requests/
│           ├── route.ts
│           ├── [id]/route.ts
│           ├── [id]/status/route.ts
│           └── [id]/quote/route.ts
├── lib/services/custom-requests/
│   ├── submit.ts
│   ├── inbox.ts
│   ├── status.ts
│   ├── quote.ts
│   └── payment-branch.ts                     # handleCustomRequestPayment (webhook CR-)
├── lib/api/schemas/custom-requests.ts  lib/api/types/custom-requests.ts
├── components/{CustomRequestForm.tsx, ReferenceImageUploader.tsx}
├── components/admin/{CustomRequestInbox.tsx, QuoteComposer.tsx}
└── tests/custom-orders/*.test.ts
web/scripts/migrations/20261110000004-custom-requests.ts
```

## 3. Phase 0: Module Foundation & Schema Setup

- **0.1 [VERIFY]** migration creates `custom_requests` + indexes; re-run is a no-op.
- **0.2** Cloudinary unsigned preset `ligera_custom_requests` documented in
  `.env.example` notes (image-only, ≤ 5MB, folder `ligera/custom-requests`).

## 4. Phase 1: `POST /api/custom-requests` (FR-030, FR-031, NT-005)

- **1.1 [RED]** `submit.test.ts`:
  - valid payload → 201, `requestNumber` matches `CR-\d{6}`, counters increment;
  - NT-005 pair enqueued (`custom_request.submitted.customer` **and**
    `custom_request.submitted.owner`) with the right recipients;
  - honeypot filled → 201 dummy, zero docs written;
  - Nigerian phone regex + required fields → 400 with field-level issues;
  - rate limit → 429 on the 6th call within a minute.
- **1.2 [RED]** route test: parsing + delegation.
- **1.3 [GREEN]** `services/custom-requests/submit.ts` + route.
- **1.4 [VERIFY]** PASS.

## 5. Phase 2: inbox + detail (**owner**)

- **2.1 [RED]** status filter tabs; `q` by email/name/requestNumber; newest-first; staff
  token → 403 `AUTH_FORBIDDEN`; notes threaded reverse-chron; linked orderNumber surfaced
  once paid.
- **2.2–2.4]** route tests → `inbox.ts` → VERIFY.

## 6. Phase 3: status transitions

- **3.1 [RED]** legal moves succeed (+ note appended + `+log`); `declined → quoted` → 409
  `INVALID_TRANSITION`; manual `accepted` requires note; `completed` terminal.
- **3.2–3.4]** tests → `status.ts` → VERIFY.

## 7. Phase 4: quote + payment link (AD-046, NT-006)

- **4.1 [RED]** `quote.test.ts`:
  - amount < 1000 → 422; unknown id → 404; non-new/quoted status → 409;
  - success: `paymentLink` persisted (`txRef = requestNumber`), status `quoted`, NT-006
    enqueued with `paymentLinkUrl` in payload, `+log` written;
  - Flutterwave failure → 502, no partial state;
  - re-quote generates a fresh link and re-enqueues NT-006.
- **4.2–4.4]** route tests → `quote.ts` → VERIFY.

## 8. Phase 5: webhook CR- branch (AC-010 tail)

- **5.1 [RED]** `payment-branch.test.ts` (invoked through the shared webhook handler):
  - unknown tx_ref → ack, nothing;
  - successful + amount match → request `accepted`, `paymentLink.status: "successful"`,
    **order created**: `LG-` number, `source: "custom_request"`, single line snapshot
    (name "Custom order — …", unitPrice = quoteAmount), `status: "paid"`,
    `paymentStatus: "successful"`, linked `orderId` + NT-001/NT-002 enqueued once;
  - duplicate webhook → no second order, no second email;
  - amount mismatch → NT-008 enqueued, no order created;
  - `failed` status → `paymentLink.status: "failed"`, request stays `quoted` (owner can
    re-quote).
- **5.2 [GREEN]** `payment-branch.ts` wired into the shared webhook dispatcher
  (`checkout-payments` `payment-webhook.ts` imports and routes by prefix).
- **5.3 [VERIFY]** run both `tests/checkout` and `tests/custom-orders` (dispatcher regression).

## 9. Phase 6: Frontend — form + inbox

- **6.1 [RED]** component tests:
  - `CustomRequestForm`: field order per PRD; zod issues inline; image upload renders
    preview + alt label; submit → success view with requestNumber; honeypot hidden.
  - `CustomRequestInbox`: tabs filter; New count badge; `QuoteComposer` enforces amount ≥
    ₦1,000 and delivery-included toggle; link resend disabled while `pending`; notes thread
    posts.
- **6.2 [GREEN]** pages + components (Watermelon UI `RevealOnScroll` intro, chips for product
  types).
- **6.3 [VERIFY]** vitest + `npm run build`; mobile form usable one-handed (390px check).

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run tests/custom-orders` green; coverage ≥ 80%.
- [ ] Cross-file audit: `CustomRequestStatus` enum, `CR-000000` format, NT event names
      (`custom_request.submitted.customer|owner`, `custom_request.quoted.customer`) match
      README §3.2 and notifications domain.
- [ ] Webhook dispatcher has exactly one signature gate (no duplicated verification logic).
- [ ] Reference-image upload cannot write to admin folders (preset scope).
- [ ] No customer email on decline/complete (matches §10 table).
- [ ] AC-010 manual run recorded: form → inbox → emails → quote → payment → order visible in
      Orders with Paid status.
