# ADR-0000 — Project Foundation and Architectural Principles

## Status

ACCEPTED — FROZEN

## Context

FitTrack is a subscription-first SaaS marketplace that connects fitness professionals with clients for continuous service delivery. The platform manages recurring service plans (ServicePlans), time-based service execution (Execution), derived metrics, financial governance, and access control.

The system operates across multiple bounded contexts with financial sensitivity, legal obligations under LGPD (Brazilian General Data Protection Law), and requirements for long-term historical integrity.

Without explicit foundational principles, architectural entropy degrades consistency, financial safety, and legal defensibility across all bounded contexts.

## Decision

### 1. Architectural Style

FitTrack is implemented as a **Modular Monolith** organized according to Domain-Driven Design (DDD) principles, with explicit bounded context boundaries enabling future independent service extraction.

### 2. Non-Negotiable Domain Principles

The following principles govern every architectural decision in this corpus. No ADR may contradict them.

| Principle | Formal Statement |
|-----------|-----------------|
| Subscription-First | Payment confirmation always precedes service delivery. No Execution may occur without a valid, confirmed AccessGrant. |
| Execution as Source of Truth | Execution records are the authoritative source for all service delivery history. Metrics and projections are always derived, never primary. |
| Execution Immutability | Execution records are permanent and immutable after creation. Governed by ADR-0005 (Core Invariant Policy). |
| logicalDay Mandatory | All time-based domain entities (Execution, Deliverable) must store logicalDay alongside UTC timestamps. Governed by ADR-0010. |
| UTC Backend | All timestamps are stored and processed in UTC. No local timezone value is persisted as a timestamp. |
| Snapshot Immutability | Deliverable snapshots are created at prescription time and are never modified afterward. |
| AccessGrant Non-Retroactive Deletion | AccessGrant records are never retroactively deleted. Revocation affects only future access. |
| Chargeback Non-Destructive | Chargebacks never delete Execution records, financial transactions, or derived metrics. |
| Soft Delete Scope | Soft delete is permitted only for non-critical entities. Execution, Transaction, AccessGrant, and AuditLog are never soft-deleted. |
| Ledger Immutability | The financial Ledger (post-MVP) is append-only and immutable. Governed by ADR-0021. |
| Risk Management Non-Destructive | RiskStatus transitions never alter historical records. Risk controls affect future actions only. |
| Platform Non-Interpretation | The platform does not validate, interpret, or assume clinical or technical responsibility for physiological data. |
| LGPD Primary Controller | The platform is the primary data controller under LGPD. Professionals are authorized operators. Governed by ADR-0028. |
| Multi-Tenant Logical Isolation | All tenant data is logically isolated by professionalProfileId. No cross-tenant data access is permitted outside of explicitly authorized administrative operations. |
| No Distributed Transactions | Distributed transactions across aggregate root boundaries are prohibited. Cross-boundary consistency is achieved via domain events. |
| Idempotency Required | All financial operations and external-event-driven operations must be idempotent. Governed by ADR-0007. |
| History Permanence | Execution history, financial transaction history, and delivered paid content records are permanently retained. |

### 3. Architectural Layer Rules

| Layer | Responsibility | Prohibited Dependencies |
|-------|---------------|------------------------|
| Domain | Entities, value objects, aggregate roots, domain events, repository interfaces | Infrastructure, ORM, frameworks |
| Application | Use case orchestration, authorization enforcement, domain event publication after commit | Direct infrastructure access, domain mutation outside aggregates |
| Infrastructure | Repository implementations, ORM adapters, external service clients | Domain layer business logic |
| Presentation | HTTP request/response adaptation | Business logic, domain mutation |

- No aggregate root holds a direct reference to another aggregate root.
- Cross-aggregate communication uses domain events or application-layer orchestration exclusively.
- Domain layer exceptions are domain exceptions, not technical or infrastructure exceptions.

### 4. Domain Event Model

- Every valid state transition within an aggregate root emits a corresponding domain event.
- Domain events are registered inside the aggregate and published by the application layer only after successful persistence.
- Domain events are immutable and carry a version number.
- The platform does not use event sourcing in MVP. Events are publication artifacts, not storage primitives.
- Governed by ADR-0009.

### 5. Financial Safety Model

- All financial operations require an idempotency key.
- No financial record is ever deleted or modified after creation.
- All financial state transitions produce an AuditLog entry.
- The Ledger (post-MVP, ADR-0021) is the canonical financial reconciliation source.

### 6. Time Model

- All timestamps use UTC at the persistence boundary.
- All time-based domain entities store both `occurredAtUtc` (UTC timestamp) and `logicalDay` (calendar date in the relevant user's timezone).
- logicalDay is computed at creation time and never recomputed retroactively.
- Full specification governed by ADR-0010.

## Invariants

1. No ADR in this corpus may contradict the principles defined in Section 2 of this document.
2. Execution records are never deleted, modified, or retroactively altered under any circumstance, including chargeback, account closure, or legal request for deletion.
3. Historical financial data is permanently retained.
4. All timestamps persisted to the database are UTC.
5. logicalDay is set at entity creation time and never subsequently modified.
6. Every aggregate root mutation emits a domain event before the operation is considered complete.

## Constraints

- MVP phase: Modular Monolith architecture. No distributed infrastructure required.
- No microservices extraction is performed in MVP phase.
- No CRUD-centric architecture is permitted. All mutations pass through aggregate roots.
- No ADR may be marked FROZEN unless explicitly stated in the ADR status field.

## Consequences

**Positive:**
- High architectural predictability across all bounded contexts.
- Financial and legal safety enforced by design invariants.
- Clear migration path toward service extraction without domain contract changes.
- Audit-safe historical records by construction.

**Negative:**
- Higher initial design complexity compared to a CRUD-first approach.
- Requires disciplined enforcement of layer boundaries and aggregate boundaries.

## Dependencies

- This is the foundational ADR. All other ADRs in this corpus depend on ADR-0000.
- ADR-0005: Execution Core Invariant Policy (governs execution immutability principle)
- ADR-0007: Idempotency Policy (governs idempotency principle)
- ADR-0009: Domain Event Contract (governs event model)
- ADR-0010: Canonical Temporal Policy (governs time model)
- ADR-0021: Immutable Financial Ledger (governs ledger immutability principle)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (governs legal model)
