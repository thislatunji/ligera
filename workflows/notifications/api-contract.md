# API Contract & Schema Specification: Notifications

Shared conventions: `workflows/README.md` §3.5. All endpoints in this domain are **owner**
-guarded. The primary "API" of this domain, however, is the internal producer contract
(`enqueueNotification`) consumed by every other domain.

## 1. Global Overview

- **Internal service:** `enqueueNotification(type, ctx)` — see `specs.md` §3.5 (normative).
- **Delivery:** Resend `emails.send()`, sender `EMAIL_FROM` on the authenticated Ligera domain.
- **Queue:** `notification_logs` (durable), processed every 30 s (≤ 60 s to inbox, G5/AC-002).

## 2. Endpoints Matrix

| Method | Path | Summary | Auth | Request | Success |
|---|---|---|---|---|---|
| GET | `/api/admin/notifications` | Delivery log (filters) | owner | `NotificationQuery` | 200 `{ data: NotificationRow[], meta }` |
| GET | `/api/admin/notifications/:id/preview` | Rendered HTML preview | owner | — | 200 `text/html` |
| POST | `/api/admin/notifications/:id/resend` | Re-queue a failed/sent email | owner | — | 200 `{ id, status: "pending" }` |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Unknown notification | 404 | `NOT_FOUND` | `{ error: "Notification not found." }` |
| Resend of a `pending` row | 409 | `ALREADY_QUEUED` | `{ error: "That email is already queued to send." }` |
| Staff on owner route | 403 | `AUTH_FORBIDDEN` | `{ error: "Only the owner can view email logs." }` |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod in `web/src/lib/api/schemas/notifications.ts`.

### 4.1 Query DTOs

```typescript
export const NotificationQuery = z.object({
  status: z.enum(["pending", "sent", "failed"]).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),        // README §3.2 list
  orderId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
```

### 4.2 Response DTOs

```typescript
export interface NotificationRow {
  id: string;
  type: NotificationType;
  recipient: string;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  sentAt?: string;
  lastError?: string;
  orderNumber?: string;          // resolved for quick linking
  createdAt: string;
}
```

### 4.3 Internal DTOs (producer-facing, server-injected)

```typescript
export interface SendEmailCommand {          // built by the processor per row
  from: string;                               // Ligera <orders@ligera.ng>
  to: string;
  subject: string;                            // per-type template subject
  html: string;                              // rendered EmailLayout
  replyTo?: string;
  headers: { "X-Entity-Ref": string };        // dedupeKey — aids provider-side debugging
}

// enqueueNotification(type, ctx) returns { inserted: boolean } — false for duplicates
```

## 5. OpenAPI 3.0 Specification (notifications slice)

```yaml
openapi: 3.0.3
info: { title: Ligera Notifications Admin API, version: 1.0.0 }
servers: [{ url: https://app.ligera.ng }, { url: http://localhost:3000 }]
paths:
  /api/admin/notifications:
    get:
      summary: Email delivery log
      security: [{ cookieAuth: [] }]
      parameters:
        - in: query
          name: status
          schema: { type: string, enum: [pending, sent, failed] }
        - { in: query, name: type, schema: { type: string } }
        - { in: query, name: orderId, schema: { type: string } }
        - { in: query, name: dateFrom, schema: { type: string, format: date } }
        - { in: query, name: dateTo, schema: { type: string, format: date } }
        - { in: query, name: page, schema: { type: integer } }
        - { in: query, name: limit, schema: { type: integer } }
      responses:
        "200":
          description: Notification rows
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string }
                        type: { type: string }
                        recipient: { type: string }
                        status: { type: string, enum: [pending, sent, failed] }
                        retryCount: { type: integer }
                        sentAt: { type: string, format: date-time }
                        orderNumber: { type: string }
        "403": { $ref: "#/components/responses/Error" }
  /api/admin/notifications/{id}/preview:
    get:
      summary: Rendered HTML preview of an email
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      responses:
        "200": { description: text/html preview }
        "404": { $ref: "#/components/responses/Error" }
  /api/admin/notifications/{id}/resend:
    post:
      summary: Re-queue an email for sending (owner resend rule §10.3)
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      responses:
        "200": { description: Re-queued }
        "409": { $ref: "#/components/responses/Error" }
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
```
