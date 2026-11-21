# Step-by-Step TDD Implementation Plan: Ligera Platform Foundation

## 1. TDD Strategy & Execution Principles

- **Cycle:** RED (failing test) → GREEN (minimum code) → VERIFY (`npm test`) → REFACTOR.
- **Runner:** Vitest (`vitest run`) — added in Phase 0. `mongodb-memory-server` provides the
  test DB; `NextRequest`/`NextResponse` construct route-handler tests with zero HTTP server.
- **Mocking:** `vi.mock("resend")`, `vi.mock("cloudinary")`, `vi.mock("otpauth")`,
  `vi.mock("@/lib/jobs/scheduler")` — external HTTP never leaves the process.
- **Coverage target:** ≥ 80% on new logic.

## 2. Target File Structure

```text
web/
├── instrumentation.ts
├── middleware.ts
├── vitest.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # fonts (Fraunces/Inter), Organization JSON-LD
│   │   ├── not-found.tsx  error.tsx   # branded 404 / error (FR §14)
│   │   ├── sitemap.ts  robots.ts
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── auth/{login,logout,refresh,me}/route.ts
│   │           auth/password/{request-reset,confirm-reset}/route.ts
│   │           auth/2fa/{setup,enable}/route.ts
│   │           admin/uploads/sign/route.ts
│   ├── lib/
│   │   ├── db/connect.ts
│   │   ├── db/models/{user,activityLog,counter,settings}.ts
│   │   ├── auth/{jwt.ts,bcrypt.ts,guard.ts,totp.ts}
│   │   ├── jobs/scheduler.ts
│   │   └── api/schemas/auth.ts  api/types/auth.ts
│   ├── components/{CookieConsent.tsx,motion/*}
│   └── styles.css                     # brand tokens (specs §8)
├── scripts/{seed-owner.ts,seed-settings.ts,migrate-from-supabase.ts}
└── tests/platform/*.test.ts
```

## 3. Phase 0: Module Foundation & Schema Setup

- **0.1** Scaffold Next.js App Router inside `web/` (specs §10 M1); move
  `components/ui/**` over; delete Vite artifacts; add deps (M2). `npm run build` green.
- **0.2** `vitest.config.ts` (node env, `setupFiles: tests/setup.ts`), `tests/setup.ts` starts
  `mongodb-memory-server` and sets `MONGODB_URI`; add `test`, `test:watch`, `coverage` scripts.
- **0.3 [VERIFY]** empty suite runs; `connectDb()` test connects to memory server and pings.

## 4. Phase 1: `GET /api/health`

- **1.1 [RED]** `health.test.ts`: handler returns `{ status: "ok", db: "up" }` with mocked ping;
  returns `db: "down"` (not 500) when ping rejects.
- **1.2 [RED]** route test: `GET(new NextRequest("/api/health"))` → 200 JSON.
- **1.3 [GREEN]** `app/api/health/route.ts` with try/catch ping.
- **1.4 [VERIFY]** `npx vitest run tests/platform/health.test.ts` → PASS.

## 5. Phase 2: `POST /api/auth/login`

- **2.1 [RED]** service tests (`tests/platform/login.test.ts`), seeded owner via helper:
  - valid email + password → sets cookies (assert `Set-Cookie` contains `ligera_at`,
    `HttpOnly`, `SameSite=Lax`), returns `CurrentUser` with `role: "owner"`.
  - wrong password → 401 `AUTH_INVALID`; `failedLoginAttempts` incremented.
  - 5th failure → `lockedUntil` set; 6th attempt → 429 `AUTH_LOCKED` with minutes remaining.
  - `twoFactorEnabled` + no code → 401 `TOTP_REQUIRED`.
  - `twoFactorEnabled` + valid mocked TOTP → 200; invalid → 401.
  - unknown email → 401 `AUTH_INVALID` (identical body — no enumeration).
  - `activity_logs` gains `auth.login` on success.
- **2.2 [RED]** route test: parses `LoginRequest`; malformed body → 400 `VALIDATION_ERROR`.
- **2.3 [GREEN]** `lib/auth/jwt.ts` (jose sign/verify), `lib/auth/bcrypt.ts`, guard, login
  route + service in `app/api/auth/login/route.ts`.
