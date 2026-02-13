# ADR-0009 — Domain Event Contract

## Status

ACCEPTED

## Context

Domain events are the primary mechanism for cross-bounded-context communication in FitTrack. Without a formal contract specifying event structure, versioning, and publication semantics, events become inconsistent across contexts, breaking downstream consumers silently and making event schema evolution unsafe.

## Decision

### 1. Domain Event Structure

Every domain event must conform to the following structure:

```typescript
interface DomainEvent {
  readonly eventId: string;           // UUIDv4, globally unique
  readonly eventType: string;         // PascalCase, past-tense noun (e.g., "ExecutionRecorded")
  readonly eventVersion: number;      // Integer starting at 1, incremented on schema changes
  readonly occurredAtUtc: string;     // ISO 8601 UTC timestamp
  readonly aggregateId: string;       // ID of the emitting aggregate root
  readonly aggregateType: string;     // Type name of the emitting aggregate root
  readonly tenantId: string;          // professionalProfileId (for tenant-scoped events)
  readonly payload: Record<string, unknown>; // Event-specific data
}
```

### 2. Domain Event Naming Convention

| Convention | Rule |
|-----------|------|
| Format | PascalCase, past-tense verb+noun |
| Scope | Names describe what happened, not what to do |
| Examples (valid) | `ExecutionRecorded`, `BookingConfirmed`, `PurchaseCompleted`, `RiskStatusChanged` |
| Examples (invalid) | `RecordExecution`, `SendBookingEmail`, `UpdateRiskStatus` |

### 3. Event Registration and Publication Protocol

The application layer is responsible for the following sequence:

```
1. Application layer opens transaction.
2. Aggregate root executes domain operation.
3. Aggregate root registers domain event in its internal events collection.
4. Repository persists aggregate within transaction.
5. Transaction commits.
6. Application layer reads registered events from aggregate.
7. Application layer publishes events to event bus.
8. Aggregate internal events collection is cleared.
```

Steps 1–5 are atomic. Steps 6–8 are post-commit. If step 7 fails, an at-least-once delivery mechanism (outbox pattern, dead-letter queue) must ensure eventual delivery. This is governed by ADR-0016.

### 4. Official Domain Events Catalog

The following events are formally recognized. All events conform to the structure in Section 1.

| Event | Aggregate | Producer Context | Payload Keys |
|-------|-----------|-----------------|-------------|
| `PurchaseCompleted` | Transaction | Billing | transactionId, servicePlanId, clientId, professionalProfileId, amount |
| `PaymentFailed` | Transaction | Billing | transactionId, reason |
| `ChargebackRegistered` | Transaction | Billing | transactionId, chargebackId, amount |
| `PaymentRefunded` | Transaction | Billing | transactionId, refundId, amount |
| `AccessGrantCreated` | AccessGrant | Billing | accessGrantId, transactionId, clientId, professionalProfileId, validUntil |
| `AccessGrantRevoked` | AccessGrant | Billing | accessGrantId, reason, revokedBy |
| `AccessGrantSuspended` | AccessGrant | Billing | accessGrantId, reason |
| `AccessGrantReinstated` | AccessGrant | Billing | accessGrantId |
| `AccessGrantExpired` | AccessGrant | Billing | accessGrantId |
| `BookingConfirmed` | Booking | Scheduling | bookingId, sessionId, clientId, professionalProfileId, logicalDay |
| `BookingCancelled` | Booking | Scheduling | bookingId, reason, cancelledBy |
| `BookingCancelledBySystem` | Booking | Scheduling | bookingId, reason |
| `BookingCompleted` | Booking | Scheduling | bookingId, executionId |
| `BookingNoShow` | Booking | Scheduling | bookingId |
| `ExecutionRecorded` | Execution | Execution | executionId, clientId, professionalProfileId, deliverableId, logicalDay, status |
| `ExecutionCorrectionRecorded` | Execution | Execution | correctionId, originalExecutionId, reason |
| `RiskStatusChanged` | ProfessionalProfile | Risk | professionalProfileId, previousStatus, newStatus, reason |
| `ServicePlanPublished` | ServicePlan | ServicePlan | servicePlanId, professionalProfileId |
| `ServicePlanArchived` | ServicePlan | ServicePlan | servicePlanId |
| `PersonalModeActivated` | PersonalModeProfile | PersonalMode | userId |
| `EntitlementEnteredGracePeriod` | PlatformEntitlement | Billing | entitlementId, gracePeriodUntil |
| `EntitlementRestored` | PlatformEntitlement | Billing | entitlementId |
| `GracePeriodExpired` | PlatformEntitlement | Billing | entitlementId |

### 5. Event Versioning Policy

- Every event schema change (adding, removing, or renaming payload fields) requires incrementing `eventVersion`.
- Consumers must handle events by version. Unknown versions are logged and forwarded to a dead-letter topic.
- Field additions with null-safe defaults may be introduced in a minor version increment.
- Field removals and renames constitute breaking changes and require a new major version with consumer migration.

### 6. Event Immutability

- Domain events are immutable after publication.
- No event is retracted or modified after delivery.
- Corrections are handled by publishing a new compensating event (e.g., `ExecutionCorrectionRecorded`), not by modifying the original event.

### 7. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Publishing events before transaction commit | Produces events for rolled-back state |
| Imperative event names | Events describe facts, not commands |
| Events without `eventId` | Prevents idempotency key derivation |
| Synchronous coupling between event and handler | Violates bounded context isolation |

## Invariants

1. Every valid aggregate state transition emits exactly one domain event.
2. Domain events are published only after the producing transaction commits.
3. Events are immutable and versioned.
4. All events include `eventId`, `occurredAtUtc`, `aggregateId`, and `eventVersion`.
5. No domain event triggers a synchronous side effect that could fail the originating use case.

## Constraints

- Domain events do not use event sourcing as a storage mechanism in MVP.
- Events may be published in-process (synchronous handlers) or via an external bus, depending on deployment configuration.
- Event payload must not contain sensitive personal data (PII). Reference IDs only. Governed by ADR-0037.

## Consequences

**Positive:**
- Consistent cross-context integration.
- Safe schema evolution via versioning.
- Testable event contracts.

**Negative:**
- Event catalog requires maintenance as domain evolves.
- Versioning introduces consumer migration coordination.

## Dependencies

- ADR-0000: Project Foundation (event publication after commit rule)
- ADR-0001: Bounded Contexts (producer/consumer context mapping)
- ADR-0003: Transaction Boundaries (publication protocol)
- ADR-0007: Idempotency Policy (handler idempotency via eventId)
- ADR-0016: Formal Eventual Consistency Policy (delivery guarantees)
- ADR-0037: Sensitive Data Handling (PII in event payloads)
