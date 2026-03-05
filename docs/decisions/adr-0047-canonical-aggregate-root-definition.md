# ADR-0047 — Canonical Aggregate Root Definition

## Status

ACCEPTED

## Context

Domain-Driven Design (DDD) structures the domain model around Aggregate Roots — the consistency boundaries that govern transactional integrity. FitTrack's domain has grown to include multiple bounded contexts, each with multiple entities. Without a canonical catalog of aggregate roots and their boundaries, developers create transactions that span multiple aggregates, repositories that return entity collections without a root, and domain logic that violates consistency invariants. This ADR defines the formal aggregate root catalog and the rules that govern their use.

## Decision

### 1. Aggregate Root Definition

An Aggregate Root is an entity that:
- Is the single entry point for all state changes within its consistency boundary.
- Owns a set of subordinate entities and value objects that are modified only through the root.
- Is loaded and persisted atomically (all-or-nothing within one transaction).
- Publishes domain events on behalf of its aggregate.
- Carries an optimistic locking `version` field (ADR-0006) if it is subject to concurrent modification.

### 2. Canonical Aggregate Root Catalog

| Aggregate Root | Bounded Context | Subordinate Entities | Domain Events Published |
|---------------|----------------|---------------------|------------------------|
| `UserProfile` | Identity / UserProfile | — | `UserProfileCreated`, `UserProfileUpdated` |
| `ProfessionalProfile` | ProfessionalProfile | — | `ProfessionalProfileCreated`, `RiskStatusChanged` (v2, produced by Risk context) |
| `PlatformEntitlement` | Platform | — | `EntitlementGranted`, `EntitlementCapabilityAdded`, `EntitlementCapabilityRemoved`, `EntitlementSuspended`, `EntitlementReinstated`, `EntitlementExpired` |
| `ServicePlan` | ServicePlan / Catalog | — | `ServicePlanCreated`, `ServicePlanActivated`, `ServicePlanDeleted` |
| `CatalogItem` | Catalog | — | `TemplateVersionChanged` (cache invalidation per ADR-0030) |
| `Deliverable` | Deliverables | ExerciseAssignment | — (no domain events emitted at current implementation scope; ADR-0009 §1) |
| `DeliverableTemplate` | Deliverables | — | `DeliverableTemplateCreated`, `DeliverableTemplateActivated`, `DeliverableTemplateArchived`, `DeliverableTemplateVersioned`, `DeliverableTemplateInstantiated` |
| `Session` | Scheduling | — | `SessionCreated`, `SessionArchived` |
| `WorkingAvailability` | Scheduling | — | `WorkingAvailabilityCreated`, `WorkingAvailabilityUpdated` |
| `Booking` | Scheduling | — | `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingCompleted`, `BookingNoShow` |
| `RecurringSchedule` | Scheduling | RecurringSession | `RecurringScheduleCreated`, `RecurringSessionAdded` |
| `Execution` | Execution | ExecutionCorrection | `ExecutionRecorded`, `ExecutionCorrectionRecorded` |
| `SelfLog` | Execution / PersonalMode | — | `SelfLogRecorded`, `SelfLogCorrectionProjected` |
| `Metric` | Metrics | — | `MetricComputed` |
| `Transaction` | Billing | — | `PaymentConfirmed`, `PaymentRefunded`, `ChargebackRegistered` |
| `AccessGrant` | Billing | — | `AccessGrantCreated`, `AccessGrantRevoked`, `AccessGrantSuspended`, `AccessGrantReinstated` |
| `FinancialLedger` | Ledger | `LedgerEntry` (append-only) | `RevenueRecorded`, `PlatformFeeRecorded`, `RefundRecorded`, `PayoutCompleted`, `LedgerBalanceChanged`, `LedgerStatusChanged` |
| `ProfessionalClientLink` | UserProfile | — | `ClientLinked`, `ClientLinkEnded` |
| `AuditLog` | Audit | — | (append-only; no domain events) |
| `OutboxEvent` | Infrastructure | — | (infrastructure concern; not a domain aggregate) |

**Note on Risk bounded context**: The Risk bounded context (ADR-0001 §1, ADR-0022) is
**application-layer only**. `RiskStatus` is embedded as a state machine on `ProfessionalProfile`.
No separate `RiskProfile` aggregate root exists. The `packages/risk/` module contains Use Cases
that modify `ProfessionalProfile` via `IProfessionalRiskRepository` and publish `RiskStatusChanged`
events. This is consistent with ADR-0003 (one aggregate per transaction) and ADR-0022 (canonical
risk governance authority).

### 3. Aggregate Root Rules

| Rule | Description |
|------|-------------|
| **Single root per transaction** | One domain transaction modifies exactly one aggregate root (ADR-0003). |
| **No cross-aggregate references within a transaction** | Aggregates reference each other by ID only, never by object reference. |
| **Repository per aggregate** | Each aggregate root has exactly one repository interface. No repository spans multiple roots. |
| **Version field required** | Aggregate roots subject to concurrent modification carry a `version` field for optimistic locking (ADR-0006). |
| **Events dispatched by Application layer** | Domain events are constructed and published exclusively by the Application layer (UseCase), after the transaction commit. Aggregate roots are pure state machines — they mutate state and return results but never create, collect, or publish events. The `addDomainEvent()` method inherited from `AggregateRoot` is reserved for potential future event sourcing and MUST NOT be called in concrete aggregates. The pattern is: `aggregate.method()` → `repo.save()` → `eventPublisher.publish(new Event())` in the UseCase. |
| **Subordinate entities owned exclusively** | A subordinate entity is part of exactly one aggregate; it does not appear in another aggregate's boundary. |

