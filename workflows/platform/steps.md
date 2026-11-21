# Business Logic & Endpoint Execution Steps: Ligera Platform Foundation

All endpoints accept `application/json`. Errors follow the shared envelope
(`workflows/README.md` §3.5). Actor context comes from `requireAuth()` /
`requireRole("owner")` (`src/lib/auth/guard.ts`), which sets `userId` and `role`.

| Method | Path | Summary | Auth & Scope |
|---|---|---|---|
| GET | `/api/health` | Liveness + db ping | public |
| POST | `/api/auth/login` | Email + password (+ TOTP) login | public |
| POST | `/api/auth/logout` | Clear auth cookies | public |
| POST | `/api/auth/refresh` | Rotate refresh token | public (cookie) |
| GET | `/api/auth/me` | Current identity | staff |
| POST | `/api/auth/password/request-reset` | Email reset token | public |
| POST | `/api/auth/password/confirm-reset` | Consume reset token | public |
| POST | `/api/auth/2fa/setup` | Generate TOTP secret | owner |
| POST | `/api/auth/2fa/enable` | Enable 2FA | owner |
| POST | `/api/admin/uploads/sign` | Sign Cloudinary upload | staff |

---

## Step 1 — `GET /api/health`

1. **Context:** none.
2. **Pre-condition:** none.
3. **Processing:** `await mongoose.connection.db.admin().ping()` with 2s timeout.
4. **Persistence:** none.
5. **Async:** none.
6. **Response:** `200 { status: "ok", db: "up" | "down", timestamp }`. Never throws 500 — health
   must always answer.

## Step 2 — `POST /api/auth/login`

1. **Context:** public; client IP captured from `x-forwarded-for`.
2. **Validation:** `LoginRequest.safeParse(body)` → 400 `VALIDATION_ERROR` with issues.
3. **Processing:**
   - Load `users` by lowercase email. If missing → generic 401 `AUTH_INVALID` (no enumeration).
   - If `lockedUntil > now` → 429 `AUTH_LOCKED` with minutes remaining.
   - `bcrypt.compare(password, passwordHash)`; on failure `$inc failedLoginAttempts +1`; if
     attempts ≥ 5 → set `lockedUntil = now + 15m`; return 401 `AUTH_INVALID`.
   - If `twoFactorEnabled && !totpCode` → 401 `TOTP_REQUIRED`.
   - If `twoFactorEnabled && totpCode` → decrypt secret, `otpauth.validate({ token, secret })`;
     wrong code → 401 `AUTH_INVALID` (does **not** count as password failure).
4. **Persistence (atomic):** one conditional
   `findOneAndUpdate({ email, lockedUntil-not-active }, { failedLoginAttempts: 0, lastLoginAt: now })`
   → user doc. Append `activity_logs` `{ userId, action: "auth.login", entity: { type: "user", id }, before: null, after: { ip }, ip }`.
5. **Async:** none.
6. **Response:** set `ligera_at` (15 m) + `ligera_rt` (7 d) cookies → `200 { user: CurrentUser }`.

## Step 3 — `POST /api/auth/logout`

1. **Context:** public. 2. **Validation:** none. 3. **Processing:** none.
4. **Persistence:** clear both cookies. 5. **Async:** none.
6. **Response:** `200 { ok: true }`.

## Step 4 — `POST /api/auth/refresh`

1. **Context:** reads `ligera_rt` cookie; missing → 401 `AUTH_UNAUTHENTICATED`.
2. **Validation:** verify JWT + expiry; load user (still exists, not locked).
3. **Processing:** rotate — issue new refresh token (old one's `jti` is single-use: keep an
   in-memory LRU denylist of 1,000 recent `jti`s per process).
4. **Persistence:** new `ligera_at` + `ligera_rt` cookies.
5. **Async:** none. 6. **Response:** `200 { user: CurrentUser }`.

## Step 5 — `GET /api/auth/me`

1. **Context:** `requireAuth()` → 401 if invalid. 2–3. Load fresh user doc.
4. **Persistence:** none. 5. **Async:** none.
6. **Response:** `200 CurrentUser` (`{ id, name, email, role, twoFactorEnabled }`).

