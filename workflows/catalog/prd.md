# PRD Excerpt: Catalog (curated for the `catalog` domain)

> Source: `workflows/platform/prd.md` (complete PRD). This excerpt gathers every requirement
> the catalog domain owns or touches.

## Product Catalog & Categories (§5)

| Category | What it includes | Notes |
|---|---|---|
| Scented Candles | Single-scent candles in different vessel sizes | Burn time and safety guidance on product page |
| Reed Diffusers | Diffuser with reeds in different bottle sizes | Reed set and refill sold separately in Phase 2 |
| Room & Linen Sprays | Room sprays and linen sprays | Volume shown in ml |
| Gypsum Decor | Trinket plates, bowls, decorative pieces | Fragile: packaging note and delivery note |
| Gift Sets & Bundles | Curated mixes of the categories above | Priced as one item, stock tied to the components |
| Custom & Bespoke | Custom fragrances and bulk or branded orders | Request and quote flow, not a normal add-to-cart product |

**Shop by Space** — products tagged with spaces (Bedroom, Living Room, Bathroom, Kitchen,
Office, Entryway, Events); browse by space and by category.

**Admin must capture per product:** name, description, photos, category, space tags, scent notes
(top, heart, base), size or variant, price, sale price, SKU, stock quantity, low-stock threshold,
burn time (candles), ingredients and safety information, dimensions and finish (gypsum),
made-to-order flag with lead time, status (draft, published, archived).

## Sitemap slice (§6)

`Shop` (Scented Candles, Reed Diffusers, Room & Linen Sprays, Gypsum Decor, Gift Sets &
Bundles) · `Shop by Space` · product detail pages.

## Storefront requirements (§8.1)

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-001 | Category pages list product cards with photo, name, size, price and stock status | M |
| FR-002 | Product page: photo gallery (≥ 4 images), description, scent notes, size selector, burn time or dimensions, ingredients and safety info, made-to-order lead time where relevant | M |
| FR-003 | Keyword search with suggestions; filters by category, space, scent family and price; sort by newest, price and popularity | M |
| FR-004 | Shop by Space: browse products by the room or setting they suit | M |
| FR-005 | Low stock and Sold out badges; sold-out items cannot be added to cart | M |
| FR-006 | "Pairs well with" suggestions on product pages | M |

## Admin requirements (§9.3, §9.4)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-020 | Create, edit, duplicate, archive products with every attribute in §5, including multiple photos with drag-to-reorder | M |
| AD-021 | Variants (e.g. size) each with own price, SKU and stock | M |
| AD-022 | Draft, Published and Archived status; publish or unpublish instantly | M |
| AD-023 | Manage categories, space tags, featured collections and gift bundles | M |
| AD-024 | Edit price and sale price per product or in bulk; CSV import and export of the catalog | M |
| AD-030 | Stock quantity per variant with a manual adjustment that records a reason (restock, damaged, sample, correction) and who made it | M |
| AD-031 | Stock reduces automatically when an order is paid and returns when a paid order is cancelled (owner can switch this off per order) | M |
| AD-032 | Low-stock threshold per product; alerts on the dashboard and by email | M |
| AD-033 | Made-to-order flag with lead time, so those items do not depend on stock counts | M |

## Goals

- **G6** Stock is trustworthy — orders placed for out-of-stock items: 0.
- **G8** Owner publishes a new product with photos in ≤ 10 minutes.

## Acceptance criteria

- **AC-006** Owner uploads a product with 4 photos, two sizes, scent notes and space tags,
  publishes it, and it appears in its category, Shop by Space and search without developer help.
- **AC-007** Owner changes a product price; new orders use the new value, existing orders keep
  theirs (order items snapshot prices — checkout-payments domain).
- **AC-011** 390px phone: product cards two per row, images ≤ 150KB lazy-loaded; LCP ≤ 2.5s.
- **AC-012** Every product page has unique title/description and passes the Rich Results Test
  for Product markup.

## Wireframes (§14)

**Shop / Category page** — filters (category, space, scent family, price), sort (newest, price,
popular); cards two per row on mobile; pagination of ≤ 24 per page.
**Product page** — photo gallery, name, price, size selector, stock status; scent notes top,
heart, base; burn time or dimensions; ingredients/safety; quantity; "Add to cart" sticky on
mobile; "Chat on WhatsApp"; delivery snippet; "Pairs well with".
**Products and Inventory (admin)** — table with photo, name, price, stock, status; inline stock
edit; quick filters for low stock and drafts. Product editor sections: basics, photos, pricing and
variants, stock, scent and space details, SEO.

## Non-functional slice (§11)

Mobile-first 360px; images WebP/AVIF ≤ 150KB on mobile cards (Cloudinary `f_auto,q_auto`);
alt text on every image; 4.5:1 contrast; keyboard navigation; WCAG 2.1 AA; comfortable at 300
products × 20 variants, designed for 1,000; warm-neutral premium brand (gold mark, serif
display, generous space).