### 4. Aggregate Root vs Entity vs Value Object

| Concept | Identity | Mutable | Aggregate Boundary |
|---------|----------|---------|-------------------|
| **Aggregate Root** | Global (UUID) | Yes (within invariants) | Is the root |
| **Entity** | Local (within aggregate) | Yes (through root only) | Subordinate to a root |
| **Value Object** | By value (structural equality) | No (replaced, not modified) | Embedded in any aggregate |

Examples:
- `Deliverable` is an aggregate root in the Deliverables bounded context (`@fittrack/deliverables`). It is NOT a subordinate of `ServicePlan`. It has its own `IDeliverableRepository` and lifecycle (DRAFT → ACTIVE → ARCHIVED per ADR-0008 §8). Authorized types: `TRAINING_PRESCRIPTION`, `DIET_PLAN`, `PHYSIOLOGICAL_ASSESSMENT` (ADR-0044 §1).
- `ExerciseAssignment` is a subordinate entity of `Deliverable` (content snapshot per ADR-0011; mutated only in DRAFT status, locked on activation).
- `ExecutionCorrection` is a subordinate entity of `Execution` (append-only; owned by `Execution`).
- `LedgerEntry` is a subordinate entity of `FinancialLedger` (append-only; immutable after creation). One `FinancialLedger` exists per `professionalProfileId`. The repository loads only the header (balance, status, version) for mutations; `_newEntries` tracks entries added during the current operation. See ADR-0021 for full repository optimization contract.
- A `Money` type (integer cents + currency code) is a value object embedded in `Transaction`.

### 5. Aggregate Size Guidelines

Aggregates should be kept small:
- Include in an aggregate only what must be atomically consistent.
- Prefer eventual consistency between aggregates over large aggregate transactions (ADR-0016).
- If a candidate subordinate entity is queried independently of its root more than it is modified with its root, it is likely a separate aggregate.

### 6. Aggregate Identity Rules

| Rule | Description |
|------|-------------|
| All aggregate roots use UUIDv4 as their primary identifier | Prevents sequential ID enumeration |
| IDs are assigned at creation and are immutable | No ID changes after creation |
| Cross-aggregate references use the target aggregate's ID only | No foreign object references across boundaries |

### 7. Aggregate-to-Repository Mapping

Each aggregate root has exactly one repository interface following the naming convention `I{AggregateName}Repository`:

```typescript
// Examples
interface IExecutionRepository
interface IAccessGrantRepository
interface IDeliverableRepository
interface IDeliverableTemplateRepository
interface ICatalogItemRepository
interface IServicePlanRepository
interface ITransactionRepository
interface IFinancialLedgerRepository
interface ISessionRepository
interface IWorkingAvailabilityRepository
interface IBookingRepository
interface IRecurringScheduleRepository
```

Repository interfaces return aggregate roots (not partial projections). Partial projections for read models are served by separate read model projectors (ADR-0014), not by the domain repository.

## Invariants

1. One transaction modifies exactly one aggregate root.
2. Aggregates reference each other by ID only; no cross-aggregate object references.
3. Every aggregate root has exactly one repository interface.
4. Domain events are constructed and published by the Application layer (UseCase) only — aggregates and subordinate entities never create or publish events directly.
5. Subordinate entities are owned by exactly one aggregate root and are not accessible directly by ID from outside the aggregate.

## Constraints

- `AuditLog` is a Tier 1 permanent entity governed by ADR-0013 and ADR-0027. It is an append-only record, not a traditional DDD aggregate (no domain events, no mutations). It is listed here for completeness of the entity catalog.
- `OutboxEvent` is an infrastructure entity used by the outbox pattern (ADR-0009). It is not a domain aggregate.
- New entity types must be classified in this catalog before implementation begins.

## Consequences

**Positive:**
- Consistent aggregate boundaries prevent cross-aggregate transaction violations.
- Explicit catalog makes onboarding faster and reduces architectural drift.
- Repository-per-aggregate rule enforces clean data access patterns.

**Negative:**
- Strict boundary enforcement requires eventual consistency between aggregates, adding complexity to cross-context workflows.
- Updating this catalog requires coordination when new aggregates are introduced.

## Dependencies

- ADR-0001: Bounded Contexts and Domain Architecture (context assignments for each aggregate)
- ADR-0003: Transaction Boundaries and Consistency Model (one aggregate per transaction)
- ADR-0004: Persistence Strategy and Repository Pattern (repository-per-aggregate pattern)
- ADR-0005: Execution Core Invariant Policy (Execution aggregate immutability)
- ADR-0006: Concurrency Control (optimistic locking on aggregate roots)
- ADR-0009: Domain Event Contract (events published by aggregate roots)
- ADR-0014: Projections, Derived Metrics, and Read Models (read models separate from domain repositories)
- ADR-0016: Formal Eventual Consistency Policy (cross-aggregate coordination via events)
