# Ligera PRD (Complete Source Document)

> Input PRD for the entire workflow suite. Extracted from `Ligera_PRD.pdf` (23 pages).
> Other domain folders carry curated excerpts of this document; this file is the full source.

## 1) Problem Statement

Ligera makes handmade and custom fragrances (scented candles, reed diffusers, room sprays) and
gypsum decor (trinket plates, bowls, decorative pieces), but it has no storefront where a visitor
can browse, choose, pay and get confirmation without messaging the owner first.

Ligera needs a mobile-first website that feels as premium as the brand and takes a visitor from
first browse to a confirmed, paid order on their own. It also needs an admin portal where the
owner controls everything the customer sees (products, prices, stock, delivery fees) and gets an
executive view of how the business is performing, without developer help.

## 2) Goals & Non-Goals

Targets are starting points to recalibrate after the first 30 days of real traffic.

| # | Goal | How we measure it | Starting target |
|---|------|-------------------|-----------------|
| G1 | A visitor can buy end to end without help | First-time testers who complete a purchase unaided in UAT | 5 of 5 |
| G2 | Checkout is fast and simple | Time from cart to paid order, guest checkout, no account | ≤ 3 minutes |
| G3 | Owner controls the whole store | Items on the customer site changeable from admin | Everything in §9 |
| G4 | Owner has an executive view | Time to answer "how much did I sell this week and what is running low" | ≤ 10 seconds |
| G5 | Customers hear back promptly | Delay between payment success and confirmation email | ≤ 60 seconds |
| G6 | Stock is trustworthy | Orders placed for items that are out of stock | 0 |
| G7 | Site feels premium and loads fast on phones | Largest Contentful Paint on 4G | ≤ 2.5s |
| G8 | Owner can publish a new product quickly | Time to upload and publish one product with photos | ≤ 10 minutes |

**Non-Goals (MVP):** marketplace/multi-vendor selling; native mobile apps (mobile-first web app);
subscriptions, refills, gift cards, loyalty points; international shipping and multi-currency
(Naira only); online scent-blending configurator (custom orders are request-and-quote in MVP);
wholesale portal with tiered pricing; raw-material and production planning (Phase 2).

## 3) Target Users & Personas

1. **Home Fragrance Shopper (Primary)** — arrives from Instagram on a phone; wants to see the
   product, understand the scent and pay in minutes. Values beautiful photography, clear scent
   descriptions, transparent delivery fees, trustworthy payment step.
2. **Gift Buyer (Primary)** — buys for someone else, often with a deadline. Needs gift-ready
   options, a gift note, a clear delivery estimate and confirmation that the order is paid.
3. **Custom or Bulk Client (Secondary)** — short-let hosts, event planners, offices, boutiques:
   tailored scent, quantity or branded set. Needs a simple way to describe what they want and get
   a quote without a long chat thread.
4. **Owner / Admin (Operator)** — runs the business from phone and laptop; only/main admin portal
   user. Needs sales and stock at a glance, quick product publishing, delivery fees, acting on new
   orders without technical help.
5. **Staff (Limited, optional)** — packs and dispatches orders. Order and stock access but not
   revenue or settings.

## 4) Scope & Release Plan

Planning estimate: 4–6 weeks for the MVP.

| Phase | Storefront | Admin portal | Communications |
|---|---|---|---|
| MVP | Home, Shop by category and by space, Search, Product detail, Cart, guest Checkout, Flutterwave payment, Order confirmation and tracking, Custom order request form, Our Story, Delivery and Returns, FAQs, Contact, Policies, SEO and analytics | Secure login, executive dashboard, products and pricing, inventory with low-stock alerts, orders and statuses, delivery zones and fees, homepage and policy content, custom request inbox, CSV export | Payment-confirmed email to customer, new-order alert to owner, order status emails, custom request acknowledgement |
| Phase 2 | Customer accounts and saved addresses, back-in-stock alerts, reviews, gift wrapping add-on, second payment gateway | Raw-material inventory with reorder alerts, promo codes, scheduled sales, weight-based delivery fees, finer staff permissions, settlement and reconciliation report | WhatsApp or SMS updates, abandoned-cart emails, review request emails |

