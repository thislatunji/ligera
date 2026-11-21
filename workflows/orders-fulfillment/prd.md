# PRD Excerpt: Orders & Fulfillment (curated for the `orders-fulfillment` domain)

> Source: `workflows/platform/prd.md`. Every requirement this domain owns or touches.

## Owner's daily routine (§7.4)

1. Log in, open the dashboard: today's sales, orders needing action, low-stock items, new
   custom requests.
2. Open each new Paid order, move it to Processing, print the packing slip.
3. Mark orders Out for Delivery or Delivered; customer emailed at each step.
4. Restock or adjust inventory, publish products, change prices or fees as needed.

## Order status lifecycle (§7.5)

Nine states; pickup orders go Processing → Ready for Pickup → Delivered once collected. The
customer is emailed on Paid and at each later status change (§10).

## Storefront requirements

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-017 | Order Confirmation page with order number, summary and expected delivery window | M |
| FR-018 | Track My Order: order number plus email or phone shows current status | M |

## Admin requirements (§9.5)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-040 | Order list with filters (order status, payment status, date, delivery zone) and search by order number, name or phone | M |
| AD-041 | Order detail: items, customer, address, gift note, payment reference, status timeline and internal notes | M |
| AD-042 | Status actions: Processing, Ready for Pickup, Out for Delivery, Delivered, Cancelled, Refunded. Each status change can email the customer | M |
| AD-043 | "Verify payment" button that re-checks an order with Flutterwave; Failed and Abandoned view | M |
| AD-044 | Printable packing slip and delivery note (with option to hide prices for gifts) | M |
| AD-045 | Export orders to CSV for accounting | M |
| AD-031 | Stock returns when a paid order is cancelled (owner can switch this off per order) | M |

## Notifications slice (§10)

- **NT-003** Order set to Processing, Ready for Pickup, Out for Delivery, Delivered → Customer:
  short status update with order number and, when out for delivery, the delivery contact.
- **NT-004** Order cancelled or refunded → Customer: what happened, refund amount and timing.

## Tech stack slice (§12)

Webhooks retried so a paid order is never lost. Refunds via Flutterwave.

## Acceptance criteria

- **AC-004** If a customer is charged but the order is not marked Paid, the owner can press
  "Verify payment" and the order corrects itself.
- **AC-007** Owner changes prices/fees; new orders use the new values, existing orders keep
  theirs.
- **AC-009** Staff can see and process orders and inventory but cannot see revenue figures or
  change prices, settings or users.

## Non-functional slice (§11)

Plain-language errors; mobile-first admin (owner works from a phone and laptop); admin actions
logged; role-based access.
