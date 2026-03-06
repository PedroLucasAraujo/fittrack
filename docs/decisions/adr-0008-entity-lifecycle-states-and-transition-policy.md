# ADR-0008 — Entity Lifecycle States and Transition Policy

## Status

ACCEPTED

## Context

Multiple domain entities in FitTrack carry status fields governing their operational state. Without explicit lifecycle definitions, invalid state transitions are produced, domain events are emitted inconsistently, and business rules are applied to entities in inappropriate states.

This ADR defines the formal lifecycle state machine for each major status-bearing entity. Detailed lifecycle policies for specific high-criticality entities are governed by referenced specialist ADRs.

## Decision

### 1. Lifecycle Governance Rules

For every entity carrying a `status` field:
1. All valid status values must be enumerated explicitly.
2. All valid state transitions must be enumerated explicitly.
3. Valid status transitions MAY have a corresponding named domain event. The Application layer (UseCase) decides which events to construct and publish based on business relevance (see ADR-0009 for event policy). Not every transition requires an event — only business milestones with cross-context consumers warrant event publication. Aggregates do not emit events — see ADR-0009 §1.
4. Every invalid transition raises a named domain exception.
5. No external component may set an entity's status directly. All transitions are performed via domain methods on the aggregate root.

### 2. ServicePlan Lifecycle

| Status | Description |
|--------|-------------|
| `DRAFT` | Created but not yet published. Not purchasable. |
| `ACTIVE` | Published and available for purchase. |
| `PAUSED` | Temporarily unavailable for new purchases. Existing subscriptions unaffected. |
| `ARCHIVED` | Permanently retired. Existing subscriptions continue; no new purchases permitted. |
| `DELETED` | Soft-deleted. No new or existing subscriptions may operate. |

**Valid Transitions:**
```
DRAFT → ACTIVE (event: ServicePlanPublished)
ACTIVE → PAUSED (event: ServicePlanPaused)
PAUSED → ACTIVE (event: ServicePlanReactivated)
ACTIVE → ARCHIVED (event: ServicePlanArchived)
PAUSED → ARCHIVED (event: ServicePlanArchived)
ACTIVE → DELETED (event: ServicePlanDeleted) [admin only]
PAUSED → DELETED (event: ServicePlanDeleted) [admin only]
DRAFT → DELETED (event: ServicePlanDeleted)
```

Terminal states: `ARCHIVED`, `DELETED`. No transitions out of terminal states.

### 3. Booking Lifecycle

| Status | Description |
|--------|-------------|
| `PENDING` | Booking request submitted; awaiting confirmation |
| `CONFIRMED` | Session slot reserved and confirmed |
| `CANCELLED_BY_CLIENT` | Cancelled by the client |
| `CANCELLED_BY_PROFESSIONAL` | Cancelled by the professional |
| `CANCELLED_BY_SYSTEM` | Cancelled by system (e.g., AccessGrant revocation) |
| `COMPLETED` | Associated Execution confirmed |
| `NO_SHOW` | Client did not attend; no Execution recorded |

**Valid Transitions:**
```
PENDING → CONFIRMED (event: BookingConfirmed)
PENDING → CANCELLED_BY_CLIENT (event: BookingCancelled)
PENDING → CANCELLED_BY_PROFESSIONAL (event: BookingCancelled)
CONFIRMED → CANCELLED_BY_CLIENT (event: BookingCancelled)
CONFIRMED → CANCELLED_BY_PROFESSIONAL (event: BookingCancelled)
CONFIRMED → CANCELLED_BY_SYSTEM (event: BookingCancelledBySystem)
CONFIRMED → COMPLETED (event: BookingCompleted)
CONFIRMED → NO_SHOW (event: BookingNoShow)
```

**Rescheduling (PENDING | CONFIRMED):**
```
PENDING → PENDING (event: BookingRescheduled — status unchanged; scheduledAtUtc and logicalDay updated)
CONFIRMED → CONFIRMED (event: BookingRescheduled — status unchanged; scheduledAtUtc and logicalDay updated)
```