## 5) Product Catalog & Categories

| Category | What it includes | Notes |
|---|---|---|
| Scented Candles | Single-scent candles in different vessel sizes | Burn time and safety guidance on product page |
| Reed Diffusers | Diffuser with reeds in different bottle sizes | Reed set and refill sold separately in Phase 2 |
| Room & Linen Sprays | Room sprays and linen sprays | Volume shown in ml |
| Gypsum Decor | Trinket plates, bowls, decorative pieces | Fragile: packaging note and delivery note |
| Gift Sets & Bundles | Curated mixes of the categories above | Priced as one item, stock tied to components |
| Custom & Bespoke | Custom fragrances and bulk or branded orders | Request and quote flow, not a normal add-to-cart product |

**Shop by Space.** Every product can be tagged with the spaces it suits (Bedroom, Living Room,
Bathroom, Kitchen, Office, Entryway, Events). Shoppers can browse by space as well as by category,
because "fragrance for every space" is the brand idea.

**Product attributes the admin must capture:** name, description, photos, category, space tags,
scent notes (top, heart, base), size or variant, price, sale price, SKU, stock quantity, low-stock
threshold, burn time (candles), ingredients and safety information, dimensions and finish
(gypsum), made-to-order flag with lead time, status (draft, published, archived).

## 6) Information Architecture (Sitemap)

```text
Home
├── Shop
│   ├── Scented Candles
│   ├── Reed Diffusers
│   ├── Room & Linen Sprays
│   ├── Gypsum Decor (Trinket Plates, Bowls, Decorative Pieces)
│   ├── Gift Sets & Bundles
│   └── Shop by Space (Bedroom, Living Room, Bathroom, Kitchen, Office, Entryway, Events)
├── Custom Orders (request form)
├── Our Story (founder story, craft, brand values)
├── Delivery & Returns
├── FAQs
├── Contact (email, WhatsApp, Instagram, opening hours)
├── Cart → Checkout → Order Confirmation
├── Track My Order
├── Policies (Privacy, Terms, Returns, Candle Safety)
└── 404 and error pages (branded)
```

## 7) User Flows

### 7.1 Browse to paid order (guest, card or bank transfer)
1. Visitor lands on Home, sees hero and featured categories, taps "Shop".
2. Filters by category or space. Product cards show photo, name, size, price and stock badge.
3. Opens a product, reads scent notes, picks a size, taps "Add to cart". Mini-cart slides in with
   "Checkout".
4. Checkout is one page: contact details, delivery address with zone dropdown, delivery method,
   optional gift note. Delivery fee and total update immediately.
5. Visitor taps "Pay" and completes payment on Flutterwave (card, bank transfer or USSD).
6. Ligera confirms payment from Flutterwave's **server notification**, not the browser redirect.
   Order becomes Paid, stock is reduced, visitor lands on Order Confirmation.
7. Confirmation email to customer within 60 seconds; new-order alert to owner.

### 7.2 Payment fails or is abandoned
1. Order stays "Pending payment"; items held for 30 minutes.
2. No confirmation email; stock not permanently reduced.
3. After 30 minutes the hold is released and the order moves to "Abandoned". Owner sees it in a
   Failed and Abandoned view.
4. If charged but not marked Paid, owner uses "Verify payment" to re-check with Flutterwave.

### 7.3 Custom order request
1. Visitor opens Custom Orders, fills the form: space or setting, product types, scent
   preferences, quantity, budget range, event date, optional reference image, contact details.
2. Customer sees acknowledgement and receives a confirmation email; owner receives an alert.
3. Owner reviews in the admin inbox, replies with a quote, sets status (New, Quoted, Accepted,
   Declined, Completed).
4. On acceptance owner sends a payment link for the agreed amount; the paid order appears in
   Orders like any other.

### 7.4 Owner's daily routine in admin
1. Log in, open dashboard: today's sales, orders needing action, low-stock items, new custom
   requests.
2. Open each new Paid order, move to Processing, print the packing slip.
3. Mark orders Out for Delivery or Delivered; customer emailed at each step.
4. Restock or adjust inventory, publish new products, change prices or delivery fees.

