---
name: prd-to-workflow
description: >-
  Universal engineering specification generator. Transforms any product
  requirement document (PRD) into complete, codebase-tailored engineering
  workflow specifications. Analyzes the current repository's stack, framework,
  and architecture, conducts an interactive architectural interview to clarify
  requirements, and drafts specs.md, api-contract.md, steps.md, and
  implementation.md in the workflow folder following TDD methodology.
---

# Universal PRD to Workflow Specification Skill

Use this skill in **any repository or codebase** to transform a Product Requirements Document (`prd.md` or any requirement specification) into a comprehensive, production-ready engineering workflow suite in the `workflow/` folder.

This skill is **100% stack-agnostic**: it autonomously inspects the host repository's programming language, framework, ORM, database dialect, testing suite, and architectural conventions before drafting specifications.

---

## Output Suite (`workflow/`)

```
workflow/
├── prd.md               # User-supplied Product Requirements Document (input)
├── specs.md             # Architecture, Feature Flowchart, Data Models, Migrations, ERD & Transactional Boundaries
├── api-contract.md      # Endpoints, Type-Safe DTOs/Schemas, Error Codes & OpenAPI 3.0 YAML
├── steps.md             # Endpoint-by-endpoint Pseudocode & Concrete Business Logic Flow
└── implementation.md    # Endpoint-by-endpoint Red → Green → Verify TDD Plan matching repo test runner
```

---

## Execution Lifecycle (4 Phases)

```
[1. Repo & PRD Reconnaissance]
         │
         ▼
[2. Interactive Architectural Interview] ──► Clarify ambiguities & align with user
         │
         ▼
[3. Draft Workflow Specifications]       ──► specs.md, api-contract.md, steps.md, implementation.md
         │
         ▼
[4. Quality & Cross-Consistency Audit]   ──► Verify alignment & present next steps
```

---

## Detailed Phase Instructions

### Phase 1: Repo Reconnaissance & PRD Analysis

Before asking questions or drafting files, inspect the repository to discover its architectural DNA:

1. **Detect Tech Stack & Framework:**
   - **Node / TypeScript / JavaScript:** Check `package.json` for NestJS, Express, Fastify, Next.js, Koa, Hono, etc.
   - **Python:** Check `pyproject.toml`, `requirements.txt`, `Pipfile` for FastAPI, Django, Flask, etc.
   - **Go:** Check `go.mod` for Gin, Echo, Chi, Fiber, standard library, etc.
   - **Java / Kotlin:** Check `pom.xml`, `build.gradle` for Spring Boot, Micronaut, Quarkus, etc.
   - **Rust / PHP / Ruby / C#:** Inspect relevant package manifests.

2. **Detect Database, ORM & Storage:**
   - Identify ORM/Query builder: TypeORM, Prisma, Drizzle, Mongoose, Sequelize, SQLAlchemy, Tortoise, GORM, sqlx, Hibernate, Entity Framework, etc.
   - Identify Database: PostgreSQL, MySQL, MariaDB, SQLite, MongoDB, DynamoDB, Redis, etc.
   - Identify Migration Tool: TypeORM CLI, Prisma Migrate, Alembic, Flyway, Liquibase, Goose, etc.
   - Identify Storage & Media: AWS S3, Google Cloud Storage, Cloudinary, local disk, or custom media services.

3. **Detect API Style & Response Envelopes:**
   - REST, GraphQL, gRPC, or tRPC.
   - Codebase response envelope pattern: inspect existing controllers/handlers for common wrapper functions (e.g. `{ status, title, message, data, meta }`, JSend, RFC 7807, or raw objects).
   - Schema validation library: `class-validator` / `class-transformer`, `zod`, `yup`, `pydantic`, `joi`, etc.

4. **Detect Testing Framework & Conventions:**
   - Test runner: Vitest, Jest, PyTest, Go `testing`, JUnit, PHPUnit, RSpec.
   - Test file location and naming pattern (e.g. `test/*.spec.ts`, `__tests__/*.test.ts`, `*_test.go`, `tests/test_*.py`).
   - Mocking conventions (e.g. `vi.fn()`, `jest.fn()`, `unittest.mock`, gomock).

5. **Read the PRD & Identify Architectural Gaps:**
   - Read the user's PRD (default: `workflow/prd.md`).
   - Consult [`resources/interview-checklist.md`](./resources/interview-checklist.md) to detect gaps in data modeling, state machine transitions, maker-checker authorization, event tracking, and edge cases.

---

### Phase 2: Interactive Architectural Interview

**DO NOT guess, assume, or hallucinate missing requirements.**

1. Synthesize your PRD analysis and repo discoveries into a clear, structured interview for the user covering:
   - **API & Protocol Decisions:** Recommended endpoint routes, HTTP verbs (e.g. single `PATCH` status resolution vs separate approve/reject routes), and payload serialization (JSON vs multipart vs base64 strings).
   - **Data Modeling & Storage:** New tables vs altering existing tables, soft delete vs hard delete, uniqueness constraints, cascading behaviors.
   - **Business Rules & State Machine:** Allowed transitions (e.g. `Pending` $\rightarrow$ `Approved` / `Rejected`), re-submission rules, role permissions.
   - **Maker-Checker / Authorization:** Maker restrictions, Checker permissions, Maker $\neq$ Checker self-approval prevention, admin audit logging requirements.
   - **Event & Async Processing:** Background queues, webhook delivery, analytics/CDP event emissions.
