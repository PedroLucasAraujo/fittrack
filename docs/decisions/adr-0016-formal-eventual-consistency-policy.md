# ADR-0016 — Formal Eventual Consistency Policy

## Status

ACCEPTED

## Context

FitTrack uses an event-driven architecture where cross-aggregate and cross-context operations are coordinated via domain events (ADR-0009) within a single-aggregate-per-transaction model (ADR-0003). This design produces eventual consistency windows where the state of one aggregate is not yet reflected in dependent aggregates or read models.

Without a formal policy defining the acceptable consistency windows, retry strategies, and compensation approaches for eventual consistency failures, engineers make incorrect assumptions about data freshness, financial operations produce ambiguous outcomes, and system failures propagate undetected.

This ADR was previously occupied by a duplicate of the temporal policy. It is now the canonical Formal Eventual Consistency Policy (Gap 2 closure).

## Decision

### 1. Eventual Consistency Model

FitTrack uses **at-least-once delivery** for domain events with **idempotent consumers**. The platform does not guarantee exactly-once delivery. Consumers must implement idempotency (governed by ADR-0007) to absorb duplicate deliveries safely.

**Consistency model by operation class:**

| Operation Class | Consistency Model | Acceptable Window |
|----------------|------------------|------------------|
| Single-aggregate mutation | Strong consistency (within transaction) | Immediate |
| Cross-aggregate event-driven operation | Eventual consistency | ≤ 30 seconds (target), ≤ 5 minutes (SLA) |
| Read model projection update | Eventual consistency | ≤ 5 minutes (target), ≤ 15 minutes (SLA) |
| Metric derivation | Eventual consistency | ≤ 15 minutes (target), ≤ 1 hour (SLA) |
| Billing reconciliation (post-MVP Ledger) | Eventual consistency | ≤ 1 hour (target) |

### 2. Event Delivery Guarantees

| Property | Guarantee |
|----------|-----------|
| At-least-once delivery | Yes — events may be delivered more than once |
| Exactly-once delivery | Not guaranteed — consumers must be idempotent |
| Ordered delivery within aggregate | Best-effort for in-process handlers; not guaranteed for external bus |
| Cross-aggregate ordering | Not guaranteed — consumers must handle out-of-order events |
| Event durability | Events persisted via outbox pattern before delivery |

### 3. Outbox Pattern

For cross-context events requiring durable delivery, the outbox pattern is required:

```
1. Aggregate mutates.
2. Within the same transaction:
   a. Aggregate state is persisted.
   b. Event is written to an OutboxEvent table.
3. Transaction commits.
4. A background worker reads OutboxEvent table.
5. Worker publishes event to event bus.
6. On successful publish, OutboxEvent record is marked as processed.
```

This pattern guarantees that events are not lost if the event bus is temporarily unavailable at the time of aggregate mutation.

### 4. Retry Policy for Event Handlers

| Stage | Retry Behavior |
|-------|---------------|
| Initial attempt | Immediate |
| Retry 1 | 5-second delay |
| Retry 2 | 30-second delay |
| Retry 3 | 5-minute delay |
| After 3 retries | Move to dead-letter queue (DLQ) |
| DLQ | Manual review required; alert triggered |

All retries use the same IdempotencyKey as the original attempt to prevent duplicate application of the event.

### 5. Dead-Letter Queue Policy

Events reaching the DLQ:
- Trigger an operational alert (monitoring/on-call).
- Are retained in the DLQ for a minimum of 7 days.
- Are reviewed and reprocessed manually by an operator.
- Are never silently discarded.

DLQ events for financial operations (PurchaseCompleted, ChargebackRegistered, AccessGrantCreated) are treated with highest priority.

### 6. Late Event Reprocessing Policy

An event may arrive after the expected consistency window due to:
- Network partition recovery.
- DLQ reprocessing.
- System restart after failure.

Late event handling rules:
- **Idempotency is the primary defense.** If the operation was already applied, the late delivery is a no-op.
- **State divergence detection:** If a late event conflicts with the current aggregate state (e.g., AccessGrantCreated arrives after the AccessGrant was manually revoked), the consumer must log the conflict to AuditLog and apply the most conservative action (retain the revocation, not overwrite it).
- **No retroactive Execution record alteration** for any late event, regardless of the event type.

### 7. Consistency Guarantees by Domain Area

| Domain Area | Consistency Note |
|-------------|-----------------|
| Billing / AccessGrant creation | PurchaseCompleted → AccessGrant creation is within the standard cross-aggregate window (≤ 5 minutes). During this window, Execution creation is rejected (no valid AccessGrant yet). This is acceptable; the client may retry after the window. |
| Scheduling / Booking | BookingConfirmed → Deliverable preparation is within the standard window. Execution creation requires a confirmed Booking reference. |
| Metrics derivation | ExecutionRecorded → Metric creation is within the metric derivation window. Historical displays may show metrics with a delay. |
| Risk status enforcement | RiskStatusChanged → AccessGrant suspension. This is the highest-priority event. Target window: ≤ 30 seconds. If the window is exceeded, alert is triggered. |
| Read model updates | Eventually consistent with write model. Dashboards show data within the read model window. |

### 8. Consistency and Financial Safety

The following financial invariants hold under eventual consistency:
1. AccessGrant is never created before PurchaseCompleted is confirmed. The window is in the direction of blocking delivery, not enabling unauthorized delivery.
2. A payment confirmation arriving late creates an AccessGrant late. A client attempting Execution during this window receives a "no valid grant" rejection and can retry. This is safe.
3. A chargeback event arriving late does not produce a second AccessGrant. Idempotency prevents this.
4. RiskStatus enforcement latency is bounded by the target window. A BANNED professional may complete up to ~30 seconds of operations during the enforcement window.

## Invariants

1. Domain events are published at-least-once after the producing transaction commits.
2. All event consumers are idempotent. Duplicate delivery never produces duplicate application.
3. Events entering the DLQ never result in silent discard. All DLQ entries require operational resolution.
4. No retroactive Execution record alteration occurs due to late event delivery.
5. The RiskStatusChanged event has the highest enforcement priority. Its consistency window is bounded at ≤ 5 minutes (SLA).
6. Financial operations (AccessGrant creation, revocation) are never executed without their corresponding triggering event being successfully processed.

## Constraints

- MVP implementation may use in-process synchronous event handlers. Eventual consistency SLAs apply only to asynchronous handlers.
- The outbox pattern is required for any event whose failure to deliver would result in a financial or authorization inconsistency.
- DLQ alerting must be configured before the platform processes live financial transactions.

## Consequences

**Positive:**
- Explicit, auditable consistency guarantees for each domain area.
- Financial safety maintained under network failures and system restarts.
- Late event handling prevents silent state corruption.

**Negative:**
- Operational complexity from DLQ management.
- Client-facing retries required during cross-aggregate consistency windows.

## Dependencies

- ADR-0000: Project Foundation (no distributed transactions)
- ADR-0003: Transaction Boundaries (cross-aggregate consistency via events)
- ADR-0007: Idempotency Policy (consumer idempotency under at-least-once delivery)
- ADR-0009: Domain Event Contract (event structure)
- ADR-0014: Projections and Derived Metrics (read model eventual consistency)
