# ADR-0015 — ServicePlan and AccessGrant Lifecycle Policy

## Status

ACCEPTED

## Context

ServicePlan and AccessGrant are the two central entities governing service availability and delivery authorization in FitTrack. Their lifecycle transitions have direct financial and operational consequences:

- ServicePlan transitions affect whether new purchases are permitted.
- AccessGrant transitions affect whether Execution records can be created.
- Incorrect lifecycle handling creates service delivery without payment, or payment without service delivery.

This ADR supersedes the previous content of this slot (which was a duplicate of the temporal policy, now consolidated in ADR-0010). This ADR formally defines the detailed lifecycle rules for ServicePlan and AccessGrant, complementing the summary state machines in ADR-0008.

## Decision

### 1. ServicePlan Lifecycle — Detailed Rules

**ServicePlan states and operational constraints:**

| State | Purchasable | Existing Subscriptions Active | New Bookings | Notes |
|-------|-------------|------------------------------|-------------|-------|
| `DRAFT` | No | N/A | No | Not visible to clients |
| `ACTIVE` | Yes | Yes | Yes | Fully operational |
| `PAUSED` | No | Yes | No | Professional on pause; existing clients retain access |
| `ARCHIVED` | No | Yes (until expiry) | No | Permanently retired; no new sales |
| `DELETED` | No | No | No | Admin-only; destroys operational availability |

**Transition enforcement rules:**

1. A ServicePlan may only transition to `ACTIVE` if all required fields (name, price, session count, duration) are fully populated. Incomplete ServicePlans remain in `DRAFT`.
2. A ServicePlan transition to `PAUSED` does not revoke or suspend any existing AccessGrant. All currently active subscriptions continue until their `validUntil` date.
3. A ServicePlan transition to `ARCHIVED` does not revoke or suspend any existing AccessGrant. New purchases are prevented from the moment of archival.
4. A ServicePlan transition to `DELETED` is an administrative action that triggers `AccessGrantSuspended` for all currently active AccessGrants linked to the plan. This is the only ServicePlan transition that has a direct impact on existing AccessGrants.
5. Only a professional with `RiskStatus = NORMAL` may transition a ServicePlan from `DRAFT` to `ACTIVE`.
6. A professional with `RiskStatus = BANNED` may not operate any ServicePlan. All active plans for a BANNED professional are forced to `PAUSED`.

### 2. AccessGrant Lifecycle — Detailed Rules

AccessGrant is the authorization token that permits Execution creation. Its lifecycle is governed by Billing events and time-based expiry.

**AccessGrant states and operational constraints:**

| State | Execution Permitted | New Bookings | Notes |
|-------|--------------------|----|-------|
| `ACTIVE` | Yes | Yes | Fully operational |
| `SUSPENDED` | No | No | Temporary suspension (grace period, RiskStatus change) |
| `EXPIRED` | No | No | Natural expiry after `validUntil` |
| `REVOKED` | No | No | Permanent; cannot be reinstated |

**Transition enforcement rules:**

1. AccessGrant is created exclusively by the Billing context after `PurchaseCompleted` event confirmation. No other context may create an AccessGrant.
2. AccessGrant creation requires a `validFrom` (UTC) and `validUntil` (UTC) date range. `validFrom` must be less than or equal to `validUntil`. Duration is determined by the ServicePlan configuration.
3. `ACTIVE → SUSPENDED` is triggered by:
   - PlatformEntitlement entering `GRACE_PERIOD` status.
   - Professional's `RiskStatus` changing to `WATCHLIST` (operational restriction) or `BANNED`.
4. `SUSPENDED → ACTIVE` (reinstatement) is triggered by:
   - PlatformEntitlement restored from `GRACE_PERIOD` to `ACTIVE`.
   - Professional's `RiskStatus` restored to `NORMAL` (if suspension was risk-based).
5. `ACTIVE → EXPIRED` is a time-based system transition triggered when the current UTC time exceeds `validUntil`.
6. `ACTIVE → REVOKED` and `SUSPENDED → REVOKED` are permanent. Revocation is triggered by:
   - Chargeback on the originating Transaction (revocation is configurable per business rules; default: revoke future access, retain historical Execution records).
   - Administrative override.
7. An `EXPIRED` or `REVOKED` AccessGrant is **never** reinstated. A new purchase must be made to obtain a new AccessGrant.
8. Revocation of an AccessGrant does not delete or alter any Execution records created under that grant. This is governed by ADR-0005.

### 3. AccessGrant Fields

| Field | Type | Invariant |
|-------|------|-----------|
| `id` | UniqueEntityId | Immutable after creation |
| `transactionId` | UniqueEntityId | Reference to originating Transaction; immutable |
| `clientId` | UniqueEntityId | Immutable |
| `professionalProfileId` | UniqueEntityId | Immutable |
| `servicePlanId` | UniqueEntityId | Immutable |
| `validFrom` | UTC timestamp | Immutable |
| `validUntil` | UTC timestamp | Immutable |
| `status` | AccessGrantStatus | Transitions via domain methods only |
| `revokedAtUtc` | UTC timestamp (nullable) | Set on revocation; never cleared |
| `revokedReason` | string (nullable) | Set on revocation; never cleared |
| `createdAtUtc` | UTC timestamp | Immutable |

### 4. AccessGrant Validity Check Protocol

Before creating an Execution, the application layer must verify:
1. An AccessGrant exists for the `(clientId, professionalProfileId, servicePlanId)` combination.
2. The AccessGrant `status` is `ACTIVE`.
3. The current UTC time is within `[validFrom, validUntil]`.
4. The professional's `RiskStatus` is not `BANNED`.

If any check fails, Execution creation is rejected. The rejection reason is logged in AuditLog.

## Invariants

1. An AccessGrant is created only by the Billing context in response to `PurchaseCompleted`.
2. An EXPIRED or REVOKED AccessGrant is never reinstated.
3. AccessGrant revocation does not alter any Execution record created under the grant.
4. ServicePlan pausing or archiving does not revoke or suspend existing AccessGrants (except ServicePlan deletion, which suspends).
5. A BANNED professional's ServicePlans are all forced to PAUSED; no new Executions are permitted.
6. `validFrom` and `validUntil` on an AccessGrant are immutable after creation.

## Constraints

- AccessGrant creation is strictly a post-`PurchaseCompleted` operation. No other application use case may create an AccessGrant directly.
- The Execution context does not hold a reference to AccessGrant internals. It validates AccessGrant via application-layer policy only.

## Consequences

**Positive:**
- Clear financial-to-operational link: every active Execution is backed by a valid AccessGrant.
- Service continuity during grace periods (suspension vs. revocation distinction).
- Professional risk governance directly controls service delivery.

**Negative:**
- Complex state machine with multiple suspension triggers.
- Reinstatement logic must handle multiple concurrent suspension causes.

## Dependencies

- ADR-0000: Project Foundation (subscription-first principle)
- ADR-0005: Execution Core Invariant Policy (AccessGrant revocation non-destructive to Execution)
- ADR-0008: Entity Lifecycle States (summary state machines)
- ADR-0017: Subscription-First Model (purchase-to-AccessGrant flow)
- ADR-0018: Billing, Credits, Trials, and Grace Period (grace period impact on AccessGrant)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback-triggered revocation)
- ADR-0022: Financial Risk Governance Framework (RiskStatus impact on AccessGrant)
- ADR-0046: AccessGrant Lifecycle Policy (complementary detailed specification)
