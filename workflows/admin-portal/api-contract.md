# API Contract & Schema Specification: Admin Portal

Shared conventions: `workflows/README.md` §3.5. Guards: **owner** except the public content
read.

## 1. Global Overview

- **Dashboard:** one aggregated response; WAT-based periods; `period ∈ {today, 7d, 30d}`.
- **Settings:** singleton document; partial top-level updates.
- **CSV:** `text/csv` attachments.

## 2. Endpoints Matrix

| Method | Path | Summary | Auth | Request | Success |
|---|---|---|---|---|---|
| GET | `/api/admin/dashboard` | Executive dashboard (AD-010–013) | owner | `?period=today\|7d\|30d` | 200 `DashboardSnapshot` |
| GET | `/api/admin/activity-logs` | Audit trail (AD-003) | owner | `ActivityLogQuery` | 200 `{ data: ActivityLogRow[], meta }` |
| GET | `/api/admin/settings` | Read settings | owner | — | 200 `Settings` |
| PUT | `/api/admin/settings` | Partial update | owner | `SettingsPatch` | 200 `Settings` |
| GET | `/api/admin/content` | List content pages | owner | — | 200 `ContentPageRow[]` |
| GET | `/api/admin/content/:slug` | Read one page | owner | — | 200 `ContentPage` |
| PUT | `/api/admin/content/:slug` | Update page sections/SEO | owner | `ContentPageInput` | 200 `ContentPage` |
| GET | `/api/content/:slug` | Public page render data | public | — | 200 `ContentPage` (cache 300 s) |
| GET | `/api/admin/customers` | Customer list + spend | owner | `CustomerQuery` | 200 `{ data: CustomerRow[], meta }` |
| GET | `/api/admin/customers/export.csv` | Customers CSV | owner | — | 200 `text/csv` |
| GET | `/api/admin/delivery-zones` | Zones (admin view: all fields) | owner | — | 200 `DeliveryZoneAdmin[]` |
| POST | `/api/admin/delivery-zones` | Create zone (AD-050) | owner | `ZoneInput` | 201 `{ id }` |
| PUT | `/api/admin/delivery-zones/:id` | Update zone | owner | `ZoneInput` | 200 `{ id }` |
| DELETE | `/api/admin/delivery-zones/:id` | Remove unused zone | owner | — | 200 `{ ok: true }` |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Invalid period/fields | 400 | `VALIDATION_ERROR` | zod details |
| Unknown page/zone/log | 404 | `NOT_FOUND` | `{ error: "..." }` |
| Zone in use by orders | 409 | `ZONE_IN_USE` | `{ error: "Deactivate this zone instead — past orders use it." }` |
| Staff on owner route | 403 | `AUTH_FORBIDDEN` | `{ error: "You do not have access to this." }` |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod in `web/src/lib/api/schemas/admin.ts`.

### 4.1 Request DTOs

```typescript
export const SettingsPatch = z.object({
  store: z.object({
    name: z.string().min(1).max(80), tagline: z.string().max(120),
    logoPublicId: z.string(),
    contactEmail: z.string().email(), phone: z.string().max(30),
    whatsappNumber: z.string().regex(/^\d{10,14}$/),
    instagram: z.string().url(),
    openingHours: z.string().max(120),
  }).partial().optional(),
  delivery: z.object({
    freeDeliveryThreshold: z.number().int().min(0),
    cutOffTime: z.string().regex(/^\d{2}:\d{2}$/),       // WAT
    blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    pickup: z.object({ enabled: z.boolean(), address: z.string().max(300), hours: z.string().max(120) }),
  }).partial().optional(),
  payment: z.object({ payOnDelivery: z.boolean() }).partial().optional(),
  homepage: z.object({
    announcement: z.object({ text: z.string().max(140), active: z.boolean() }),
    hero: z.object({ headline: z.string().max(90), subline: z.string().max(160),
      image: z.object({ publicId: z.string(), alt: z.string() }),
      ctaText: z.string().max(30), ctaHref: z.string() }),
    featuredCollectionIds: z.array(z.string()).max(6),
    instagramPosts: z.array(z.object({ publicId: z.string(), alt: z.string(), url: z.string().url() })).max(6),
    newsletterEnabled: z.boolean(),
  }).partial().optional(),
  emailTemplates: z.record(z.string(), z.object({
    subject: z.string().max(120), body: z.string().max(4000) })).optional(),
});

export const ContentPageInput = z.object({
  title: z.string().min(1).max(120),
  sections: z.array(z.object({
    heading: z.string().max(160).default(""),
    body: z.string().max(8000),
    image: z.object({ publicId: z.string(), alt: z.string() }).nullable().optional(),
  })).max(20),
  seo: z.object({ title: z.string().max(70).default(""),
    metaDescription: z.string().max(160).default("") }),
});

export const ZoneInput = z.object({
  name: z.string().trim().min(1).max(80),
  fee: z.number().int().min(0),
  etaText: z.string().max(120).default(""),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const ActivityLogQuery = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),          // prefix match e.g. "product."
  entity: z.string().optional(),          // "order" | "product" | ...
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const CustomerQuery = z.object({
  q: z.string().max(120).optional(),      // email or name
  consentOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
```

