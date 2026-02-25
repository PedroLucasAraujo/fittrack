# ADR-0017 — Subscription-First Model and AccessGrant

## Status

ACCEPTED

## Context

FitTrack is a subscription-first marketplace. The defining characteristic of this model is that payment confirmation always precedes service delivery. Without a formal specification of the purchase-to-AccessGrant-to-Execution chain, implementations drift toward:
- Delivering services before payment confirmation.
- Granting access based on pending (unconfirmed) transactions.
- Inconsistent authorization checks at Execution creation.

## Decision

### 1. Subscription-First Invariant

**No Execution record may be created without a valid, confirmed AccessGrant.**

The subscription-first flow is:

```
1. Client selects ServicePlan
2. Client initiates purchase → Transaction created (status: PENDING)
3. Payment gateway confirms payment → PurchaseCompleted event
4. Billing context creates AccessGrant (status: ACTIVE)
5. AccessGrant grants right to Execution
6. Professional records service delivery → Execution created
```

Steps 1–4 must complete in sequence before Step 5 is valid. No shortcut or pre-authorization is permitted.

### 2. ServicePlan vs. One-Time Product Distinction

| Type | Description | AccessGrant Type |
|------|-------------|-----------------|
| `RECURRING` ServicePlan | Ongoing subscription with defined duration and session count | Time-bounded AccessGrant with renewal |
| `ONE_TIME` ServicePlan | Single purchase for a defined number of sessions | Fixed-count AccessGrant without renewal |
| `TRIAL` | Platform-initiated trial grant | Time-bounded AccessGrant; limited scope; no financial transaction required |

Key distinction:
- **ServicePlans** deliver ongoing services in sessions (training, consultation, assessment). They produce AccessGrants with `source=SUBSCRIPTION`.
- **One-time Products** are formalized in ADR-0050. They are discrete, non-recurring purchases that produce AccessGrants with `source=PRODUCT_PURCHASE`. `Product`, `ProductVersion`, and `ProductPurchase` are aggregate roots in the Products bounded context. The subscription-first invariant applies: payment confirmation (`Transaction CONFIRMED`) always precedes AccessGrant creation.
- These two types must never be confused. A ServicePlan purchase always produces an AccessGrant with `source=SUBSCRIPTION`. A one-time product purchase produces an AccessGrant with `source=PRODUCT_PURCHASE` (see ADR-0046 §X and ADR-0050).

### 3. Purchase Flow — Formal Specification

| Step | Actor | Action | State Change |
|------|-------|--------|-------------|
| 1 | Client | `InitiatePurchase(servicePlanId)` | Transaction: `PENDING` |
| 2 | Payment Gateway | `ConfirmPayment(transactionId)` via webhook | Webhook validated and processed |
| 3 | Billing Context | Handle `PaymentConfirmed` | Transaction: `PENDING → CONFIRMED`; event: `PurchaseCompleted` |
| 4 | Billing Context | Handle `PurchaseCompleted` | AccessGrant created (status: `ACTIVE`); event: `AccessGrantCreated` |

**Step 3 requires:**
- Webhook signature validation (governed by ADR-0038).
- Idempotency check on the payment webhook event ID (governed by ADR-0007).
- Transaction must be in `PENDING` state. A `CONFIRMED` Transaction does not generate a second AccessGrant.

**Step 4 requires:**
- IdempotencyKey derived from `transactionId` to prevent duplicate AccessGrant creation.
- AccessGrant `validFrom = purchaseConfirmedAtUtc`.
- AccessGrant `validUntil = validFrom + servicePlan.durationDays` (in UTC).

### 4. Trial AccessGrant Protocol

Trial AccessGrants are created without a Transaction:
- Initiated by the platform as part of onboarding.
- Carry `PlanType = TRIAL`.
- Have a bounded duration (configured per platform policy; governed by ADR-0032).
- Do not generate revenue.
- Never convert to a paid AccessGrant automatically. A separate purchase is required.
- A TRIAL AccessGrant is subject to the same lifecycle transitions as a regular AccessGrant (governed by ADR-0015).

### 5. Delivery Authorization Check

Before any Execution is created, the application layer must confirm:
1. A valid AccessGrant exists for `(clientId, professionalProfileId, servicePlanId)`.
2. AccessGrant `status = ACTIVE`.
3. Current UTC time is within `[validFrom, validUntil]`.
4. Professional's `RiskStatus ≠ BANNED`.
5. Professional's PlatformEntitlement is not in `SUSPENDED` status.

All five conditions must be simultaneously true. Failure of any condition rejects the Execution with an explicit reason code logged to AuditLog.

### 6. Delivered Content Permanence

Content that has been delivered (Execution confirmed under a valid AccessGrant) is permanently accessible to the client regardless of subsequent events:
- AccessGrant revocation or expiry does not remove access to completed Execution records.
- Chargeback does not remove access to completed Execution records.
- Professional account deactivation does not remove client access to historical Execution records.

This principle is governed by ADR-0005 (Execution immutability) and ADR-0000 (delivered paid content lifetime accessible).

## Invariants

1. No Execution record is created without a valid, confirmed AccessGrant at the time of creation.
2. AccessGrant is created only in response to a confirmed payment (via `PurchaseCompleted` event) or platform trial initiation. No other trigger is valid.
3. A pending Transaction does not authorize Execution creation.
4. TRIAL AccessGrants do not produce revenue and do not convert automatically to paid grants.
5. Completed Executions are permanently accessible to their clients regardless of subsequent financial or account events.

## Constraints

- The subscription-first constraint is enforced at the application layer in the Execution creation use case. It is not enforced at the domain layer of the Execution aggregate (which is not aware of AccessGrant internals).
- Deferred payment or "pay-later" models are explicitly out of scope and prohibited.
- No context may bypass the AccessGrant validity check by any mechanism.

## Consequences

**Positive:**
- Financial safety by design: service delivery cannot precede payment confirmation.
- Clear audit trail: every Execution is traceable to an AccessGrant, which is traceable to a Transaction.
- Legal defensibility: proof of payment is always linked to proof of delivery.

**Negative:**
- Clients experience a delay between payment initiation and access grant (eventual consistency window, governed by ADR-0016).
- Trial setup requires explicit platform action rather than being implicit.

## Dependencies

- ADR-0000: Project Foundation (subscription-first principle)
- ADR-0005: Execution Core Invariant Policy (AccessGrant non-destructive to Execution)
- ADR-0008: Entity Lifecycle States (AccessGrant lifecycle)
- ADR-0015: ServicePlan and AccessGrant Lifecycle Policy (detailed transition rules)
- ADR-0016: Formal Eventual Consistency Policy (purchase-to-AccessGrant window)
- ADR-0019: Payment Provider Integration (payment confirmation mechanism)
- ADR-0020: Chargeback, Revocation, and History Preservation (post-chargeback delivery rules)
