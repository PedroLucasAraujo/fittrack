# ADR-0009 — Official Domain Events Policy

## Status

ACCEPTED (Revised — supersedes original Domain Event Contract)

## Context

Domain events are the primary mechanism for cross-bounded-context communication in FitTrack. The original version of this ADR implied that every aggregate state transition must emit a domain event and that aggregates collect events internally. In practice, this led to:

1. **Generic noise events** (`UserCreated`, `ProfessionalProfileCreated`) that carried no business significance and had no legitimate subscribers.
2. **Aggregate impurity** — aggregates imported event classes and called `addDomainEvent()`, coupling pure domain state machines to infrastructure-level event dispatch.
3. **Ambiguity about who publishes** — the protocol described aggregates collecting events, but did not clarify that the Application layer (UseCase) is the **sole authority** for deciding which events are dispatched.

This revision formalizes the definitive policy: **aggregates are pure state machines; domain events are dispatched explicitly and selectively by the Application layer**.

## Decision

### §1. Core Principles

1. **Domain Events are NOT automatic.** Not every state transition produces an event. Events exist only for **significant business facts** that downstream contexts, integrations, or analytics need to react to.
2. **Aggregates are pure state machines.** Aggregates execute state transitions and enforce invariants. They do NOT import, create, or collect domain events. The `addDomainEvent()` method inherited from `AggregateRoot` is reserved for future use if event sourcing is adopted; it MUST NOT be called in application-layer DDD aggregates.
3. **The Application layer (UseCase) is the sole dispatcher.** After a successful aggregate operation and persistence, the UseCase decides which events (if any) to construct and publish.
4. **Repositories do NOT dispatch events.** Repositories are pure persistence gateways. They save and load aggregates. They never create, collect, or publish domain events.
5. **Billing and financial consistency NEVER depend on event subscribers.** Financial rules (ledger entries, chargeback resolution, refund processing) are enforced synchronously within the UseCase transaction. Events for financial facts (e.g., `ChargebackRegistered`) are published for notification, analytics, and integration — never as the mechanism that ensures correctness.
6. **Events serve exclusively for:** decoupled reactions, cross-context integrations, notifications, analytics, audit trails, and webhooks.

### §2. Domain Event Structure

Every domain event must conform to the following structure:

```typescript
interface DomainEvent {
  readonly eventId: string;           // UUIDv4, globally unique
  readonly eventType: string;         // PascalCase, past-tense noun (e.g., "ExecutionRecorded")
  readonly eventVersion: number;      // Integer starting at 1, incremented on schema changes
  readonly occurredAtUtc: string;     // ISO 8601 UTC timestamp
  readonly aggregateId: string;       // ID of the originating aggregate root
  readonly aggregateType: string;     // Type name of the originating aggregate root
  readonly tenantId: string;          // professionalProfileId (for tenant-scoped events)
  readonly payload: Record<string, unknown>; // Event-specific data
}
```

### §3. Domain Event Naming Convention

| Convention | Rule |
|-----------|------|
| Format | PascalCase, past-tense verb+noun |
| Scope | Names describe what happened, not what to do |
| Examples (valid) | `ExecutionRecorded`, `BookingConfirmed`, `PurchaseCompleted`, `ProfessionalProfileBanned` |
| Examples (invalid) | `RecordExecution`, `SendBookingEmail`, `UpdateRiskStatus` |

### §4. Event Dispatch Protocol

The Application layer (UseCase) is responsible for the following sequence:

```
1. UseCase validates input and loads aggregate(s) from repository.
2. UseCase calls aggregate domain method (state transition).
3. Repository persists aggregate within transaction.
4. Transaction commits.
5. UseCase constructs domain event(s) for significant business facts.
6. UseCase publishes event(s) to event bus (or in-process dispatcher).
```

Steps 1–4 are atomic. Steps 5–6 are post-commit. If step 6 fails, an at-least-once delivery mechanism (outbox pattern, dead-letter queue) must ensure eventual delivery. Delivery guarantees are governed by ADR-0016.

**Key change from original:** Aggregates no longer participate in event construction or collection. The UseCase has full authority over which events are published and their payload content.

### §5. When to Emit Domain Events

Emit a domain event when the fact is a **significant business milestone** that:

- Another bounded context needs to react to (e.g., `PurchaseCompleted` → Execution context creates AccessGrant).
- An integration, webhook, or notification channel needs to be informed.
- An audit trail or analytics pipeline must record the occurrence.
- The event represents a **non-reversible or consequential state change** in the business domain.