Rescheduling is not a status transition. It updates `scheduledAtUtc` and `logicalDay` in place and records
`rescheduleCount` and `lastRescheduledAtUtc`. Only bookings in open states (PENDING, CONFIRMED) may be
rescheduled. Terminal states are ineligible (ADR-0022).

Terminal states: All `CANCELLED_*`, `COMPLETED`, `NO_SHOW`.

### 4. AccessGrant Lifecycle

Detailed lifecycle governed by ADR-0046. Summary:

| Status | Description |
|--------|-------------|
| `ACTIVE` | Grant is valid; Execution permitted |
| `EXPIRED` | Past `validUntil` date; no new Execution |
| `REVOKED` | Explicitly revoked; no new Execution |
| `SUSPENDED` | Temporarily suspended (e.g., billing grace period) |

**Valid Transitions:**
```
ACTIVE → EXPIRED (system timer event: AccessGrantExpired)
ACTIVE → REVOKED (event: AccessGrantRevoked)
ACTIVE → SUSPENDED (event: AccessGrantSuspended)
SUSPENDED → ACTIVE (event: AccessGrantReinstated)
SUSPENDED → REVOKED (event: AccessGrantRevoked)
```

Terminal states: `EXPIRED`, `REVOKED`.

### 5. ProfessionalProfile Lifecycle

| Status | Description |
|--------|-------------|
| `PENDING_APPROVAL` | Submitted for review; not operational |
| `ACTIVE` | Approved and operational |
| `SUSPENDED` | Temporarily suspended; cannot accept new bookings |
| `BANNED` | Permanently banned; full operational suspension |
| `DEACTIVATED` | Voluntarily deactivated; historical data retained |
| `CLOSED` | Formally closed (administrative, trial expiry, or system-initiated); historical data retained. Added by ADR-0013 Extension. |

**Valid Transitions:**
```
PENDING_APPROVAL → ACTIVE (event: ProfessionalProfileApproved)
PENDING_APPROVAL → BANNED (event: ProfessionalProfileBanned)
ACTIVE → SUSPENDED (event: ProfessionalProfileSuspended)
ACTIVE → BANNED (event: ProfessionalProfileBanned)
ACTIVE → DEACTIVATED (event: ProfessionalProfileDeactivated)
ACTIVE → CLOSED (event: ProfessionalProfileClosed)
SUSPENDED → ACTIVE (event: ProfessionalProfileReactivated)
SUSPENDED → BANNED (event: ProfessionalProfileBanned)
SUSPENDED → CLOSED (event: ProfessionalProfileClosed)
```

Terminal states: `BANNED`, `DEACTIVATED`, `CLOSED`.

Note: Closure of a ProfessionalProfile (any terminal state) does NOT revoke existing AccessGrants. See ADR-0013 Extension for the complete preservation policy.

### 6. PlatformEntitlement Lifecycle

| Status | Description |
|--------|-------------|
| `TRIAL` | Active during trial period; limited capabilities |
| `ACTIVE` | Fully paid and operational |
| `GRACE_PERIOD` | Payment failed; restricted operations; existing access maintained |
| `SUSPENDED` | Grace period expired; operations blocked |
| `CANCELLED` | Subscription cancelled voluntarily; service winds down |
| `EXPIRED` | Subscription period ended without renewal |

**Valid Transitions:**
```
TRIAL → ACTIVE (event: EntitlementActivated)
TRIAL → EXPIRED (system: EntitlementExpired)
ACTIVE → GRACE_PERIOD (event: EntitlementEnteredGracePeriod)
ACTIVE → CANCELLED (event: EntitlementCancelled)
ACTIVE → EXPIRED (system: EntitlementExpired)
GRACE_PERIOD → ACTIVE (event: EntitlementRestored)
GRACE_PERIOD → SUSPENDED (system: GracePeriodExpired)
GRACE_PERIOD → CANCELLED (event: EntitlementCancelled)
SUSPENDED → ACTIVE (event: EntitlementRestored)
SUSPENDED → CANCELLED (event: EntitlementCancelled)
```

Terminal states: `CANCELLED`, `EXPIRED`.

