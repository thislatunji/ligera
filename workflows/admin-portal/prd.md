# PRD Excerpt: Admin Portal, Dashboard & Settings (curated for the `admin-portal` domain)

> Source: `workflows/platform/prd.md`. Every requirement this domain owns or touches.

## Rule (§9)

Anything a customer sees or pays on the storefront is controlled from here. Nothing requires
a developer.

## Executive Dashboard (§9.2)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-010 | Headline numbers for today, last 7 and last 30 days: revenue, paid orders, average order value, with comparison to the previous period | M |
| AD-011 | Action list: orders waiting to be processed, custom requests awaiting a reply, failed or abandoned payments | M |
| AD-012 | Top-selling products and revenue by category | M |
| AD-013 | Low-stock and sold-out items, plus total stock value at cost and at selling price | M |
| AD-014 | New versus returning customers | P2 |

## Delivery Settings (§9.6)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-050 | Delivery zones with a name, fee, estimated delivery time and active switch | M |
| AD-051 | Free-delivery threshold, same-day cut-off time and blackout dates | M |
| AD-052 | Pickup option with address, hours and on/off switch | M |

## Content & Store Settings (§9.7)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-060 | Edit homepage hero, banners, announcement bar and featured collections | M |
| AD-061 | Edit Our Story, FAQs, Delivery and Returns, and policy pages | M |
| AD-062 | Business settings: store name, logo, contact email and phone, WhatsApp number, social links, opening hours | M |
| AD-063 | Edit the wording and logo in customer email templates | M |
| AD-064 | Customer list with order history, total spend and marketing consent; CSV export | M |

## Access & audit (§9.1)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-003 | Activity log of who changed prices, stock, delivery fees and settings, and when | M |
| AD-002 | Roles: Owner (full access) and Staff (orders and inventory only; no revenue, settings or pricing) | M |

## Storefront content requirements (§8.4)

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-040 | Hero banner, featured collections, brand story, Instagram gallery, newsletter signup, all editable from admin | M |
| FR-041 | Social links (Instagram, WhatsApp) and opening or response hours consistently in header, footer and Contact page | M |
| FR-050 | Privacy Policy (NDPA 2023), Terms, Returns and Refund policy, Candle Safety and care guidance | M |

## Goals & acceptance criteria

- **G3** Owner controls the whole store from admin. **G4** Executive answers in ≤ 10 seconds.
- **AC-007** Owner changes a price and a delivery zone fee; new orders use the new values.
- **AC-008** Stock reaching the threshold shows on the dashboard and emails the owner.
- **AC-009** Staff cannot see revenue figures or change prices, settings or users.

## Wireframes (§14)

**Admin Dashboard** — top row: revenue, orders, average order value for the selected period.
Below: action list, top products, low stock, revenue by category. **Settings** — delivery
zones and fees.