2. Present the questions to the user and **wait for user alignment** before generating files.

---

### Phase 3: Draft Workflow Specifications

Once aligned with the user's answers, generate the 4 canonical workflow documents in the `workflow/` directory using [`resources/workflow-templates.md`](./resources/workflow-templates.md):

#### 1. `workflow/specs.md` (Architecture & Data Specifications)
- **Executive Summary & System Architecture:** High-level design, layers, and security model.
- **Feature & Infrastructure Data Flowchart:**
  - Mandatory Mermaid flowchart (`flowchart TD` or `flowchart LR`) illustrating the end-to-end data flow and how the new feature connects into existing infrastructure:
    - **Data Flow Journey:** Ingress payloads, validation steps, decision logic, state transitions, async jobs, and response egress.
    - **Infrastructure Touchpoints:** Exact connection points to existing infrastructure components (existing databases/tables, message brokers/queues like Kafka/SQS/RabbitMQ, caching layers like Redis, internal microservices, and external vendor APIs).
    - **Branching & Boundaries:** Error/rejection branches, transaction boundaries, retry/dead-letter mechanisms, and terminal states.
- **Data Modeling & Schemas:**
  - Mermaid Entity Relationship Diagram (ERD).
  - Native database DDL (SQL) tailored to the project's DB dialect (MySQL, Postgres, etc.) with collation, keys, and foreign constraints.
  - Entity/Model definitions written in the project's native ORM (TypeORM, Prisma schema, SQLAlchemy, GORM, etc.).
- **Migrations:** Ready-to-execute migration scripts (forward & rollback) following the project's migration conventions.
- **Indexing Strategy:** Explicit composite and single-column indexes with read/write performance justifications.
- **Atomicity, Concurrency & Transactions:** Database transaction boundaries, row-level locks (e.g. `SELECT FOR UPDATE` / `pessimistic_write`), and idempotency mechanisms.
- **Security & Authorization Rules:** Programmatic validation rules (e.g., Maker-Checker enforcement).

#### 2. `workflow/api-contract.md` (API Contracts & Schemas)
- **Global Conventions:** Base URL, authentication guards/middlewares, content types, standard response envelopes.
- **Endpoints Matrix:** Method, Path, Summary, Auth & Scope, Request Schema, Success Code.
- **Error Handling Matrix:** Exhaustive mapping of failure scenarios, HTTP status codes, and error JSON responses.
- **Type-Safe Schemas & DTOs:**
  - Client Request DTOs / Schemas with complete validation rules.
  - Extended Internal Service DTOs appending trusted server-injected metadata (e.g., authenticated maker/checker IDs, timestamps).
  - Query Filter DTOs with pagination, sorting, and date range parameters.
- **OpenAPI 3.0 / Swagger Specification:** Complete, syntactically valid YAML OpenAPI 3.0.3 specification.

#### 3. `workflow/steps.md` (Business Logic Execution Steps)
- Concrete, endpoint-by-endpoint procedural pseudocode:
  1. Guard & Authentication: Request authentication and actor context extraction.
  2. Entity Existence & Pre-condition Validation: Scope validation, status checks.
  3. Processing & Storage: Media decoding, cloud storage uploads, diff calculations (`previous`, `staging`, `diff`).
  4. Atomic Persistence: Database writes within transaction boundaries, immutable audit log creation.
  5. Asynchronous Events: Triggering domain events, message queues, or analytics tracking.
  6. Strict Response Formatting: Constructing the exact return payload shape.

#### 4. `workflow/implementation.md` (Step-by-Step TDD Plan)
- Structured according to Test-Driven Development (TDD) principles:
  - **Phase 0: Module Foundation & Schema Setup:** Entity files, migration execution, dependency injection wiring.
  - **Phase 1 to N (One Endpoint Per Phase):**
    - `Step N.1 [RED]:` Write unit test suite asserting all business rules, validations, and error branches using the repo's native test runner (Vitest, Jest, PyTest, etc.) with mocked dependencies.
    - `Step N.2 [RED]:` Write controller/route test verifying request parsing and delegation.
    - `Step N.3 [GREEN]:` Write the minimum production code (DTOs, Service logic, Controller handler) to turn tests green.
    - `Step N.4 [VERIFY]:` Run the test command and confirm tests pass.
  - **Final Phase: Refactoring, Quality & Verification:**
    - Run full test suite, code coverage check, linting, and formatting commands.
    - Security and data sanitization checklist (no secrets or unmasked PII logged).

---

### Phase 4: Quality & Cross-Consistency Audit

1. **Cross-File Verification:**
   - Ensure endpoint paths, HTTP verbs, DTO property names, enum values, and event names are **100% identical** across `specs.md`, `api-contract.md`, `steps.md`, and `implementation.md`.
2. **Codebase Idiomatic Fidelity:**
   - Confirm all generated code snippets use the repo's established directory layout, naming style, import paths, and design patterns.
3. **Present Summary:**
   - Provide clickable file links to the generated documents.
   - Outline the immediate next steps to begin TDD implementation.