### 7.5 Order status lifecycle
Nine states; pickup orders go Processing → Ready for Pickup → Delivered once collected. Customer
is emailed on Paid and each later status change (§10).

## 8) Functional Requirements: Storefront

*Phase column: M = MVP, P2 = Phase 2.*

### 8.1 Catalog, Search & Discovery

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-001 | Category pages list product cards with photo, name, size, price and stock status | M |
| FR-002 | Product page: photo gallery (≥ 4 images), description, scent notes, size selector, burn time or dimensions, ingredients and safety info, made-to-order lead time where relevant | M |
| FR-003 | Keyword search with suggestions; filters by category, space, scent family and price; sort by newest, price and popularity | M |
| FR-004 | Shop by Space: browse products by the room or setting they suit | M |
| FR-005 | Low stock and Sold out badges; sold-out items cannot be added to cart | M |
| FR-006 | "Pairs well with" suggestions on product pages | M |
| FR-007 | Back-in-stock email signup on sold-out products | P2 |
| FR-008 | Customer reviews with photos | P2 |

### 8.2 Cart & Checkout

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-010 | Add, update and remove items; mini-cart; cart persists on the device for 7 days | M |
| FR-011 | Guest checkout. No account required to buy | M |
| FR-012 | One-page checkout: contact, address, delivery method, payment. Order summary with delivery fee and total visible before paying | M |
| FR-013 | Delivery fee calculated automatically from the selected zone using admin-set fees; optional free-delivery threshold | M |
| FR-014 | Payments via Flutterwave (card, bank transfer, USSD). Pay on delivery is an admin toggle, off by default | M |
| FR-015 | Stock checked at checkout and held for 30 minutes during payment so the same item cannot be sold twice | M |
| FR-016 | Order marked Paid only after server-side payment verification, never from the browser redirect alone | M |
| FR-017 | Order Confirmation page with order number, summary and expected delivery window | M |
| FR-018 | Track My Order: order number plus email or phone shows current status | M |
| FR-019 | Gift options: gift note and "no prices on packing slip" switch | M |
| FR-020 | Promo codes | P2 |

### 8.3 Custom Orders & Support

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-030 | Custom order form: space or setting, product types, scent preferences, quantity, budget range, event date, optional reference image, contact details | M |
| FR-031 | Submission creates a request in the admin inbox and emails the owner; customer gets an acknowledgement email | M |
| FR-032 | "Chat on WhatsApp" button (support and questions only, product name pre-filled). Purchasing happens on the site | M |

### 8.4 Content, SEO & Analytics

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-040 | Hero banner, featured collections, brand story, Instagram gallery, newsletter signup, all editable from admin | M |
| FR-041 | Social links (Instagram, WhatsApp) and opening or response hours consistently in header, footer and Contact page | M |
| FR-042 | Unique title and meta description per page and product; schema.org Product and Organization markup; XML sitemap and robots.txt | M |
| FR-043 | Google Analytics 4 and Meta Pixel with AddToCart, InitiateCheckout and Purchase events | M |
| FR-044 | Open Graph and Twitter cards so shared product links show photo, name and price | M |

### 8.5 Legal & Policies

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-050 | Privacy Policy (aligned with Nigeria Data Protection Act 2023), Terms, Returns and Refund policy, Candle Safety and care guidance | M |
| FR-051 | Cookie consent banner | M |

## 9) Functional Requirements: Admin Portal & Inventory

**Rule:** anything a customer sees or pays on the storefront is controlled from here. Nothing
requires a developer.

### 9.1 Access & Roles

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-001 | Secure email and password login, password reset, optional two-factor sign-in for the Owner | M |
| AD-002 | Roles: Owner (full access) and Staff (orders and inventory only; no revenue, settings or pricing) | M |
| AD-003 | Activity log of who changed prices, stock, delivery fees and settings, and when | M |

### 9.2 Executive Dashboard

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-010 | Headline numbers for today, last 7 and last 30 days: revenue, paid orders, average order value, with comparison to previous period | M |
| AD-011 | Action list: orders waiting to be processed, custom requests awaiting reply, failed or abandoned payments | M |
| AD-012 | Top-selling products and revenue by category | M |
| AD-013 | Low-stock and sold-out items, plus total stock value at cost and at selling price | M |
| AD-014 | New versus returning customers | P2 |

