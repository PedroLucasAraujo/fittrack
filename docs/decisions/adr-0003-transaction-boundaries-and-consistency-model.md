# ADR-0003 — Transaction Boundaries and Consistency Model

## Status

ACCEPTED

## Context

FitTrack involves multiple aggregate roots that interact across bounded contexts:
- A completed purchase creates an AccessGrant.
- A confirmed booking prepares a Deliverable.
- An Execution record triggers metric derivation.

Without explicit transaction boundary rules, engineers attempt cross-aggregate atomicity, producing deadlocks, excessive coupling, and brittle consistency guarantees.

## Decision

### 1. Transaction Scope Rule

**One database transaction per aggregate root per operation.**

A single application-layer use case may modify exactly one aggregate root within a single database transaction. Modifications to a second aggregate root require a separate transaction, coordinated via domain events.

### 2. Cross-Aggregate Consistency Model

Cross-aggregate consistency is achieved via **eventual consistency** using domain events:

```
Aggregate A mutates
  → Transaction commits (Aggregate A persisted)
  → Domain events published to event bus
  → Aggregate B's event handler executes in separate transaction
  → Aggregate B mutates and persists
```

The gap between Aggregate A committing and Aggregate B updating is an **acceptable eventual consistency window**. The platform is designed to tolerate this window safely. Formal SLA defined in ADR-0016.

### 3. Event Publication Protocol

- Domain events are published **only after the database transaction for the producing aggregate commits successfully**.
- If the transaction fails, no events are published.
- Event handlers execute in their own transaction scope, independent of the producer's transaction.
- Event handler failures do not roll back the producer's committed transaction.
- Event handlers must be idempotent (governed by ADR-0007).

### 4. Application Service Transaction Contract

The application service (use case) is responsible for:
1. Starting a transaction.
2. Loading the aggregate root via its repository.
3. Invoking the domain operation on the aggregate.
4. Persisting the aggregate via its repository within the transaction.
5. Committing the transaction.
6. Publishing domain events after commit.

No step may be reordered. Steps 1–5 are atomic. Step 6 is post-commit.

### 5. Prohibited Patterns

| Prohibited Pattern | Reason |
|-------------------|--------|
| Modifying two aggregate roots in one transaction | Creates cross-aggregate coupling and distributed lock risk |
| Publishing events before transaction commit | Risk of event published for a rollback state |
| Calling another aggregate's repository inside a domain method | Domain layer must not depend on infrastructure |
| Using sagas or compensating transactions in MVP | Excessive complexity for current scale |

### 6. Financial Operations

Financial operations (Purchase, Chargeback, AccessGrant creation) follow the same single-aggregate-per-transaction rule. Financial state transitions use idempotency keys (governed by ADR-0007) to prevent duplicate processing across retries.

## Invariants

1. A database transaction boundary never spans more than one aggregate root.
2. Domain events are never published before the producing transaction commits.
3. Event handlers are always idempotent.
4. Application layer is the exclusive coordinator of transaction initiation and event publication.
5. Domain methods do not initiate database transactions directly.

## Constraints

- No distributed transaction protocols (2PC, Saga orchestration) are used in MVP.
- Eventual consistency between bounded contexts is the accepted consistency model for cross-aggregate operations.
- Transaction retry logic is handled at the infrastructure level, not the domain level.

## Consequences

**Positive:**
- Eliminates deadlock risk from cross-aggregate locking.
- Clear, testable transaction boundaries.
- Scalable consistency model without distributed coordination overhead.

**Negative:**
- Cross-aggregate operations are eventually consistent, not immediately consistent.
- Event handler failures require compensating logic or dead-letter queue processing.

## Dependencies

- ADR-0000: Project Foundation (no distributed transactions principle)
- ADR-0001: Bounded Contexts (aggregate root definitions)
- ADR-0007: Idempotency Policy (event handler idempotency)
- ADR-0009: Domain Event Contract (event structure and publication)
- ADR-0016: Formal Eventual Consistency Policy (SLA and compensation strategy)
