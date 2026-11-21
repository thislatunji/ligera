# Universal Workflow Document Templates

These templates define the canonical structure of files generated in `workflow/`. When drafting, adapt all code blocks, type definitions, and DTOs to the repository's detected language, framework, ORM, and conventions.

---

## 1. `workflow/specs.md` Structure

```markdown
# Technical Specification: <Feature Name>

## 1. Executive Summary & Architecture Overview
- Problem statement, user goals, and functional scope based on the PRD.
- Architectural design pattern, security controls, and authorization mechanisms.

## 2. Feature Flowchart & Infrastructure Integration (Mermaid)
- Mandatory Mermaid flowchart (`flowchart TD` or `flowchart LR`) capturing complete end-to-end data flow and how the feature connects into existing infrastructure:
  - **Data Flow & Lifecycle:** Ingress/client payloads, validation gates, decision diamonds, service orchestration, state transitions, and egress responses.
  - **Infrastructure Integration:** Direct touchpoints with existing tables/databases, message queues/event brokers (e.g. SQS, Kafka, RabbitMQ), cache layers (Redis), shared microservices/internal APIs, and third-party vendors.
  - **Error & Edge Handling:** Failure branches, rollback/dead-letter mechanisms, and terminal success/error states.

## 3. Architecture & Data Modeling
### 3.1 Entity Relationship Diagram (Mermaid)
- Entity diagram visualizing relationships, cardinalities, foreign keys, and primary keys.

### 3.2 Database Schemas (DDL & ORM Entities)
- Native database DDL (SQL) tailored to the project's dialect (Postgres, MySQL, etc.) with collation, types, constraints, and indexes.
- Complete entity definitions using the project's native ORM (TypeORM, Prisma, SQLAlchemy, GORM, Hibernate, etc.).

### 3.3 Idempotent Database Migrations
- Executable forward migration script (`migrations/<timestamp>-<name>.<sql/ts>`).
- Executable rollback migration script.

### 3.4 Indexing Strategy & Query Optimization
- Index definitions (composite, unique, partial/filtered) mapped to critical query patterns.
- Read/write performance and lock impact analysis.

### 3.5 Data Access Patterns, Concurrency & Atomicity Boundaries
- Transaction boundary definitions (ACID isolation).
- Concurrency protection: row-level locking (e.g. `SELECT FOR UPDATE` / pessimistic lock) or optimistic version check to eliminate race conditions.
- Programmatic governance rules (e.g., Maker-Checker self-approval prohibition).

## 4. API Architecture & Contracts Summary
- Protocol, Base URL, Authentication Guard/Middleware, Scope.
- Endpoints summary table (Method, Path, Summary, Auth & Scope).

## 5. Verification & Testing Strategy
- Test methodology aligned with the repo's test framework (Unit, Integration, E2E).
```

---

## 2. `workflow/api-contract.md` Structure

```markdown
# API Contract & Schema Specification: <Feature Name>

## 1. Global Overview
- Protocol, Base URL, Content-Types, Auth Guards, Rate Limits.
- Codebase Response Envelope Format (success and error response wrapper structures).

## 2. Endpoints Matrix
| Method | Path | Summary | Auth & Scope | Request Body | Success Code |

## 3. Error Handling & HTTP Status Codes
- Error condition table mapping business exceptions to HTTP status codes (400, 401, 403, 404, 409, 422) and JSON error response structures.

## 4. Type-Safe Schemas & DTO Code Definitions
- Written in the repo's schema/DTO language (TypeScript class-validator/Zod, Python Pydantic, Go structs, etc.):
  - 4.1 Client Request DTOs: validated input payload from the HTTP client.
  - 4.2 Extended Service DTOs: internal service payloads appending trusted server-injected metadata (e.g., actor ID, session timestamp).
  - 4.3 Query Filter DTOs: pagination, sorting, search, and date range parameters.

## 5. Complete OpenAPI 3.0 (Swagger) Specification
- Syntactically valid YAML OpenAPI 3.0.3 specification covering paths, parameters, request bodies, responses, and security schemes.
```

---

## 3. `workflow/steps.md` Structure

```markdown
# Business Logic & Endpoint Execution Steps

All endpoints accept JSON (`application/json`) or specified encoding.

| Method | Path | Summary | Auth & Scope |

Expected Flow per Endpoint:
- Step 1: Authentication & Context Extraction (Auth guard, user extraction, param parsing).
- Step 2: Entity Existence & Pre-condition Validation (Scope checks, eligibility checks).
- Step 3: Payload Processing & Diff Calculation (Comparison of incoming data against live state).
- Step 4: Storage & External Integrations (File storage uploads, third-party API calls).
- Step 5: Atomic Database Persistence (Transaction execution, record writes, immutable audit log creation).
- Step 6: Asynchronous Triggers & Events (Domain events, message queues, analytics tracking).
- Step 7: Response Formatting (Returning strict payload without leaking unneeded internal data).
```

---

## 4. `workflow/implementation.md` Structure

```markdown
# Step-by-Step TDD Implementation Plan

## 1. TDD Strategy & Execution Principles
- Strict endpoint-by-endpoint cycle: Red (failing test) → Green (minimum implementation) → Verify (pass) → Refactor.
- Test runner conventions matching the repository (Vitest, Jest, PyTest, Go test).
- Mocking standards for dependencies (repositories, external services).

## 2. Target File Structure
- Planned files, directories, DTOs, controllers, services, and test files.

## 3. Phase 0: Module Foundation & Schema Setup
- Step 0.1: Database entities and migration execution.
- Step 0.2: Module skeleton and dependency injection wiring.

## 4. Phase 1 to N: Endpoint-by-Endpoint TDD Lifecycle
### Phase X: Endpoint X — <Method> <Path>
- Business Logic Summary.
- Step X.1 [RED]: Write Service Unit Tests asserting all business rules, edge cases, and error codes.
- Step X.2 [RED]: Write Controller/Route Unit Tests verifying parameter parsing and delegation.
- Step X.3 [GREEN]: Write the minimum code (DTOs, Service logic, Controller handler) to make all tests pass.
- Step X.4 [VERIFY]: Run test suite command and confirm PASS.

## Final Phase: Refactoring, Code Quality & Verification Checklist
- Full test suite run (`npm test` / `pnpm test` / `pytest` / `go test`).
- Test coverage check (aiming for ≥ 80% coverage on new logic).
- Linter and formatter execution.
- Security verification (confirming no raw credentials, unmasked PII, or security bypasses).
```
