# PRD Excerpt: Notifications (curated for the `notifications` domain)

> Source: `workflows/platform/prd.md`. Every requirement this domain owns or touches.

## Section 10 — Notifications & Communications (complete)

Email is the MVP channel. Payment-confirmed emails go out within 60 seconds of Flutterwave
confirming the payment, and are **never** sent for failed or abandoned payments.

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

**Rules for every email:**
1. Sent from a Ligera domain address with **SPF, DKIM and DMARC** set up so messages reach
   the inbox.
2. Each email is **sent once per event** even if Flutterwave notifies twice.
3. A **failed send is retried and logged**; the owner can **resend from the order page**.
4. Branded with the Ligera logo, mobile-friendly, plain language.

## Supporting requirements elsewhere

- **G5** Customers hear back promptly — delay between payment success and confirmation email
  ≤ 60 seconds.
- **AC-002** Confirmation email within 60 seconds of payment success with order number,
  items, totals, delivery address, delivery window; owner alert at the same time.
- **AC-003** Failed/abandoned payments never produce a confirmation email.
- **AD-063** Edit the wording and logo in customer email templates.
- **§12** Transactional email: Resend/Postmark/SendGrid sending from a Ligera domain with
  SPF/DKIM/DMARC — payment-confirmed emails inside 60 seconds (NT-001). *(Interview D6:
  Resend.)*
- **§11 Data protection:** customer data used only for orders and consented marketing (NDPA
  2023).