**Valid event examples:**

| Event | Why it matters |
|-------|---------------|
| `PurchaseCompleted` | Triggers AccessGrant creation, notifications |
| `ChargebackRegistered` | Triggers risk escalation, AccessGrant suspension |
| `BookingConfirmed` | Informs scheduling, sends confirmation |
| `ProfessionalProfileBanned` | Cascading effects across Billing, Scheduling, Execution |
| `ProfessionalProfileApproved` | Unlocks platform capabilities |
| `RiskStatusChanged` | Downstream contexts adjust operational permissions |
| `ExecutionRecorded` | Metrics, progress tracking, analytics |

### §6. When NOT to Emit Domain Events

Do NOT emit events for:

- **Generic entity lifecycle operations**: creation, update, or deletion of any entity. These are persistence operations, not business facts.
- **Redundant state echoes**: events that merely repeat the aggregate's current state without adding business context.
- **Internal bookkeeping**: changes that are only relevant within the same bounded context and have no downstream consumers.

**Invalid event examples (DELETED or PROHIBITED):**

| Prohibited Pattern | Reason |
|-------------------|--------|
| `UserCreated` | Generic EntityCreated — no subscriber needs to react to raw user creation |
| `ProfessionalProfileCreated` | Generic EntityCreated — profile creation is an internal Identity concern |
| `EntityUpdated` (generic) | Provides no business semantics; consumers can't derive intent |
| `StatusChanged` (generic) | Too vague; use specific events like `ProfessionalProfileBanned` |

### §7. Official Domain Events Catalog

The following events are formally recognized. All events conform to the structure in §2.

| Event | Aggregate | Producer Context | Payload Keys |
|-------|-----------|-----------------|-------------|
| `ProfessionalProfileApproved` | ProfessionalProfile | Identity | profileId, userId |
| `ProfessionalProfileSuspended` | ProfessionalProfile | Identity | profileId, userId |
| `ProfessionalProfileReactivated` | ProfessionalProfile | Identity | profileId, userId |
| `ProfessionalProfileBanned` | ProfessionalProfile | Identity | profileId, userId, reason |
| `ProfessionalProfileDeactivated` | ProfessionalProfile | Identity | profileId, userId, previousRiskStatus |
| `ProfessionalProfileClosed` | ProfessionalProfile | Identity | profileId, userId, previousStatus, previousRiskStatus, reason |
| `RiskStatusChanged` (v2) | ProfessionalProfile | Risk | profileId, previousStatus, newStatus, reason, evidenceRef |
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
| `ExecutionRecorded` (v2) | Execution | Execution | executionId, clientId, professionalProfileId, deliverableId, logicalDay, status, occurredAtUtc, timezoneUsed |
| `ExecutionCorrectionRecorded` | Execution | Execution | correctionId, originalExecutionId, reason |
| `SelfLogRecorded` | SelfLog | Execution / PersonalMode | selfLogEntryId, clientId, professionalProfileId, logicalDay, sourceType, sourceId, correctedEntryId |
| `MetricComputed` | Metric | Metrics | metricId, clientId, professionalProfileId, metricType, logicalDay, derivationRuleVersion |
| `ServicePlanPublished` | ServicePlan | ServicePlan | servicePlanId, professionalProfileId |
| `ServicePlanArchived` | ServicePlan | ServicePlan | servicePlanId |
| `ProductPurchaseCompleted` | ProductPurchase | Products | productPurchaseId, productVersionId, clientId, professionalProfileId, transactionId |
| `ProductPurchaseRefunded` | ProductPurchase | Products | productPurchaseId, refundId, revokedAccessGrantIds |
| `RevenueRecorded` | FinancialLedger | Ledger | ledgerId, executionId, amountCents, currency, logicalDay, balanceAfterCents |
| `PlatformFeeRecorded` | FinancialLedger | Ledger | ledgerId, executionId, amountCents, currency, logicalDay, balanceAfterCents |
| `RefundRecorded` | FinancialLedger | Ledger | ledgerId, referenceEntryId, amountCents, currency, balanceAfterCents, reason |
| `PayoutCompleted` | FinancialLedger | Ledger | ledgerId, amountCents, currency, balanceAfterCents |
| `LedgerBalanceChanged` | FinancialLedger | Ledger | ledgerId, previousBalanceCents, newBalanceCents, currency, entryType, isInDebt |
| `LedgerStatusChanged` | FinancialLedger | Ledger | ledgerId, previousStatus, newStatus, reason |
| `PersonalModeActivated` | PersonalModeProfile | PersonalMode | userId |
| `EntitlementEnteredGracePeriod` | Subscription *(TBD)* | Billing | entitlementId, gracePeriodUntil |
| `EntitlementRestored` | Subscription *(TBD)* | Billing | entitlementId |
| `GracePeriodExpired` | Subscription *(TBD)* | Billing | entitlementId |
| `EntitlementGranted` | PlatformEntitlement | Platform | entitlementId, professionalProfileId, entitlements, expiresAt |
| `EntitlementCapabilityAdded` | PlatformEntitlement | Platform | entitlementId, capability, reason |
| `EntitlementCapabilityRemoved` | PlatformEntitlement | Platform | entitlementId, capability, reason |
| `EntitlementSuspended` | PlatformEntitlement | Platform | entitlementId, reason, evidenceRef |
| `EntitlementReinstated` | PlatformEntitlement | Platform | entitlementId, reason |
| `EntitlementExpired` | PlatformEntitlement | Platform | entitlementId, expiredAt |
| `TemplateVersionChanged` | CatalogItem | Catalog | catalogItemId, professionalProfileId, previousVersion, newVersion |