### 9.3 Products, Categories & Pricing

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-020 | Create, edit, duplicate, archive products with every attribute in §5, including multiple photos with drag-to-reorder | M |
| AD-021 | Variants (e.g. size) each with own price, SKU and stock | M |
| AD-022 | Draft, Published and Archived status; publish or unpublish instantly | M |
| AD-023 | Manage categories, space tags, featured collections and gift bundles | M |
| AD-024 | Edit price and sale price per product or in bulk; CSV import and export of the catalog | M |
| AD-025 | Scheduled sale start and end dates | P2 |

### 9.4 Inventory

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-030 | Stock quantity per variant with a manual adjustment that records a reason (restock, damaged, sample, correction) and who made it | M |
| AD-031 | Stock reduces automatically when an order is paid and returns when a paid order is cancelled (owner can switch this off per order) | M |
| AD-032 | Low-stock threshold per product; alerts on the dashboard and by email | M |
| AD-033 | Made-to-order flag with lead time, so those items do not depend on stock counts | M |
| AD-034 | Raw-material inventory (wax, fragrance oils, vessels, gypsum, packaging) with reorder levels | P2 |

### 9.5 Orders, Payments & Custom Requests

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-040 | Order list with filters (order status, payment status, date, delivery zone) and search by order number, name or phone | M |
| AD-041 | Order detail: items, customer, address, gift note, payment reference, status timeline and internal notes | M |
| AD-042 | Status actions: Processing, Ready for Pickup, Out for Delivery, Delivered, Cancelled, Refunded. Each status change can email the customer | M |
| AD-043 | "Verify payment" button that re-checks an order with Flutterwave; Failed and Abandoned view | M |
| AD-044 | Printable packing slip and delivery note (with option to hide prices for gifts) | M |
| AD-045 | Export orders to CSV for accounting | M |
| AD-046 | Custom request inbox with status (New, Quoted, Accepted, Declined, Completed), notes, and a way to send a payment link for the agreed amount | M |
| AD-047 | Settlement and reconciliation report matching Flutterwave payouts to orders | P2 |

### 9.6 Delivery Settings

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-050 | Delivery zones with name, fee, estimated delivery time and active switch | M |
| AD-051 | Free-delivery threshold, same-day cut-off time and blackout dates | M |
| AD-052 | Pickup option with address, hours and on/off switch | M |
| AD-053 | Weight or fragility-based delivery fees (heavy gypsum pieces) | P2 |

### 9.7 Content & Store Settings

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-060 | Edit homepage hero, banners, announcement bar and featured collections | M |
| AD-061 | Edit Our Story, FAQs, Delivery and Returns, and policy pages | M |
| AD-062 | Business settings: store name, logo, contact email and phone, WhatsApp number, social links, opening hours | M |
| AD-063 | Edit the wording and logo in customer email templates | M |
| AD-064 | Customer list with order history, total spend and marketing consent; CSV export | M |

## 10) Notifications & Communications

Email is the MVP channel. Payment-confirmed emails go out within 60 seconds of Flutterwave
confirming payment, and are never sent for failed or abandoned payments.

| ID | Trigger | Recipient | Content | Phase |
|----|---------|----------|---------|-------|
| NT-001 | Payment confirmed | Customer | Receipt: order number, items, delivery fee, total, delivery address, expected delivery window, contact details | M |
| NT-002 | Payment confirmed | Owner | New paid order alert with order summary and link to the order in admin | M |
| NT-003 | Order set to Processing, Ready for Pickup, Out for Delivery, Delivered | Customer | Short status update with order number and, when out for delivery, the delivery contact | M |
| NT-004 | Order cancelled or refunded | Customer | What happened, refund amount and timing | M |
| NT-005 | Custom request submitted | Customer and Owner | Acknowledgement to customer, alert to owner | M |
| NT-006 | Custom request quoted | Customer | Quote summary and payment link | M |
| NT-007 | Stock at or below threshold | Owner | Product name, remaining stock | M |
| NT-008 | Payment failed or verified-after-charge mismatch | Owner | Order number and Flutterwave reference to check | M |
| NT-009 | End of day | Owner | Daily summary: orders, revenue, low stock | P2 |
| NT-010 | Cart abandoned, back in stock, review request | Customer | Marketing and engagement emails | P2 |
| NT-011 | Any of the above by WhatsApp or SMS | Customer | Same content, shorter | P2 |

