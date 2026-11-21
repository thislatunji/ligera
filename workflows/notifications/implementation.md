# Step-by-Step TDD Implementation Plan: Notifications

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED → GREEN → VERIFY (`npx vitest run tests/notifications`) → REFACTOR.
- **Runner:** Vitest + mongodb-memory-server; `resend` SDK mocked
  (`vi.mock("resend")`); fake timers drive the 30 s cycle and backoff schedule.
- **Coverage:** ≥ 90% on `lib/services/notifications/**` (delivery-correctness core).

## 2. Target File Structure

```text
web/src/
├── lib/services/notifications/
│   ├── enqueue.ts                   # enqueueNotification + dedupe keys
│   ├── queue.ts                     # processNotificationQueue + backoff
│   ├── sender.ts                    # Resend client wrapper
│   └── templates/
│       ├── layout.tsx               # EmailLayout (gold mark, ivory, serif)
│       ├── order-paid-customer.tsx  # NT-001 receipt
│       ├── order-paid-owner.tsx     # NT-002 alert
│       ├── order-status-customer.tsx# NT-003 (variant-aware)
│       ├── order-cancelled-customer.tsx # NT-004 (amount + timing)
│       ├── custom-request-submitted.tsx  # NT-005 (customer + owner variants)
│       ├── custom-request-quoted.tsx     # NT-006 (payment link button)
│       ├── stock-low-owner.tsx     # NT-007
│       └── payment-mismatch-owner.tsx   # NT-008
├── app/api/admin/notifications/
│   ├── route.ts
│   ├── [id]/preview/route.ts
│   └── [id]/resend/route.ts
├── lib/api/schemas/notifications.ts  lib/api/types/notifications.ts
├── components/admin/{EmailHistoryPanel.tsx, EmailTemplatesTab.tsx}
└── tests/notifications/*.test.ts
web/scripts/migrations/20261110000005-notification-logs.ts
```

## 3. Phase 0: Module Foundation & Schema Setup

- **0.1 [VERIFY]** migration creates `notification_logs` + indexes (dedupeKey unique,
  status+nextAttemptAt, orderId+createdAt, createdAt); re-run is a no-op.
- **0.2** fixture: one paid order, one custom request, settings with `emailTemplates`
  overrides empty (code defaults active).

## 4. Phase 1: `enqueueNotification` (rule 2 — once per event)

- **1.1 [RED]** `enqueue.test.ts`:
  - inserts a pending row with the right `dedupeKey`, recipient, payload;
  - **duplicate enqueue returns `inserted: false` and leaves exactly one row** (the webhook
    double-delivery case);
  - dedupe table is exact: `order.status.customer:<orderId>:<status>` per target status
    (two different statuses → two emails, same status twice → one);
  - `stock.low.owner` daily key (`:<variantId>:<yyyy-mm-dd>`) — two same-day alerts → one;
  - recipient resolution: customer from order, owner from settings.
- **1.2 [GREEN]** `enqueue.ts` (spec §3.5 shape).
- **1.3 [VERIFY]** PASS.

## 5. Phase 2: templates (rule 4 — branded, mobile, plain language)

- **2.1 [RED]** render snapshots per type:
  - NT-001 receipt contains order number, item lines, delivery fee, total, address,
    delivery window, contact line (AC-002 content);
  - NT-003 leads with the plain-words status and includes the delivery contact **only**
    for `out_for_delivery`;
  - NT-004 includes refund amount and "3–5 working days" timing;
  - NT-006 contains the payment-link button URL;
  - every template renders inside `EmailLayout` (logo, ≤ 600px single column);
  - `settings.emailTemplates` wording override wins over code default (AD-063);
  - subject lines unique per type.
- **2.2 [GREEN]** `templates/*` + `layout.tsx`.
- **2.3 [VERIFY]** PASS (snapshot tests).

## 6. Phase 3: queue processor (rule 3 — retried and logged; G5 timing)

- **3.1 [RED]** `queue.test.ts`:
  - due pending rows send exactly one Resend call each (mock counts calls);
  - success → `sent` + `sentAt` + `providerId`; status guard blocks double-send when the
    same row is swept twice in one fake-timer tick;
  - failure → `retryCount` increments and `nextAttemptAt` follows
    `[30s, 2m, 10m, 30m, 2h]`; 5th failure → `failed` with truncated `lastError`;
  - a poisoned row (renderer throws) does not block the rest of the batch;
  - **timing proof:** enqueue at T0, tick at T0+30s → `sentAt ≤ T0+35s` (AC-002/G5 within
    60 s).
- **3.2 [GREEN]** `queue.ts` + `sender.ts`.
- **3.3 [VERIFY]** PASS.

## 7. Phase 4: admin endpoints (**owner**)

- **4.1 [RED]** list filters (status/type/orderId/date) + orderNumber resolution + paging;
  preview renders stored payload HTML (no fresh sends); resend resets a `failed`/`sent` row
  to `pending` with fresh attempt, 409 on already-pending, 403 for staff.
- **4.2 [RED]** route tests (auth, 404s, 409s).
- **4.3 [GREEN]** three routes + `+log` on resend.
- **4.4 [VERIFY]** PASS.

## 8. Phase 5: producer wiring (integration with other domains)

- **5.1 [RED]** cross-domain suites (checkout/orders/custom/catalog) already assert enqueue
  calls — run them together: `npx vitest run tests/checkout tests/orders
  tests/custom-orders tests/catalog` and confirm no regressions and the mock invariants
  (NT-001/002 exactly once on paid commit; **nothing** enqueued on abandon/fail — AC-003).
- **5.2 [GREEN]** fix any drift found.
- **5.3 [VERIFY]** all suites green.

## 9. Phase 6: Frontend panels

- **6.1 [RED]** `EmailHistoryPanel` (order detail): rows with status chips, error text,
  Resend button (disabled while pending); `EmailTemplatesTab`: per-type editor + live
  preview iframe + logo upload; staff cannot reach either (route-level 403 test).
- **6.2 [GREEN]** components wired to the admin API client.
- **6.3 [VERIFY]** vitest + `npm run build`.

## Final Phase: Refactoring, Quality & Verification Checklist

- [ ] `npx vitest run tests/notifications` green; coverage ≥ 90% on services.
- [ ] Dedupe keys match specs §3.5 table **exactly** (cross-file audit vs README §3.2 types).
- [ ] No PII/card data in `payload`/`lastError`; `lastError` truncated ≤ 500 chars.
- [ ] Resend domain + SPF/DKIM/DMARC verified in staging; test email received in Gmail +
      Outlook inboxes (launch checklist §18).
- [ ] Staging timing check: real webhook → NT-001 in inbox < 60 s (AC-002 recorded).
- [ ] Nothing enqueues for failed/abandoned payments (AC-003) — verified via suite 5.1.