- **2.4 [VERIFY]** vitest run → PASS.

## 6. Phase 3: refresh, logout, me

- **3.1 [RED]** refresh: missing cookie → 401; valid refresh → new access + rotated refresh;
  replayed (denied `jti`) → 401. logout: clears both cookies. me: no cookie → 401; valid →
  `CurrentUser`.
- **3.2 [RED]** route tests for delegation.
- **3.3 [GREEN]** three route handlers + jti LRU.
- **3.4 [VERIFY]** PASS.

## 7. Phase 4: password reset

- **4.1 [RED]** request-reset: enqueues email (mocked `enqueueNotification` with type
  `password.reset`); always 200; stores only sha256 hash; rate limit → 429.
  confirm-reset: valid token updates hash; expired → 400; clears lockout fields.
- **4.2–4.4]** route tests → handlers → VERIFY.

## 8. Phase 5: TOTP 2FA (owner)

- **5.1 [RED]** setup: owner-only (staff → 403 `AUTH_FORBIDDEN`), returns secret once, persists
  nothing. enable: 3 valid codes required before persist; encrypted secret at rest
  (assert ciphertext ≠ plaintext).
- **5.2–5.4]** route tests → `lib/auth/totp.ts` + handlers → VERIFY.

## 9. Phase 6: `POST /api/admin/uploads/sign`

- **6.1 [RED]** staff allowed, unauthenticated → 401; signature matches
  `sha1("folder=ligera&timestamp=<ts>" + secret)` with mocked Cloudinary util; logs
  `upload.sign`.
- **6.2–6.4]** route test → handler → VERIFY.

## 10. Phase 7: Scheduler + instrumentation

- **7.1 [RED]** `registerScheduler()` registers both cron jobs exactly once (mocked
  `node-cron.schedule`); `ENABLE_SCHEDULER=false` skips; job wrapper catches errors.
- **7.2–7.4]** `instrumentation.ts` + `lib/jobs/scheduler.ts` → VERIFY.

## 11. Phase 8: Brand shell, consent, analytics, SEO

- **8.1 [RED]** component tests: `CookieConsent` hides GA4/Meta Pixel `<script>` until accept;
  remembers choice in localStorage; offers granular toggles. `not-found.tsx` renders branded 404
  with link to `/shop`. JSON-LD `Organization` present in layout render.
- **8.2 [GREEN]** components, layout fonts/tokens, sitemap/robots stubs, Watermelon UI excerpts
  vendored into `components/motion/*` (reduced-motion respected).
- **8.3 [VERIFY]** vitest + `npm run build`; manual Lighthouse ≥ 95 a11y on `/`.

## 12. Phase 9: Migration scripts

- **9.1 [RED]** `migrate-from-supabase.ts` against a fixture legacy dump (mocked supabase
  client): 8 products → 8 `products` + 8 `variants` (correct status mapping, sku, threshold
  default 5); legacy orders → `orders` with mapped statuses + `payments` rows; second run is a
  no-op (idempotent via `externalRef`); counters seeded past legacy max.
- **9.2 [GREEN]** implement scripts + `seed-owner.ts` + `seed-settings.ts`.
- **9.3 [VERIFY]** run against a Supabase staging project; counts in summary table match.

## Final Phase: Refactoring, Code Quality & Verification Checklist

- [ ] `npm test` — all platform suites green; coverage ≥ 80% on `lib/auth/**`, `lib/db/**`.
- [ ] `npm run build` — Next.js production build succeeds with typed routes.
- [ ] No secret in client bundles (`grep -r "SECRET" .next/static` clean); `.env.example`
      documents every variable from README §3.9.
- [ ] bcrypt cost 12; JWT cookies httpOnly+Secure; login rate limit proven by test.
- [ ] Activity log entries exist for `auth.login`, `auth.password.reset`, `auth.2fa.enable`,
      `upload.sign`.
- [ ] Legacy `backend/` removal committed on branch `platform-migration`; docker-compose
      reduced; README updated (specs §10 M5–M6).
