# ADR-0006 — Concurrency Control

## Status

ACCEPTED

## Context

FitTrack involves concurrent operations on shared aggregate roots:
- Multiple clients booking the same session slot simultaneously.
- Simultaneous cancellation requests for the same Booking.
- Concurrent purchases of the same ServicePlan.
- Concurrent RiskStatus updates triggered by different actors.
- Concurrent WorkingAvailability modifications.

Without concurrency control, these scenarios produce silent data corruption: double booking, overwritten cancellations, and inconsistent aggregate state.

## Decision

### 1. Optimistic Locking Policy

All aggregate roots subject to concurrent modification carry a `version` field (integer, initialized at 0, incremented by 1 on each successful save).

**Version field contract:**
- The repository `save` method includes the loaded version in the `WHERE` clause of the persistence update.
- If the row was modified since the aggregate was loaded (version mismatch), the update affects zero rows.
- Zero rows affected constitutes a concurrency conflict and raises `ConcurrencyConflictException`.
- The application layer propagates `ConcurrencyConflictException` as a retryable operation error.

### 2. Aggregates Requiring Optimistic Locking

| Aggregate Root | Concurrent Conflict Scenario |
|---------------|------------------------------|
| Booking | Session slot contention between simultaneous reservations |
| ServicePlan | Session count decrement under concurrent bookings |
| AccessGrant | Concurrent revocation and usage validation |
| ProfessionalProfile | WorkingAvailability and RiskStatus concurrent updates |
| PlatformEntitlement | Billing cycle transitions and grace period management |
| Transaction | Payment status transitions (PENDING → CONFIRMED, PENDING → FAILED) |

### 3. Double-Booking Prevention

Double-booking is prevented by a two-layer mechanism. Both layers are mandatory.

**Layer 1 — Domain rule:**
The Booking aggregate enforces that a session slot may not be reserved beyond its configured capacity. This constraint is evaluated during the `Booking.confirm()` domain method before any persistence operation.

**Layer 2 — Database constraint:**
A unique partial index enforces the uniqueness invariant at the persistence layer:
```sql
CREATE UNIQUE INDEX idx_booking_slot_active
ON bookings (session_id, logical_day)
WHERE status IN ('PENDING', 'CONFIRMED');
```

Removal of either layer independently is prohibited.

### 4. Conflict Resolution Protocol

| Aggregate | Retry Policy | On Persistent Failure |
|-----------|-------------|----------------------|
| Booking | No automatic retry; propagate conflict to client | Client refreshes and resubmits |
| Transaction | Up to 3 internal retries with fresh aggregate load | Emit `TransactionConflictEvent`; alert monitoring |
| AccessGrant | Up to 3 internal retries | Log conflict in AuditLog; propagate to operator |
| RiskStatus | Up to 3 internal retries | Log conflict; operator must resubmit |

### 5. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Pessimistic locking (`SELECT FOR UPDATE`) as the primary strategy | Lock contention degrades throughput under load |
| Global table-level locks | Unacceptable throughput degradation at scale |
| Silent version field ignore on save | Produces silent data corruption |
| Unbounded retry loops | Risk of infinite loop and resource exhaustion |
| Omitting version from a concurrency-sensitive aggregate | Implicit race condition |

## Invariants

1. Every aggregate root listed in Section 2 carries a `version` field maintained by the repository on every `save` call.
2. The persistence layer enforces version comparison atomically within the UPDATE statement.
3. A version mismatch is never silently ignored. It always raises `ConcurrencyConflictException`.
4. Double-booking is prevented by both domain-layer rule and database constraint simultaneously.
5. No operation retries exceed the defined limit before propagating the conflict.

## Constraints

- Optimistic locking is the primary and default concurrency strategy.
- Pessimistic locking may only be used for low-throughput, explicitly documented administrative operations.
- `ConcurrencyConflictException` is a retryable condition at the presentation layer. It is not a validation error.

## Consequences

**Positive:**
- No deadlocks from lock contention.
- Horizontal scalability is not impeded.
- Double-booking is prevented at both logical and physical levels.

**Negative:**
- High-contention scenarios require client-side retry logic.
- Version field adds overhead to all aggregate persistence operations.

## Dependencies

- ADR-0000: Project Foundation (consistency model)
- ADR-0003: Transaction Boundaries (one aggregate per transaction)
- ADR-0007: Idempotency Policy (retry safety)
- ADR-0008: Entity Lifecycle States (valid status transitions)
