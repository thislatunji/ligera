# API Contract & Schema Specification: Product Catalog, Discovery & Inventory

Shared conventions: `workflows/README.md` §3.5–§3.6 (unversioned `/api`, JSON, error envelope
`{ error, code, details? }`, guards `public` / `staff` / `owner`).

## 1. Global Overview

- **Public catalog** is cache-friendly `GET`-only (CDN-able, `Cache-Control: public,
  s-maxage=60, stale-while-revalidate=300`).
- **Admin catalog** mutates with `activity_logs` side effects (AD-003).
- **Money:** integer Naira. **IDs:** ObjectId strings. **Dates:** ISO 8601 (WAT-displayed).

## 2. Endpoints Matrix

| Method | Path | Summary | Auth & Scope | Request | Success |
|---|---|---|---|---|---|
| GET | `/api/products` | Published catalog with filters/sort/pagination | public | `ProductQuery` (query string) | 200 `{ data: ProductCard[], meta }` |
| GET | `/api/products/:slug` | Product detail incl. variants, gallery, pairs-well-with | public | — | 200 `ProductDetail` |
| GET | `/api/search/suggest` | Keyword suggestions (≤ 8) | public | `?q=` | 200 `Suggestion[]` |
| GET | `/api/categories` | Taxonomy by type | public | `?type=category\|space\|collection` | 200 `Category[]` |
| GET | `/api/admin/products` | All statuses + stock + flags | staff | `AdminProductQuery` | 200 `{ data: AdminProductRow[], meta }` |
| POST | `/api/admin/products` | Create product (+variants, +images) | owner | `ProductUpsert` | 201 `{ id }` |
| PUT | `/api/admin/products/:id` | Full edit (content, seo, images reorder) | owner | `ProductUpsert` | 200 `{ id }` |
| PATCH | `/api/admin/products/:id/status` | draft→published→archived transitions | owner | `{ status }` | 200 `{ id, status }` |
| POST | `/api/admin/products/:id/duplicate` | Copy to draft ("(Copy)" suffix, new slug/skus) | owner | — | 201 `{ id }` |
| DELETE | `/api/admin/products/:id` | Delete draft/archived only | owner | — | 200 `{ ok: true }` |
| POST | `/api/admin/products/:id/variants` | Add variant | owner | `VariantInput` | 201 `{ id }` |
| PUT | `/api/admin/variants/:id` | Edit variant (label, sku, price, salePrice, threshold, active) | owner | `VariantInput` | 200 `{ id }` |
| DELETE | `/api/admin/variants/:id` | Remove variant (no order refs) | owner | — | 200 `{ ok: true }` |
| POST | `/api/admin/variants/:id/stock` | Manual adjustment with reason | staff | `StockAdjustmentInput` | 200 `{ stockQty, available }` |
| GET | `/api/admin/variants/low-stock` | Low-stock + sold-out list | staff | `?threshold=` | 200 `LowStockRow[]` |
| GET | `/api/admin/products/export.csv` | Catalog CSV | owner | — | 200 `text/csv` |
| POST | `/api/admin/products/import.csv` | Bulk import/update catalog | owner | `multipart/form-data` file | 200 `ImportReport` |
| GET/POST | `/api/admin/categories` / `PUT/DELETE /api/admin/categories/:id` | Taxonomy CRUD | owner | `CategoryInput` | 200/201 |

## 3. Error Handling & HTTP Status Codes

| Condition | Status | Code | Body |
|---|---|---|---|
| Invalid filters/fields | 400 | `VALIDATION_ERROR` | `{ error, code, details }` |
| Slug not found / unpublished | 404 | `NOT_FOUND` | `{ error: "We couldn't find that product." }` |
| Duplicate SKU / slug | 409 | `SKU_TAKEN` / `SLUG_TAKEN` | `{ error: "SKU <sku> is already used." }` |
| Invalid status transition | 409 | `INVALID_TRANSITION` | `{ error: "Archived products can only be restored to draft." }` |
| Delete of published product | 409 | `PRODUCT_PUBLISHED` | `{ error: "Archive this product before deleting it." }` |
| Variant with order references | 409 | `VARIANT_IN_USE` | `{ error: "This variant is on existing orders — deactivate it instead." }` |
| Stock below zero | 422 | `STOCK_NEGATIVE` | `{ error: "Stock can't go below zero." }` |
| Staff attempting owner op | 403 | `AUTH_FORBIDDEN` | `{ error: "You do not have access to change pricing." }` |
| CSV malformed row | 422 | `IMPORT_ROW_ERROR` | row-level report |

