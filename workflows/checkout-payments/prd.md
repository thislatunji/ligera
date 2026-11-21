# PRD Excerpt: Checkout & Payments (curated for the `checkout-payments` domain)

> Source: `workflows/platform/prd.md`. Every requirement this domain owns or touches.

## User flows (§7)

### 7.1 Browse to paid order (guest, card or bank transfer)
1. Visitor lands on Home, sees hero and featured categories, taps "Shop".
2. Filters by category or space; cards show photo, name, size, price and stock badge.
3. Opens a product, reads scent notes, picks a size, taps "Add to cart". Mini-cart slides in
   with "Checkout".
4. Checkout is one page: contact details, delivery address with a zone dropdown, delivery
   method, optional gift note. The delivery fee and total update immediately.
5. Visitor taps "Pay" and completes payment on Flutterwave (card, bank transfer or USSD).
6. Ligera confirms the payment from Flutterwave's **server notification**, not the browser
   redirect. The order becomes Paid, stock is reduced, and the visitor lands on the Order
   Confirmation page.
7. Confirmation email to the customer within 60 seconds; new-order alert to the owner.

### 7.2 Payment fails or is abandoned
1. Order stays "Pending payment"; items held for 30 minutes.
2. No confirmation email; stock not permanently reduced.
3. After 30 minutes the hold is released and the order moves to "Abandoned". The owner sees
   it in a Failed and Abandoned view.
4. If charged but not marked Paid, the owner uses "Verify payment" to re-check with
   Flutterwave.

## Storefront requirements (§8.2)

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
| FR-019 | Gift options: gift note and "no prices on packing slip" switch | M |

## Notifications slice (§10)

- **NT-001** Payment confirmed → Customer: receipt with order number, items, delivery fee,
  total, delivery address, expected delivery window, contact details — within 60 seconds.
- **NT-002** Payment confirmed → Owner: new paid order alert with summary and admin link.
- **NT-008** Payment failed or verified-after-charge mismatch → Owner: order number and
  Flutterwave reference to check.

## Admin/transport slice

- **AD-031** Stock reduces automatically when an order is paid and returns when a paid order
  is cancelled (owner can switch off per order — orders-fulfillment domain executes the
  return).
- **AD-051** Free-delivery threshold, same-day cut-off time, blackout dates.
- **AD-052** Pickup option with address, hours and on/off switch.

## Tech stack slice (§12)

- **Payments:** Flutterwave hosted checkout (card, bank transfer, USSD) with webhook
  verification — card details never reach Ligera; an order is Paid only after verified
  confirmation (FR-016). Payment links for custom orders.
- **Background jobs:** job queue/scheduler releases 30-minute stock holds and retries failed
  notifications (FR-015, §10).
- **What building from scratch adds:** payment confirmation must check the notification really
  came from Flutterwave, re-verify the transaction with Flutterwave, and be safe to receive
  twice without updating the order or emailing twice (AC-001/002/004); stock holds need
  transactions and a job that releases expired holds (AC-003/005).

## Wireframes (§14)

**Cart and Checkout** — mini-cart with running total. One-page checkout in this order: contact,
address and zone, delivery method and gift note, payment. Order summary with delivery fee
visible before payment.

## Acceptance criteria

- **AC-001** Guest buys three products, Lagos address, zone selected, pays through Flutterwave;
  order appears in admin within 10 seconds with correct subtotal, delivery fee, total, Paid.
- **AC-002** Confirmation email within 60 seconds with order number, items, totals, address,
  delivery window; owner alert at the same time.
- **AC-003** Failed/abandoned payment never produces a confirmation email, never leaves the
  order Paid, releases held stock within 30 minutes.
- **AC-005** Two customers buy the last unit simultaneously; one succeeds, the other sees
  sold-out before paying.
- **AC-007** Owner changes a product price and a zone fee: new orders use new values,
  existing orders keep theirs.

## Non-functional slice (§11)

Guest checkout; one-page checkout; plain-language errors that say what to fix; no dead ends
after a failed payment; mobile-first 360px; Naira format; Nigerian states/areas in address
fields; WAT for cut-offs.
