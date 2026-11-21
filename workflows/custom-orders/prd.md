# PRD Excerpt: Custom Orders (curated for the `custom-orders` domain)

> Source: `workflows/platform/prd.md`. Every requirement this domain owns or touches.

## User flow (§7.3)

1. Visitor opens Custom Orders and fills the form: space or setting, product types, scent
   preferences, quantity, budget range, event date, optional reference image, contact details.
2. Customer sees an acknowledgement and receives a confirmation email; owner receives an alert.
3. Owner reviews the request in the admin inbox, replies with a quote and sets the status
   (New, Quoted, Accepted, Declined, Completed).
4. On acceptance the owner sends a payment link for the agreed amount, and the paid order
   appears in Orders like any other.

## Storefront requirements (§8.3)

| ID | Requirement | Phase |
|----|-------------|-------|
| FR-030 | Custom order form: space or setting, product types, scent preferences, quantity, budget range, event date, optional reference image, contact details | M |
| FR-031 | Submission creates a request in the admin inbox and emails the owner; the customer gets an acknowledgement email | M |

## Admin requirements (§9.5)

| ID | Requirement | Phase |
|----|-------------|-------|
| AD-046 | Custom request inbox with status (New, Quoted, Accepted, Declined, Completed), notes, and a way to send a payment link for the agreed amount | M |

## Notifications slice (§10)

- **NT-005** Custom request submitted → Customer *and* Owner: acknowledgement to customer,
  alert to owner.
- **NT-006** Custom request quoted → Customer: quote summary and payment link.

## Wireframe (§14)

**Custom Orders** — short intro, the request form from FR-030, expected response time.

## Acceptance criteria

- **AC-010** A custom order request appears in the admin inbox, the owner and customer
  receive emails, and the owner can send a payment link after quoting.

## Non-functional slice (§11)

Mobile-first form (thumb-friendly), optional reference image upload (Cloudinary signed direct
upload), plain-language errors, NDPA-consented data use only.