## Step 6 — `POST /api/auth/password/request-reset`

1. **Context:** public; rate-limit 5/15m per email+IP → 429 `RATE_LIMITED`.
2. **Validation:** `RequestResetRequest` → 400.
3. **Processing:** if user exists → generate 32-byte token, store `sha256(token)` +
   `resetExpiresAt = now + 24h` on the user. Enqueue `password.reset` email via
   `enqueueNotification()` (notifications domain) with deep link
   `/admin/reset-password?token=...`.
4. **Persistence:** the token hash + expiry.
5. **Async:** notification queue (picked up ≤ 30 s).
6. **Response:** always `200 { ok: true }` (no account enumeration).

## Step 7 — `POST /api/auth/password/confirm-reset`

1. **Context:** public. 2. **Validation:** `ConfirmResetRequest` → 400.
3. **Processing:** hash incoming token, find user by `resetTokenHash` + unexpired; bcrypt-hash
   new password (cost 12). Wrong/expired token → 400 `VALIDATION_ERROR` "This reset link has
   expired. Request a new one."
4. **Persistence:** `passwordHash`, clear `resetTokenHash`/`resetExpiresAt`, reset
   `failedLoginAttempts`/`lockedUntil`; append `activity_logs` `auth.password.reset`.
5. **Async:** none. 6. **Response:** `200 { ok: true }`.

## Step 8 — `POST /api/auth/2fa/setup` (owner)

1. **Context:** `requireRole("owner")` → 403 for staff.
2–3. `otpauth.generateSecret()`; return `otpauthUri` + `secret`. **No persistence yet.**
4–5. none. 6. `200 TwoFactorSetup`.

## Step 9 — `POST /api/auth/2fa/enable` (owner)

1. **Context:** `requireRole("owner")`.
2. **Validation:** `Enable2FaRequest` → 400.
3. **Processing:** caller re-sends the secret from setup + a valid code; verify with
   `otpauth.validate`.
4. **Persistence:** AES-256-GCM encrypt secret → `twoFactorSecretEncrypted`, set
   `twoFactorEnabled: true`; `activity_logs` `auth.2fa.enable`.
5. **Async:** none. 6. `200 { ok: true }`.

## Step 10 — `POST /api/admin/uploads/sign` (staff)

1. **Context:** `requireAuth()` (owner or staff).
2. **Validation:** `UploadSignRequest` → 400.
3. **Processing:** `timestamp = now`; `signature = sha1("folder=ligera&timestamp=<ts>" + CLOUDINARY_API_SECRET)`
   via the `cloudinary` SDK `utils.sign_request_params`.
4. **Persistence:** `activity_logs` `upload.sign` (lightweight: no before/after).
5. **Async:** none.
6. **Response:** `200 UploadSignature` — client uploads directly to Cloudinary, then persists
   `{ publicId, alt, width, height }` via the catalog product APIs.

---

## Scheduler bootstrap — `instrumentation.ts`

1. `register()` runs once per Node process; guard `NEXT_RUNTIME === "nodejs"` and
   `ENABLE_SCHEDULER !== "false"`.
2. `registerScheduler()` registers (idempotent — module-level `started` flag):
   - `release-expired-holds` — cron `0 * * * * *` — body: `workflows/checkout-payments/steps.md` §"Hold release job".
   - `process-notification-queue` — cron `*/30 * * * * *` — body: `workflows/notifications/steps.md` §"Queue processing cycle".
3. Each job wraps its body in try/catch → `captureError()`; a failing job never kills the
   process and self-heals on the next tick.

## Migration execution — `scripts/migrate-from-supabase.ts`

1. Load legacy env (`LEGACY_SUPABASE_URL`, `LEGACY_SUPABASE_SERVICE_ROLE_KEY`).
2. Fetch legacy `products` (all), `orders` + `order_items` (all).
3. Map per `platform/specs.md` §10 M3 (idempotent via `externalRef`).
4. Seed `counters`, `settings`, `content_pages`, owner user (`M4`).
5. Print a summary table (counts per collection) and exit non-zero on any failure.