## 4. Type-Safe Schemas & DTO Code Definitions

Zod schemas in `web/src/lib/api/schemas/catalog.ts`, types in `.../types/catalog.ts`.

### 4.1 Client Request DTOs

```typescript
export const ProductQuery = z.object({
  category: z.string().optional(),          // slug
  space: z.string().optional(),             // slug
  q: z.string().trim().max(120).optional(), // keyword
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(24),
});
export type ProductQuery = z.infer<typeof ProductQuery>;

export const VariantInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(1).max(40),
  price: z.number().int().min(0),
  salePrice: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
  costPrice: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const ProductUpsert = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(4000).default(""),
  categoryId: z.string().nullable(),
  spaceTagIds: z.array(z.string()).max(7).default([]),
  scentNotes: z.object({
    top: z.array(z.string().trim().max(40)).max(6).default([]),
    heart: z.array(z.string().trim().max(40)).max(6).default([]),
    base: z.array(z.string().trim().max(40)).max(6).default([]),
  }),
  ingredients: z.string().max(2000).default(""),
  safetyInfo: z.string().max(2000).default(""),
  burnTime: z.string().max(60).default(""),
  dimensions: z.string().max(60).default(""),
  finish: z.string().max(60).default(""),
  madeToOrder: z.boolean().default(false),
  leadTimeDays: z.number().int().min(0).max(120).default(0),
  images: z.array(z.object({
    publicId: z.string().min(1),
    alt: z.string().trim().min(3).max(160),       // alt text mandatory (AC-013)
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    position: z.number().int().min(0),
  })).max(12).default([]),
  pairsWith: z.array(z.string()).max(4).default([]),
  seo: z.object({
    title: z.string().max(70).default(""),
    metaDescription: z.string().max(160).default(""),
    ogImage: z.string().default(""),
  }).default({ title: "", metaDescription: "", ogImage: "" }),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  variants: z.array(VariantInput).min(1).max(20),  // AC-006: two sizes; scale to 20 (§11)
});

export const StockAdjustmentInput = z.object({
  change: z.number().int().refine((n) => n !== 0, "Change must not be zero"),
  reason: z.enum(["restock", "damaged", "sample", "correction"]),
  note: z.string().max(500).default(""),
});

export const CategoryInput = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["category", "space", "collection"]),
  parentId: z.string().nullable().optional(),
  description: z.string().max(500).default(""),
  image: z.object({ publicId: z.string(), alt: z.string() }).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
```

### 4.2 Response DTOs

```typescript
export interface ProductCard {           // FR-001 listing
  id: string;
  slug: string;
  name: string;
  categorySlug?: string;
  priceFrom: number;                      // min effective price
  badge: "in_stock" | "low_stock" | "sold_out" | "made_to_order"; // FR-005
  imageUrl: string;                      // Cloudinary f_auto,q_auto,w_400
  imageAlt: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
  scentNotes: { top: string[]; heart: string[]; base: string[] };
  ingredients: string;
  safetyInfo: string;
  burnTime: string;
  dimensions: string;
  finish: string;
  madeToOrder: boolean;
  leadTimeDays: number;
  images: { url: string; alt: string; width: number; height: number }[]; // ≥4 (FR-002)
  variants: {
    id: string; label: string; price: number; salePrice: number | null;
    available: number;                    // stockQty − heldQty
    lowStock: boolean; soldOut: boolean;
  }[];
  pairsWith: ProductCard[];              // FR-006
  seo: { title: string; metaDescription: string };
}

export interface AdminProductRow {       // admin table
  id: string; name: string; slug: string; status: "draft" | "published" | "archived";
  category?: { id: string; name: string };
  variants: { id: string; label: string; sku: string; price: number; salePrice: number | null;
    stockQty: number; heldQty: number; available: number; lowStockThreshold: number;
    costPrice?: number; active: boolean }[];  // costPrice owner-only
  lowStock: boolean; imageThumb?: string; updatedAt: string;
}

export interface LowStockRow {
  variantId: string; product: { id: string; name: string; slug: string };
  label: string; sku: string; available: number; lowStockThreshold: number;
  soldOut: boolean;
}

export interface ImportReport { created: number; updated: number; failed: number;
  failures: { row: number; error: string }[] }
```

### 4.3 Query Filter DTOs (admin)