### 4.2 Response DTOs

```typescript
export interface DashboardSnapshot {           // AD-010–013, G4
  period: "today" | "7d" | "30d";
  headline: {
    revenue: number; previousRevenue: number;
    paidOrders: number; previousPaidOrders: number;
    averageOrderValue: number; previousAverageOrderValue: number;
  };
  actionList: {                                // AD-011
    ordersAwaitingProcessing: number;
    customRequestsNew: number;
    failedOrAbandonedPayments: number;
  };
  topProducts: { productId: string; name: string; slug: string; unitsSold: number; revenue: number }[];
  revenueByCategory: { categoryId: string; name: string; revenue: number }[];
  lowStock: { variantId: string; productName: string; label: string; sku: string;
    available: number; threshold: number; soldOut: boolean }[];   // AC-008 surface
  stockValue: { atCost: number; atSelling: number };
}

export interface Settings { /* full singleton shape — specs §3.1 */ }

export interface ContentPage {
  slug: string; title: string;
  sections: { heading: string; body: string; image?: { url: string; alt: string } }[];
  seo: { title: string; metaDescription: string }; updatedAt: string;
}

export interface CustomerRow {                  // AD-064
  id: string; name: string; email: string; phone: string;
  orderCount: number; totalSpend: number; lastOrderAt?: string;
  marketingConsent: boolean; createdAt: string;
}

export interface ActivityLogRow {
  id: string; at: string; userName: string; action: string;
  entity: { type: string; id: string };
  before?: unknown; after?: unknown;
}
```

## 5. OpenAPI 3.0 Specification (admin-portal slice)

```yaml
openapi: 3.0.3
info: { title: Ligera Admin Portal API, version: 1.0.0 }
servers: [{ url: https://app.ligera.ng }, { url: http://localhost:3000 }]
paths:
  /api/admin/dashboard:
    get:
      summary: Executive dashboard snapshot (owner)
      security: [{ cookieAuth: [] }]
      parameters:
        - in: query
          name: period
          schema: { type: string, enum: [today, 7d, 30d], default: today }
      responses:
        "200":
          description: Snapshot
          content:
            application/json:
              schema:
                type: object
                properties:
                  period: { type: string }
                  headline: { type: object }
                  actionList: { type: object }
                  topProducts: { type: array, items: { type: object } }
                  revenueByCategory: { type: array, items: { type: object } }
                  lowStock: { type: array, items: { type: object } }
                  stockValue: { type: object }
        "403": { $ref: "#/components/responses/Error" }
  /api/admin/settings:
    get:
      summary: Read settings (owner)
      security: [{ cookieAuth: [] }]
      responses:
        "200": { description: Settings singleton }
        "403": { $ref: "#/components/responses/Error" }
    put:
      summary: Partial settings update (owner)
      security: [{ cookieAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object }
      responses:
        "200": { description: Updated settings }
        "400": { $ref: "#/components/responses/Error" }
  /api/admin/content/{slug}:
    put:
      summary: Update a content page (owner, AD-061)
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [title, sections]
              properties:
                title: { type: string }
                sections: { type: array, items: { type: object } }
                seo: { type: object }
      responses:
        "200": { description: Updated page }
        "404": { $ref: "#/components/responses/Error" }
  /api/content/{slug}:
    get:
      summary: Public content page (storefront render)
      parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
      responses:
        "200":
          description: Page
          content:
            application/json:
              schema:
                type: object
                properties:
                  slug: { type: string }
                  title: { type: string }
                  sections: { type: array, items: { type: object } }
        "404": { $ref: "#/components/responses/Error" }
  /api/admin/customers:
    get:
      summary: Customer list with spend and consent (owner, AD-064)
      security: [{ cookieAuth: [] }]
      parameters:
        - { in: query, name: q, schema: { type: string } }
        - { in: query, name: consentOnly, schema: { type: boolean } }
        - { in: query, name: page, schema: { type: integer } }
      responses:
        "200":
          description: Customers
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { type: object } }
                  meta: { type: object }
        "403": { $ref: "#/components/responses/Error" }
  /api/admin/delivery-zones:
    post:
      summary: Create delivery zone (owner, AD-050)
      security: [{ cookieAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, fee]
              properties:
                name: { type: string }
                fee: { type: integer }
                etaText: { type: string }
                active: { type: boolean }
                sortOrder: { type: integer }
      responses:
        "201": { description: Created }
        "403": { $ref: "#/components/responses/Error" }
  /api/admin/activity-logs:
    get:
      summary: Activity log (owner, AD-003)
      security: [{ cookieAuth: [] }]
      parameters:
        - { in: query, name: userId, schema: { type: string } }
        - { in: query, name: action, schema: { type: string } }
        - { in: query, name: page, schema: { type: integer } }
      responses:
        "200":
          description: Log rows
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { type: object } }
                  meta: { type: object }
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