**Rules for every email:** sent from a Ligera domain address with SPF, DKIM and DMARC set up;
each email sent once per event even if Flutterwave notifies twice; failed sends retried and
logged, owner can resend from the order page; branded with the Ligera logo, mobile-friendly,
plain language.

## 11) Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Usability | Guest checkout; one-page checkout; sticky "Add to cart" bar on mobile; plain-language errors that say what to fix; no dead ends after a failed payment; 5 of 5 first-time testers complete a purchase unaided in UAT |
| Mobile first | Designed from 360px width upward; thumb-friendly controls; majority of traffic from Instagram on phones |
| Performance | LCP ≤ 2.5s on 4G, CLS ≤ 0.1, total blocking time ≤ 200ms; product images compressed to WebP or AVIF and lazy-loaded; mobile product card images ≤ 150KB |
| Security | HTTPS everywhere; card details handled only by Flutterwave (nothing stored by Ligera); role-based admin access; optional two-factor for Owner; rate-limited login; admin actions logged |
| Data protection | Customer data collected only for orders and consented marketing; compliant with the Nigeria Data Protection Act 2023 |
| Reliability | 99.9% uptime target; daily automatic backups kept for 30 days; webhooks retried so a paid order is never lost |
| Scalability | Comfortable at 300 products and 20 variants per product at launch; designed to 1,000 products without slowing down |
| Accessibility | WCAG 2.1 AA: alt text on images, 4.5:1 text contrast, keyboard navigation, visible focus states |
| Localization | Naira (₦) pricing format, Nigerian phone number format, Nigerian states and areas in address fields, West Africa Time for dates and delivery cut-offs |
| Brand | Gold logo mark, warm neutral backgrounds, restrained serif typography, generous white space |
| Maintainability | Owner runs day-to-day operations with a one-page quick guide and a single training session |

## 12) Tech Stack

Ligera is built from scratch: own storefront, admin portal and backend — not Shopify, WooCommerce
or any hosted store platform. The stack below is a proposed default to confirm; an equivalent
choice is fine if §8–11 are still met.

| Layer | Proposed choice | Why |
|-------|-----------------|-----|
| Storefront and admin front end | React with Next.js and TypeScript; storefront rendered on the server; admin as a separate login-protected app | Fast first load on 4G; crawlable product pages for SEO (FR-042) |
| Backend API | Node.js with TypeScript, REST | One backend serves storefront and admin: single source of truth for stock, prices, delivery fees |
| Database | PostgreSQL | Transactions and row locking stop the last unit being sold twice (AC-005) |
| Background jobs | Job queue and scheduler | Releases 30-minute stock holds and retries failed notifications and emails (FR-015, §10) |
| Payments | Flutterwave hosted checkout (card, bank transfer, USSD) with webhook verification | Card details never reach Ligera servers; Paid only after verified confirmation (FR-016) |
| Image storage and delivery | Object storage with a CDN serving resized WebP or AVIF | Meets 150KB mobile image budget and LCP target |
| Transactional email | Resend, Postmark or SendGrid, sending from a Ligera domain with SPF, DKIM and DMARC | Payment-confirmed emails inside 60 seconds (NT-001) |
| Admin authentication | Email and password with hashed passwords, role-based access, optional two-factor for the Owner | AD-001–AD-003 |
| Hosting and backups | Managed cloud hosting, managed DB with daily backups kept 30 days, CDN edge close to West Africa | 99.9% uptime and backup targets |
| Monitoring | Error tracking, uptime checks and alerts to the build team | Failed payment notifications and slow pages caught before customers report them |
| Analytics | Google Analytics 4 and Meta Pixel | Conversion tracking (FR-043) |

