# API Contract & Schema Specification: Ligera Platform Foundation

Shared conventions (all domains): **base** `APP_URL` (unversioned `/api`), JSON bodies, error
envelope `{ "error": string, "code": string, "details"?: unknown }`, success returns the raw
resource. Auth = `ligera_at` httpOnly cookie (or `Authorization: Bearer <token>` for tooling).
See `workflows/README.md` §3.5.

## 1. Global Overview

- **Protocol:** REST over HTTPS. **Content-Type:** `application/json` (unless noted).
- **Guards:** `public` (no auth) · `staff` (owner **or** staff) · `owner` (owner only).
- **Rate limits:** `POST /api/auth/login` and `POST /api/auth/password/request-reset` — 5
  attempts / 15 min / email + IP (429 `AUTH_LOCKED` / `RATE_LIMITED`).
- **Cookies:** `ligera_at` (access, 15 min), `ligera_rt` (refresh, 7 d), httpOnly, Secure,
  SameSite=Lax.

## 2. Endpoints Matrix

| Method | Path | Summary | Auth & Scope | Request Body | Success |
|---|---|---|---|---|---|
| GET | `/api/health` | Liveness + db ping | public | — | 200 `{ status:"ok", db:"up" }` |
| POST | `/api/auth/login` | Email + password (+ TOTP) login | public | `LoginRequest` | 200 `AuthTokens` |
| POST | `/api/auth/logout` | Clear auth cookies | public | — | 200 `{ ok: true }` |
| POST | `/api/auth/refresh` | Rotate refresh → new access token | public (refresh cookie) | — | 200 `AuthTokens` |
| GET | `/api/auth/me` | Current user identity + role | staff | — | 200 `CurrentUser` |
| POST | `/api/auth/password/request-reset` | Email single-use reset token | public | `RequestResetRequest` | 200 `{ ok: true }` |
| POST | `/api/auth/password/confirm-reset` | Consume token, set new password | public | `ConfirmResetRequest` | 200 `{ ok: true }` |
| POST | `/api/auth/2fa/setup` | Generate TOTP secret + otpauth URI | owner | — | 200 `TwoFactorSetup` |
| POST | `/api/auth/2fa/enable` | Verify code and enable 2FA | owner | `Enable2FaRequest` | 200 `{ ok: true }` |
| POST | `/api/admin/uploads/sign` | Sign Cloudinary direct-upload params | staff | `UploadSignRequest` | 200 `UploadSignature` |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Invalid/missing body fields | 400 | `VALIDATION_ERROR` | `{ error, code, details: zodIssues }` |
| Bad credentials | 401 | `AUTH_INVALID` | `{ error: "Email or password is incorrect." }` |
| 2FA required | 401 | `TOTP_REQUIRED` | `{ error: "Enter your two-factor code." }` |
| No/expired token | 401 | `AUTH_UNAUTHENTICATED` | `{ error: "Please sign in again." }` |
| Role insufficient (e.g. staff on owner route) | 403 | `AUTH_FORBIDDEN` | `{ error: "You do not have access to this." }` |
| Resource not found | 404 | `NOT_FOUND` | `{ error: "..." }` |
| Account locked / rate limited | 429 | `AUTH_LOCKED` / `RATE_LIMITED` | `{ error: "Too many attempts. Try again in {n} minutes." }` |
| Unexpected failure | 500 | `INTERNAL` | `{ error: "Something went wrong on our side." }` |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod schemas live in `web/src/lib/api/schemas/auth.ts`; inferred types re-exported from
`web/src/lib/api/types/auth.ts`.

### 4.1 Client Request DTOs

```typescript
import { z } from "zod";

export const LoginRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const RequestResetRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});
export type RequestResetRequest = z.infer<typeof RequestResetRequest>;

export const ConfirmResetRequest = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
});
export type ConfirmResetRequest = z.infer<typeof ConfirmResetRequest>;

export const Enable2FaRequest = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type Enable2FaRequest = z.infer<typeof Enable2FaRequest>;

export const UploadSignRequest = z.object({
  folder: z.literal("ligera").default("ligera"),
});
export type UploadSignRequest = z.infer<typeof UploadSignRequest>;
```

### 4.2 Response DTOs (server-injected metadata)