### §8. Event Versioning Policy

- Every event schema change (adding, removing, or renaming payload fields) requires incrementing `eventVersion`.
- Consumers must handle events by version. Unknown versions are logged and forwarded to a dead-letter topic.
- Field additions with null-safe defaults may be introduced in a minor version increment.
- Field removals and renames constitute breaking changes and require a new major version with consumer migration.

### §9. Event Immutability

- Domain events are immutable after publication.
- No event is retracted or modified after delivery.
- Corrections are handled by publishing a new compensating event (e.g., `ExecutionCorrectionRecorded`), not by modifying the original event.

### §10. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Aggregates calling `addDomainEvent()` | Aggregates are pure state machines; events are UseCase responsibility |
| Repositories dispatching events | Repositories are persistence gateways only |
| Publishing events before transaction commit | Produces events for rolled-back state |
| Imperative event names | Events describe facts, not commands |
| Events without `eventId` | Prevents idempotency key derivation |
| Synchronous coupling between event and handler | Violates bounded context isolation |
| Financial consistency via event subscribers | Financial rules must be synchronous within the UseCase transaction |
| Generic `EntityCreated` / `EntityUpdated` events | No business semantics; noise for downstream consumers |

## Invariants

1. Domain events are published only after the producing transaction commits.
2. Events are immutable and versioned.
3. All events include `eventId`, `occurredAtUtc`, `aggregateId`, and `eventVersion`.
4. No domain event triggers a synchronous side effect that could fail the originating use case.
5. The Application layer (UseCase) is the sole authority for event dispatch — aggregates and repositories never publish events.
6. Financial consistency is never delegated to event subscribers.

## Constraints

- Domain events do not use event sourcing as a storage mechanism in MVP.
- Events may be published in-process (synchronous handlers) or via an external bus, depending on deployment configuration.
- Event payload must not contain sensitive personal data (PII). Reference IDs only. Governed by ADR-0037.

## Consequences

**Positive:**
- Consistent cross-context integration.
- Safe schema evolution via versioning.
- Testable event contracts.
- Pure aggregate state machines — simpler to test, no event coupling.
- Explicit UseCase control over which events are dispatched — no accidental noise events.
- Financial consistency guaranteed synchronously, with events as a bonus for analytics and integration.

**Negative:**
- Event catalog requires maintenance as domain evolves.
- Versioning introduces consumer migration coordination.
- UseCases must explicitly construct events, adding a small amount of boilerplate per use case.

## Dependencies

- ADR-0000: Project Foundation (event publication after commit rule)
- ADR-0001: Bounded Contexts (producer/consumer context mapping)
- ADR-0003: Transaction Boundaries (publication protocol)
- ADR-0007: Idempotency Policy (handler idempotency via eventId)
- ADR-0008: Entity Lifecycle States (state machine transitions that produce events)
- ADR-0016: Formal Eventual Consistency Policy (delivery guarantees)
- ADR-0022: Financial Risk Governance (risk events, financial consistency)
- ADR-0037: Sensitive Data Handling (PII in event payloads)
- ADR-0047: Canonical Aggregate Root Definition (aggregate purity)