**What building from scratch adds:** no overselling (stock holds need transactions and a job
that releases expired holds — AC-003, AC-005); payment confirmation (the notification handler must
check the notification really came from Flutterwave, re-verify the transaction, and be safe to
receive twice without updating the order or emailing twice — AC-001, AC-002, AC-004); admin
security (every admin action checks the user's role and is written to the activity log); features
a hosted store would supply (cart, order tracking page, packing slips, CSV exports, sitemap,
structured data, cookie banner, sales dashboard); recovery (restore from backup is tested before
launch).

> **Interview overrides (D1–D11, see `workflows/README.md` §1):** this build uses a single
> fullstack **Next.js App Router** app (SSR storefront + REST route handlers) with **MongoDB
> Atlas** (atomic single-document stock semantics replace row locks), **Flutterwave payment
> links**, **Cloudinary** image CDN, **Resend** email, and an in-process **node-cron**
> scheduler. These are equivalent choices that still satisfy §8–11.

## 13) Integrations

| Integration | Purpose |
|-------------|---------|
| Flutterwave | Card, bank transfer and USSD payments; server-side payment confirmation (webhook); payment links for custom orders; refunds |
| Transactional email service | Payment-confirmed, status and alert emails |
| WhatsApp (click-to-chat) | Questions and support from product and contact pages |
| Google Analytics 4 and Meta Pixel | Traffic and conversion tracking, Instagram ad optimisation |
| Google Maps | Only if pickup is offered |

## 14) Page-Level Wireframe Notes (MVP)

**Home** — announcement bar (delivery or launch message), hero with brand image and "Shop Now";
category tiles and a "Shop by Space" row; best sellers and a featured gift set; brand story
teaser with craft imagery; Instagram gallery of 3–6 posts; footer: contact, WhatsApp, social
links, policies, newsletter signup.

**Shop / Category page** — filters (category, space, scent family, price) and sort (newest, price,
popular). Product cards two per row on mobile; pagination of 24 or fewer per page.

**Product page** — photo gallery, name, price, size selector, stock status. Scent notes shown as
top, heart, base; burn time or dimensions; ingredients and safety information. Quantity, "Add to
cart" (sticky on mobile), "Chat on WhatsApp". Delivery information snippet (zones, fees,
estimated times); "Pairs well with" suggestions.

**Cart and Checkout** — mini-cart with running total. One-page checkout in this order: contact,
address and zone, delivery method and gift note, payment. Order summary with delivery fee visible
before payment.

**Custom Orders** — short intro, the request form from FR-030, expected response time.

**Admin Dashboard** — top row: revenue, orders, average order value for the selected period.
Below: action list, top products, low stock, revenue by category.

**Products and Inventory** — table with photo, name, price, stock and status; inline stock edit;
quick filters for low stock and drafts. Product editor in sections: basics, photos, pricing and
variants, stock, scent and space details, SEO.

**Orders** — filterable list; order detail with status buttons, timeline, packing slip and
"Verify payment".

**Settings** — delivery zones and fees.

## 15) Data Model (MVP) — minimum the database design must cover

| Entity | Key fields |
|--------|-----------|
| Product | id, name, slug, description, images[], categoryId, spaceTags[], scentNotes (top, heart, base), ingredients, safetyInfo, burnTime, dimensions, madeToOrder, leadTimeDays, status (draft, published, archived), seo |
| Variant | id, productId, label (e.g. size), sku, price, salePrice, stockQty, lowStockThreshold, weight |
| Category / Collection | id, name, slug, type (category, collection, space), parentId |
| Customer | id, name, email, phone, addresses[], marketingConsent, createdAt |
| Order | id, orderNumber, customerId, items[{variantId, name, price, qty}], subtotal, deliveryFee, discount, total, deliveryMethod, deliveryZoneId, deliveryAddress, giftNote, hidePrices, status, paymentStatus, statusTimeline[], internalNotes |
| Payment | id, orderId, provider, reference, amount, status, verifiedAt, rawEvent |
| DeliveryZone | id, name, fee, etaText, active; plus store-level freeDeliveryThreshold, cutOffTime, blackoutDates[] |
| CustomRequest | id, customerContact, spaceOrSetting, productTypes[], scentPreferences, quantity, budgetRange, eventDate, referenceImage, status, quoteAmount, notes |
| StockAdjustment | id, variantId, change, reason, userId, createdAt |
| NotificationLog | id, type, recipient, orderId, sentAt, status, retryCount |
| User (Admin / Staff) | id, name, email, role, passwordHash (if custom), twoFactorEnabled, lastLoginAt |
| ActivityLog | id, userId, action, entity, before, after, createdAt |
| Setting | key, value (business details, hours, WhatsApp number, social links, email templates) |