```typescript
export const AdminProductQuery = z.object({
  q: z.string().trim().max(120).optional(),      // name or sku substring
  status: z.enum(["draft", "published", "archived"]).optional(),
  lowStock: z.coerce.boolean().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
```

## 5. OpenAPI 3.0 Specification (catalog slice)

```yaml
openapi: 3.0.3
info: { title: Ligera Catalog API, version: 1.0.0 }
servers: [{ url: https://app.ligera.ng }, { url: http://localhost:3000 }]
paths:
  /api/products:
    get:
      summary: Published products with filters, sort and pagination
      parameters:
        - { in: query, name: category, schema: { type: string } }
        - { in: query, name: space, schema: { type: string } }
        - { in: query, name: q, schema: { type: string, maxLength: 120 } }
        - { in: query, name: minPrice, schema: { type: integer } }
        - { in: query, name: maxPrice, schema: { type: integer } }
        - in: query
          name: sort
          schema: { type: string, enum: [newest, price-asc, price-desc, popular], default: newest }
        - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
        - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 24, default: 24 } }
      responses:
        "200":
          description: Product cards page
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { $ref: "#/components/schemas/ProductCard" } }
                  meta: { $ref: "#/components/schemas/PageMeta" }
  /api/products/{slug}:
    get:
      summary: Product detail
      parameters: [{ in: path, name: slug, required: true, schema: { type: string } }]
      responses:
        "200":
          description: Product detail
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ProductDetail" }
        "404": { $ref: "#/components/responses/Error" }
  /api/search/suggest:
    get:
      summary: Keyword suggestions
      parameters: [{ in: query, name: q, required: true, schema: { type: string } }]
      responses:
        "200":
          description: Suggestions
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    slug: { type: string }
                    name: { type: string }
                    imageUrl: { type: string }
  /api/categories:
    get:
      summary: Taxonomy
      parameters:
        - in: query
          name: type
          schema: { type: string, enum: [category, space, collection] }
      responses:
        "200":
          description: Categories
          content:
            application/json:
              schema: { type: array, items: { $ref: "#/components/schemas/Category" } }
  /api/admin/products:
    get:
      summary: Admin catalog (staff)
      security: [{ cookieAuth: [] }]
      responses:
        "200": { description: Admin rows }
        "401": { $ref: "#/components/responses/Error" }
    post:
      summary: Create product (owner)
      security: [{ cookieAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ProductUpsert" }
      responses:
        "201": { description: Created }
        "403": { $ref: "#/components/responses/Error" }
        "409": { $ref: "#/components/responses/Error" }
  /api/admin/products/{id}/status:
    patch:
      summary: Change product status (owner)
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [draft, published, archived] }
      responses:
        "200": { description: Updated }
        "409": { $ref: "#/components/responses/Error" }
  /api/admin/variants/{id}/stock:
    post:
      summary: Manual stock adjustment (staff)
      security: [{ cookieAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [change, reason]
              properties:
                change: { type: integer, description: Signed change }
                reason: { type: string, enum: [restock, damaged, sample, correction] }
                note: { type: string, maxLength: 500 }
      responses:
        "200": { description: New stock }
        "422": { $ref: "#/components/responses/Error" }
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
  schemas:
    ProductCard:
      type: object
      properties:
        id: { type: string }
        slug: { type: string }
        name: { type: string }
        priceFrom: { type: integer, description: Naira }
        badge: { type: string, enum: [in_stock, low_stock, sold_out, made_to_order] }
        imageUrl: { type: string }
        imageAlt: { type: string }
    ProductDetail:
      allOf:
        - $ref: "#/components/schemas/ProductCard"
        - type: object
          properties:
            scentNotes: { type: object }
            images: { type: array, items: { type: object } }
            variants: { type: array, items: { type: object } }
            pairsWith: { type: array, items: { $ref: "#/components/schemas/ProductCard" } }
    Category:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        slug: { type: string }
        type: { type: string, enum: [category, space, collection] }
    ProductUpsert:
      type: object
      required: [name, variants]
      properties:
        name: { type: string }
        variants:
          type: array
          items:
            type: object
            required: [label, sku, price]
            properties:
              label: { type: string }
              sku: { type: string }
              price: { type: integer }
              salePrice: { type: integer, nullable: true }
    PageMeta:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
```

*(Admin product update/duplicate/delete, variants, categories, low-stock and CSV endpoints
follow the same envelope patterns and are elided here for brevity — full field lists live in
§2 and §4 of this document, which are normative.)*
