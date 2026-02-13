# ADR-0018 — Billing, Credits, Trials, and Grace Period

## Status

ACCEPTED

## Context

The Billing context manages the lifecycle of professional subscriptions to the platform (PlatformEntitlement), internal credits, trial periods, and grace periods when payments fail. Without a formal policy, payment failures produce abrupt service disruptions, internal credits create unintended financial exposure, and trials generate fictitious revenue in reporting.

## Decision

### 1. PlatformEntitlement Structure

PlatformEntitlement governs a professional's operational rights on the platform (distinct from a client's AccessGrant which governs session delivery rights).

| Field | Type | Description |
|-------|------|-------------|
| `id` | UniqueEntityId | Immutable |
| `professionalProfileId` | UniqueEntityId | Immutable |
| `status` | EntitlementStatus | Lifecycle governed by ADR-0008 |
| `currentPeriodStartUtc` | UTC timestamp | Start of current billing period |
| `currentPeriodEndUtc` | UTC timestamp | End of current billing period (`activeUntil`) |
| `gracePeriodUntil` | UTC timestamp (nullable) | Deadline for payment during grace period |
| `planTier` | string | Platform subscription tier |
| `createdAtUtc` | UTC timestamp | Immutable |

### 2. Grace Period Policy

When a recurring payment fails, the PlatformEntitlement enters `GRACE_PERIOD` status rather than immediately suspending the professional's operations.

**During GRACE_PERIOD:**
- New ServicePlan sales are blocked (new purchases not permitted).
- New Bookings are blocked.
- Existing confirmed Bookings continue.
- Existing ACTIVE AccessGrants transition to `SUSPENDED` (governed by ADR-0015).
- The professional's dashboard remains accessible.
- `gracePeriodUntil` is set to `paymentFailedAtUtc + gracePeriodDays` (configuration-driven; governed by ADR-0032).

**Grace period recovery:**
- If payment succeeds within the grace period: PlatformEntitlement returns to `ACTIVE`. Suspended AccessGrants are reinstated.
- If payment fails after grace period expires: PlatformEntitlement transitions to `SUSPENDED`. All suspended AccessGrants remain `SUSPENDED` (no automatic revocation).

**Grace period duration:** Configurable (default: 7 days). Not a domain constant; governed by ADR-0032.

### 3. Internal Credits Policy

Internal credits are platform-issued virtual currency units for promotional, referral, or compensatory purposes.

| Rule | Statement |
|------|-----------|
| Non-transferable | Credits are bound to one professionalProfileId and cannot be transferred |
| Non-cashable | Credits cannot be converted to real currency or withdrawn |
| Expiry | Credits expire at the end of the billing cycle in which they were issued unless explicitly extended |
| Non-reimbursable | Expired unused credits are not refunded |
| No substitution | Credits cannot substitute for the full subscription fee (partial credit application is a future feature, not MVP) |
| No external value | Credits are not reported as revenue. They are platform incentives only |

### 4. Trial Period Policy

| Rule | Statement |
|------|-----------|
| Initiation | Trials are initiated by platform logic during professional onboarding |
| No transaction required | TRIAL AccessGrants are created without a financial Transaction |
| Duration | Bounded; configuration-driven (governed by ADR-0032) |
| No automatic conversion | A trial does not automatically convert to a paid subscription |
| No credit generation | Trial periods do not generate credits or revenue |
| Separate purchase required | After trial expiry, the professional must complete a purchase to access paid features |
| Reporting | Trial usage is tracked separately from paid usage in analytics |

### 5. Payment Failure Handling

| Scenario | System Response |
|----------|----------------|
| First payment failure | PlatformEntitlement → `GRACE_PERIOD`; all AccessGrants → `SUSPENDED`; event: `EntitlementEnteredGracePeriod` |
| Payment success during grace period | PlatformEntitlement → `ACTIVE`; suspended AccessGrants → `ACTIVE`; event: `EntitlementRestored` |
| Grace period expiry without payment | PlatformEntitlement → `SUSPENDED`; event: `GracePeriodExpired` |
| Payment success after suspension | PlatformEntitlement → `ACTIVE`; AccessGrants remain `SUSPENDED` until professional re-activates them (operator action required) |

### 6. New Sales Restriction

A professional in `GRACE_PERIOD` or `SUSPENDED` PlatformEntitlement status may not:
- Create new ServicePlans.
- Accept new ServicePlan purchases from clients.
- Confirm new Bookings.

Existing relationships (previously active Executions, AccessGrants, and Bookings) are not retroactively cancelled by grace period or suspension, except where explicitly governed by chargeback policy (ADR-0020).

## Invariants

1. PlatformEntitlement never enters GRACE_PERIOD without a payment failure event trigger.
2. AccessGrants are never suspended by billing state changes without an audit log entry.
3. Suspended AccessGrants during grace period are reinstated if and only if the PlatformEntitlement is fully restored.
4. Credits are never reported as revenue in financial aggregations.
5. Trial grants do not require a Transaction record and do not produce one.
6. No ServicePlan purchase is permitted while PlatformEntitlement is in GRACE_PERIOD or SUSPENDED.

## Constraints

- Grace period duration, trial duration, and credit expiry are configuration-driven values managed in environment configuration (ADR-0032). They are not domain constants.
- Partial credit application toward subscription fees is out of scope for MVP.

## Consequences

**Positive:**
- Payment failures do not cause abrupt service disruption for existing clients.
- Clear separation between platform credits (incentive) and real financial transactions.
- Trial accounting is clean: no phantom revenue.

**Negative:**
- Grace period creates a window where the platform provides value without confirmed payment.
- Suspension recovery requires operator action for some AccessGrant types.

## Dependencies

- ADR-0008: Entity Lifecycle States (PlatformEntitlement lifecycle)
- ADR-0015: ServicePlan and AccessGrant Lifecycle Policy (AccessGrant suspension during grace period)
- ADR-0017: Subscription-First Model (purchase prerequisites)
- ADR-0019: Payment Provider Integration (payment failure events)
- ADR-0022: Financial Risk Governance Framework (risk classification impact on billing)
- ADR-0032: Deploy, Environments, and Configuration (grace period duration configuration)