```typescript
export interface AuthTokens {
  user: CurrentUser;
  accessTokenMaxAge: 900;   // seconds — informational; tokens ride cookies
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  twoFactorEnabled: boolean;
}

export interface TwoFactorSetup {
  otpauthUri: string;       // otpauth://totp/Ligera:owner@ligera.ng?secret=...
  secret: string;           // shown once; user saves in authenticator app
}

export interface UploadSignature {
  apiKey: string;
  timestamp: number;
  signature: string;         // sha1 of "folder=ligera&timestamp=<ts><api_secret>"
  folder: string;
  cloudName: string;
  uploadUrl: "https://api.cloudinary.com/v1_1/image/upload";
}
```

### 4.3 Query Filter DTOs

Not applicable in this domain (no list endpoints; activity-log/dashboard filters are defined in
`admin-portal/api-contract.md`).

## 5. OpenAPI 3.0 Specification (platform slice)

```yaml
openapi: 3.0.3
info:
  title: Ligera Platform API
  version: 1.0.0
  description: Auth, uploads and health for the Ligera single-app API.
servers:
  - url: https://app.ligera.ng
  - url: http://localhost:3000
paths:
  /api/health:
    get:
      summary: Liveness + database ping
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ok }
                  db: { type: string, example: up }
  /api/auth/login:
    post:
      summary: Admin/staff login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                totpCode: { type: string, pattern: '^\d{6}$' }
      responses:
        "200":
          description: Authenticated; cookies set
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: "#/components/schemas/CurrentUser" }
        "401": { $ref: "#/components/responses/Error" }
        "429": { $ref: "#/components/responses/Error" }
  /api/auth/logout:
    post:
      summary: Clear auth cookies
      responses:
        "200": { description: OK }
  /api/auth/refresh:
    post:
      summary: Rotate refresh token
      responses:
        "200": { description: New access token issued }
        "401": { $ref: "#/components/responses/Error" }
  /api/auth/me:
    get:
      summary: Current user identity
      security: [{ cookieAuth: [] }]
      responses:
        "200":
          description: Current user
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CurrentUser" }
        "401": { $ref: "#/components/responses/Error" }
  /api/auth/password/request-reset:
    post:
      summary: Request password reset email
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: { type: string, format: email }
      responses:
        "200": { description: OK (always, to avoid account enumeration) }
        "429": { $ref: "#/components/responses/Error" }
  /api/auth/password/confirm-reset:
    post:
      summary: Consume reset token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, password]
              properties:
                token: { type: string }
                password: { type: string, minLength: 8 }
      responses:
        "200": { description: Password updated }
        "400": { $ref: "#/components/responses/Error" }
  /api/auth/2fa/setup:
    post:
      summary: Generate TOTP secret (owner only)
      security: [{ cookieAuth: [] }]
      responses:
        "200":
          description: Secret + otpauth URI
          content:
            application/json:
              schema:
                type: object
                properties:
                  otpauthUri: { type: string }
                  secret: { type: string }
        "403": { $ref: "#/components/responses/Error" }
  /api/auth/2fa/enable:
    post:
      summary: Enable 2FA after verifying a code (owner only)
      security: [{ cookieAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [code]
              properties:
                code: { type: string, pattern: '^\d{6}$' }
      responses:
        "200": { description: 2FA enabled }
        "400": { $ref: "#/components/responses/Error" }
        "403": { $ref: "#/components/responses/Error" }
  /api/admin/uploads/sign:
    post:
      summary: Sign Cloudinary direct upload (staff+)
      security: [{ cookieAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                folder: { type: string, default: ligera }
      responses:
        "200":
          description: Signature params
          content:
            application/json:
              schema:
                type: object
                properties:
                  apiKey: { type: string }
                  timestamp: { type: integer }
                  signature: { type: string }
                  folder: { type: string }
                  cloudName: { type: string }
                  uploadUrl: { type: string }
        "401": { $ref: "#/components/responses/Error" }
        "403": { $ref: "#/components/responses/Error" }
components:
  securitySchemes:
    cookieAuth: { type: apiKey, in: cookie, name: ligera_at }
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
              details: { type: object }
  schemas:
    CurrentUser:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [owner, staff] }
        twoFactorEnabled: { type: boolean }
```