### 7. Transaction Lifecycle

| Status | Description |
|--------|-------------|
| `PENDING` | Payment initiated; awaiting gateway confirmation |
| `CONFIRMED` | Payment confirmed by gateway |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |
| `CHARGEBACK` | Disputed by client through bank/card issuer |

**Valid Transitions:**
```
PENDING → CONFIRMED (event: PurchaseCompleted)
PENDING → FAILED (event: PaymentFailed)
CONFIRMED → REFUNDED (event: PaymentRefunded)
CONFIRMED → CHARGEBACK (event: ChargebackRegistered)
REFUNDED → CHARGEBACK (event: ChargebackRegistered)
```

Terminal states: `FAILED`, `REFUNDED`, `CHARGEBACK`.

Note: `CHARGEBACK` is a terminal state. A chargeback on a refunded transaction is possible and must be supported.

### 8. Deliverable Lifecycle

A Deliverable is a professional content prescription (TRAINING_PRESCRIPTION, DIET_PLAN, PHYSIOLOGICAL_ASSESSMENT) managed in the `@fittrack/deliverables` bounded context.

| Status | Description |
|--------|-------------|
| `DRAFT` | Created; content is mutable. Not yet assignable via AccessGrant. |
| `ACTIVE` | Content locked (snapshot semantics, ADR-0011 §3). Assignable to clients via AccessGrant. |
| `ARCHIVED` | Permanently retired. No new assignments permitted. Existing references retained for audit. |

**Valid Transitions:**
```
DRAFT → ACTIVE   (no domain event emitted by aggregate — ADR-0009 §1)
DRAFT → ARCHIVED (no domain event emitted by aggregate — ADR-0009 §1)
ACTIVE → ARCHIVED (no domain event emitted by aggregate — ADR-0009 §1)
```

Terminal states: `ARCHIVED`. No transitions out of `ARCHIVED`.

**Invariants specific to Deliverable:**
- A `TRAINING_PRESCRIPTION` Deliverable must have at least one `ExerciseAssignment` before transitioning `DRAFT → ACTIVE` (ADR-0044 §2).
- `addExercise` and `removeExercise` are only permitted in `DRAFT` status. Attempting these operations on `ACTIVE` or `ARCHIVED` raises `DeliverableNotDraftError`.
- `contentVersion` is incremented on every `addExercise` or `removeExercise` call. It tracks the business version of the content and starts at 1.

### 9. Session Lifecycle (Scheduling context)

| Status | Description |
|--------|-------------|
| `SCHEDULED` | Time slot created and available |
| `COMPLETED` | Session occurred; triggers Execution recording |
| `CANCELLED` | Cancelled before occurrence; cascades cancel to associated Bookings |
| `ARCHIVED` | Removed from active listings; record preserved |

**Valid Transitions:**
```
SCHEDULED → COMPLETED  (event: SessionCompleted)
SCHEDULED → CANCELLED  (event: SessionCancelled)
COMPLETED → ARCHIVED   (event: SessionArchived)
CANCELLED → ARCHIVED   (event: SessionArchived)
```

Terminal states: `ARCHIVED`.

Note: Session represents a time slot offered by the professional. Booking (separate aggregate) represents a client reservation in that slot.

Events: `SessionScheduled`, `SessionCompleted`, `SessionCancelled`, `SessionArchived`.

### 10. WorkingAvailability Lifecycle (Scheduling context)

| Status | Description |
|--------|-------------|
| `ACTIVE` | Availability window is active; new bookings permitted |
| `PAUSED` | Temporarily disabled; blocks new bookings; existing bookings unaffected |
| `ARCHIVED` | Permanently removed from active configuration |

**Valid Transitions:**
```
ACTIVE → PAUSED     (event: WorkingAvailabilityPaused)
PAUSED → ACTIVE     (event: WorkingAvailabilityResumed)
ACTIVE → ARCHIVED   (event: WorkingAvailabilityArchived)
PAUSED → ARCHIVED   (event: WorkingAvailabilityArchived)
```

Terminal states: `ARCHIVED`.

