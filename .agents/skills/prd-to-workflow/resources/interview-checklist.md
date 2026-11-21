# Universal PRD-to-Workflow Interview Checklist

This checklist contains the universal question bank used during Phase 2 of the `prd-to-workflow` skill. Evaluate the PRD against each category, adapt to the repository's detected architecture, and ask only the questions relevant to unresolved ambiguities.

---

## 1. API Architecture, Protocols & Payloads
- **Endpoint Structure & Paths:**
  - What are the root route prefixes (e.g. `/api/v1/...`, `/admin/...`, `/internal/...`)?
  - Should the resource be scoped to a parent entity (e.g. `/:tenantId/...`, `/:merchantId/...`, `/:orgId/...`) or global?
- **Decision & State Mutation Endpoints:**
  - For approval/rejection or multi-state workflows: Is a single state-mutation endpoint preferred (e.g. `PATCH /requests/:id` passing `{ "status": "Approve" | "Decline" }`), or separate dedicated sub-resource endpoints (`POST /requests/:id/approve`, `POST /requests/:id/reject`)?
- **Payload Serialization & Uploads:**
  - For file/document uploads: Does the client send JSON with base64-encoded strings, multipart form-data streams (`multipart/form-data`), or pre-signed direct upload URLs (S3/GCS)?
  - What are the accepted file formats (PDF, JPEG, PNG, etc.) and file size limits?

---

## 2. Authentication, Authorization & Maker-Checker Governance
- **Guard / Middleware & Roles:**
  - What authentication mechanism protects these endpoints (JWT bearer token, API keys, session cookie)?
  - What role-based access controls (RBAC) or permissions apply (e.g. SuperAdmin, Maker, Checker, Member)?
- **Maker-Checker Dual Control:**
  - Is Maker-Checker enforced for state transitions (e.g., an actor cannot approve or resolve their own request)?
  - What should happen if the maker attempts self-approval (HTTP 403 Forbidden with specific message)?
- **Actor Identity & Audit Logging:**
  - What actor metadata must be captured on request initiation (e.g., `requested_by`, name, email, IP address)?
  - What actor metadata must be captured on resolution (e.g., `resolved_by`, resolver name)?
  - Must changes be recorded in an append-only audit trail table/collection?

---

## 3. Data Modeling, Schema & Storage
- **Entity Lifecycle & Status State Machine:**
  - What are the valid statuses and transitions (e.g., `Pending` $\rightarrow$ `Approved` / `Rejected` / `Cancelled`)?
  - Can a resolved or rejected request be re-opened, or must a new request be initiated?
- **Staging vs. Live Mutation:**
  - When a change request is created, does it write directly to the target record, or is it staged in a request table until approved?
  - Does the request entity store snapshots of the previous state, proposed state, and diff for audit inspection?
- **Database Constraints & Indexes:**
  - What unique constraints or compound indexes are required (e.g., blocking duplicate pending requests for the same entity)?
  - What soft-delete (`deleted_at`) or cascade-delete behaviors are expected?

---

## 4. Business Logic, Validation Rules & Edge Cases
- **Domain Pre-conditions:**
  - Are certain operations conditional on existing profile states (e.g., restricted to verified/registered businesses, or active subscription tiers)?
  - What happens if a requested entity is missing or belongs to a different tenant/organization (HTTP 404)?
- **Empty / No-op Edits:**
  - If a user submits an update where no fields actually changed, should the system reject it with HTTP 400 (`No changes detected`), or accept it silently?
- **First-time Submissions vs. Subsequent Updates:**
  - Does the first submission trigger a lifecycle transition (e.g. moving entity state from `DRAFT` to `Awaiting Review`), while subsequent submissions keep existing live state intact until approved?

---

## 5. Concurrency, Atomicity & Reliability
- **Race Condition Prevention:**
  - When multiple checkers review simultaneously, how should race conditions be prevented (database row-level lock like `SELECT ... FOR UPDATE`, optimistic locking with version column, or distributed lock)?
- **Transaction Isolation:**
  - What writes must be executed atomically inside a single ACID transaction (e.g., updating request status + applying live profile updates + inserting audit log entry)?

---

## 6. Asynchronous Events & External Integrations
- **Domain Events & Message Queues:**
  - Should domain events be published (e.g., via Kafka, RabbitMQ, SQS, Redis Pub/Sub) upon creation, approval, or rejection?
- **Customer Notifications & Tracking:**
  - Are email, SMS, or in-app notifications triggered for either the maker or the end-customer upon status resolution?
  - What analytics or Customer Data Platform (CDP) tracking events should be logged (e.g., `REQUEST_CREATED`, `REQUEST_APPROVED`), and what attributes are required?
