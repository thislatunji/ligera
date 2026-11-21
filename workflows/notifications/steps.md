# Business Logic & Endpoint Execution Steps: Notifications

Internal service steps first (the heart of this domain), then the admin endpoints. Owner
routes use `requireRole("owner")`.

| Method | Path | Summary | Auth |
|---|---|---|---|
| — | `enqueueNotification(type, ctx)` | Producer entry (internal) | internal |
| — | `processNotificationQueue()` | Cron cycle (internal) | scheduler |
| GET | `/api/admin/notifications` | Delivery log | owner |
| GET | `/api/admin/notifications/:id/preview` | HTML preview | owner |
| POST | `/api/admin/notifications/:id/resend` | Owner resend | owner |

---

## Internal Step 1 — `enqueueNotification(type, ctx)`

1. **Context:** called inline by producer request handlers (paid-commit, transitions, custom
   requests, low-stock checks, mismatch paths). Must be fast — no external calls.
2. **Validation:** `type` ∈ `NOTIFICATION_TYPES`; `ctx` has exactly one of
   `orderId`/`customRequestId` (plus optional `variant`), and a `payload` snapshot.
3. **Processing:** build `dedupeKey` per the normative table (specs §3.5) and resolve
   `recipient` — customer/owner from the order or custom request, or owner from `settings`
   for owner-alert types.
4. **Persistence:** `findOneAndUpdate({ dedupeKey }, { $setOnInsert: {...row, status:
   "pending", nextAttemptAt: now} }, { upsert: true })`. Duplicate key → row untouched,
   `inserted: false` — **rule 2 (once per event) is enforced here**, invisible to callers.
5. **Async:** none (the queue is the async boundary).
6. **Response (internal):** `{ inserted: boolean }`; producers never fail on duplicates.

## Internal Step 2 — `processNotificationQueue()` (cron every 30 s)

1. **Context:** scheduler tick (platform instrumentation); env-gated.
2. **Sweep:** `find({ status: "pending", nextAttemptAt: { $lte: now } }).sort({
   nextAttemptAt: 1 }).limit(50)`.
3. **Per row, render:** subject + HTML from `templates/<type>` with
   `settings.emailTemplates[type]` wording overrides (AD-063) and the row's `payload`
   snapshot; `SendEmailCommand { from: EMAIL_FROM, to: recipient, headers: { "X-Entity-Ref":
   dedupeKey } }`.
4. **Send:** `resend.emails.send(command)`.
5. **Persist outcome (guarded):**
   - success → `findOneAndUpdate({ _id, status: "pending" }, { status: "sent", sentAt:
     now, providerId })`;
   - error → `retryCount + 1`; < 5 → `nextAttemptAt = now + BACKOFF[retryCount]`
     (`[30s, 2m, 10m, 30m, 2h]`), stay `pending`; at 5 → `{ status: "failed", lastError:
     truncatedMessage }` (**rule 3: retried and logged**).
   - The `status: "pending"` guard makes double-send impossible if two cycles overlap.
6. **Logging:** `captureError()` on renderer/cycle faults — a broken row never blocks the
   batch (per-row try/catch).

## Step 3 — `GET /api/admin/notifications`

1. `requireRole("owner")`. 2. `NotificationQuery` → 400.
3. Filters + `orderNumber` resolution for linking; newest first.
4–5. None. 6. `200 { data: NotificationRow[], meta }`.

## Step 4 — `GET /api/admin/notifications/:id/preview`

1. `requireRole("owner")`. 2. Resolve row → 404.
3. Re-render the row's template from its stored `payload` (no fresh DB lookups).
4–5. None. 6. `200 text/html` (`Cache-Control: no-store`) — used by settings preview
   (AD-063) and order-page resend confirmation.

## Step 5 — `POST /api/admin/notifications/:id/resend` (§10 rule 3, owner resend)

1. `requireRole("owner")`. 2. Resolve row → 404; already `pending` → 409 `ALREADY_QUEUED`.
3. **Processing:** reset `{ status: "pending", retryCount: 0, nextAttemptAt: now, lastError:
   null }` (keep the original `dedupeKey` — this is a deliberate manual re-send, not a
   duplicate insert).
4. **Persistence:** the update above; the next cron tick delivers it (≤ 30 s).
   **+log** `notification.resend` `{ after: { type, recipient } }`.
5. **Async:** queue pickup (implicit).
6. `200 { id, status: "pending" }`.

---

## Frontend execution notes

- Order detail (orders-fulfillment UI) gets an **Email history** panel: rows per
  notification with status chip (Sent ✓ time / Pending / Failed ✗ with error + **Resend**
  button) — the §10 "owner can resend from the order page" surface, scoped by `orderId`.
- `/admin/settings` (admin-portal) gets a **Email templates** tab: per-type subject/body
  editors with `preview` (Step 4 HTML render in an iframe) and logo upload — AD-063.