Events: `WorkingAvailabilityCreated`, `WorkingAvailabilityUpdated`, `WorkingAvailabilityPaused`, `WorkingAvailabilityResumed`, `WorkingAvailabilityArchived`.

### 11. ProfessionalClientLink Lifecycle (ProfessionalProfile context)

| Status | Description |
|--------|-------------|
| `PENDING_INVITATION` | Invitation sent; awaiting client acceptance |
| `ACTIVE` | Link accepted; professional-client relationship active |
| `SUSPENDED` | Temporarily blocked: professional choice, investigation, or WATCHLIST |
| `ENDED` | Relationship terminated |

**Valid Transitions:**
```
PENDING_INVITATION → ACTIVE    (event: ClientLinkAccepted)
PENDING_INVITATION → ENDED     (event: ClientLinkEnded — invitation rejected or expired)
ACTIVE → SUSPENDED             (event: ClientLinkSuspended)
ACTIVE → ENDED                 (event: ClientLinkEnded)
SUSPENDED → ACTIVE             (event: ClientLinkReactivated)
SUSPENDED → ENDED              (event: ClientLinkEnded)
```

Terminal states: `ENDED`.

Events: `ClientLinkInvited`, `ClientLinkAccepted`, `ClientLinkSuspended`, `ClientLinkReactivated`, `ClientLinkEnded`.

**Invariants specific to ProfessionalClientLink:**
- `PENDING_INVITATION`: No Execution, Scheduling, or Deliverables operations permitted.
- `SUSPENDED`: Does NOT affect existing AccessGrants (non-destructive, consistent with ADR-0020).
- `ENDED`: Does NOT revoke existing AccessGrants. AccessGrants continue until natural expiration.
- Professional `BANNED` → all links automatically transition to `ENDED`.
- A client can have `ACTIVE` links with multiple professionals simultaneously.

### 12. ProductPurchase Lifecycle (Products context)

| Status | Description |
|--------|-------------|
| `COMPLETED` | Purchase confirmed; AccessGrant issued |
| `REFUNDED` | Full refund processed; associated AccessGrants revoked |

**Valid Transitions:**
```
COMPLETED → REFUNDED  (event: ProductPurchaseRefunded)
```

Terminal states: `REFUNDED`.

Events: `ProductPurchaseCompleted`, `ProductPurchaseRefunded`.

**Invariants specific to ProductPurchase:**
- Independent aggregate root (not internal entity of Product, per ADR-0003).
- Refund revokes associated AccessGrants but preserves Executions (non-destructive, per ADR-0020).
- Owned by Products context. Billing owns Transaction.

## Invariants

1. Valid status transitions MAY have a corresponding named domain event. The Application layer (UseCase) decides which events to construct and publish based on business relevance. Not every transition requires an event — only business milestones with cross-context consumers warrant event publication (ADR-0009 §1). Aggregates do not emit events directly.
2. Every invalid status transition raises a named domain exception (never silently succeeds or produces an error from the persistence layer).
3. No entity status is set directly by assignment outside its aggregate root's domain methods.
4. All terminal states have no valid outgoing transitions.
5. Transitions between non-adjacent states are invalid unless explicitly listed above.

## Constraints

- No status value may be added to a status enum without a corresponding ADR amendment defining valid transitions and emitted events.
- Deprecated statuses are never removed from the enum while any persisted record references them.

## Consequences

**Positive:**
- Predictable entity state across all contexts.
- Domain events are always consistent with transitions.
- Invalid state bugs are caught at the domain layer, not the database layer.

**Negative:**
- State machine changes require ADR amendments.
- Complex lifecycle graphs increase domain method verbosity.

## Dependencies

- ADR-0000: Project Foundation (event emission on transition rule)
- ADR-0009: Domain Event Contract (event structure)
- ADR-0012: Enum and Shared Type Governance (status enum management)
- ADR-0013: Soft Delete and Data Retention Policy (CLOSED status and AccessGrant preservation extension)
- ADR-0044: Deliverable Type Expansion Policy (PROGRAM exercise invariant)
- ADR-0046: AccessGrant Lifecycle Policy (detailed AccessGrant states)