## 16) Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | A guest adds three different products to the cart, enters a Lagos address, selects a delivery zone and pays through Flutterwave. The order appears in admin within 10 seconds with correct subtotal, delivery fee, total and status Paid |
| AC-002 | The customer's confirmation email arrives within 60 seconds of payment success and shows order number, items, totals, delivery address and delivery window. The owner receives a new-order alert at the same time |
| AC-003 | A failed or abandoned payment never produces a confirmation email, never leaves the order as Paid, and releases held stock within 30 minutes |
| AC-004 | If a customer is charged but the order is not marked Paid, the owner can press "Verify payment" and the order corrects itself |
| AC-005 | Two customers try to buy the last unit at the same time. One order succeeds and the other sees a sold-out message before paying |
| AC-006 | The owner uploads a new product with 4 photos, two sizes, scent notes and space tags, publishes it, and it appears in its category, in Shop by Space and in search without developer help |
| AC-007 | The owner changes a product price and a delivery zone fee. New orders use the new values, existing orders keep theirs |
| AC-008 | When stock reaches the low-stock threshold, the item shows on the dashboard and the owner receives an email |
| AC-009 | A Staff user can see and process orders and inventory but cannot see revenue figures or change prices, settings or users |
| AC-010 | A custom order request appears in the admin inbox, the owner and customer receive emails, and the owner can send a payment link after quoting |
| AC-011 | On a 390px-wide phone, product cards show two per row with images of 150KB or less loaded lazily; Home and Product pages reach LCP of 2.5s or less on throttled 4G |
| AC-012 | Every product page has a unique title and description and passes the Rich Results Test for Product markup |
| AC-013 | Every image has alt text; text contrast is at least 4.5:1; a keyboard-only user can complete checkout |
| AC-014 | Five first-time testers each complete a purchase unaided in UAT |

## 17) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Handmade stock is limited and the same item is sold twice | Stock check and 30-minute hold at checkout; low-stock thresholds; made-to-order flag with lead times |
| Customer charged on Flutterwave but the order never shows as Paid | Server-side payment confirmation with retries; "Verify payment" button; owner alert on mismatch (NT-008); weekly payout reconciliation |
| Emails land in spam | Domain authentication (SPF, DKIM, DMARC); send from a Ligera address; test with major inbox providers before launch |
| Payment account approval or integration delays launch | Apply for the live Flutterwave account early and build against test mode; run AC-001–AC-004 before launch |

## 18) Launch Checklist

- Technology stack confirmed and a staging environment ready (§12).
- Domain connected, SSL active, business email created.
- Flutterwave account approved and live; test payments passed (success, failure, abandoned).
- Payment webhook verified: a paid order is marked Paid and the confirmation email arrives
  within 60 seconds.
- Email domain authentication (SPF, DKIM, DMARC) set up; test emails received in major inboxes.
- Delivery zones, fees, cut-off time and pickup settings configured.
- All products loaded with photos, scent notes, prices, stock and low-stock thresholds.
- Privacy, Terms, Returns and Candle Safety pages published.
- GA4 and Meta Pixel firing; AddToCart, InitiateCheckout and Purchase verified.
- Image compression and lazy-loading confirmed; Core Web Vitals checked on a real phone on 4G.
- 404 and error pages branded; sitemap submitted to Google Search Console.
- Admin roles and Owner two-factor set; backups confirmed.
- UAT with 10–20 products and 3 real test orders, including one failed payment and one custom
  request.
- Five first-time testers complete a purchase unaided.
- Owner trained on dashboard, products, inventory, orders and delivery settings; quick guide
  handed over.
