# ADR-0020 — Chargeback, Revocation, and History Preservation

## Status

ACCEPTED

## Context

In a subscription-first marketplace, payment reversals (chargebacks and refunds) are inevitable. The platform must handle these events without destroying historical service delivery records or creating inconsistent financial state. The core tension is between the client's financial right to dispute a charge and the professional's operational right to have a permanent record of services rendered.

## Decision

### 1. Chargeback Processing Flow

When a `chargeback.created` webhook is received from the payment gateway:

```
1. Gateway webhook received → validated (ADR-0019)
2. Transaction status → CHARGEBACK (event: ChargebackRegistered)
3. AccessGrant status → REVOKED (event: AccessGrantRevoked; reason: CHARGEBACK)
4. Execution records → UNCHANGED (no deletion, no modification)
5. Derived metrics → UNCHANGED
6. AuditLog entry created for chargeback event
7. Professional notified (operational alert, not domain event)
```

Steps 2 and 3 are atomic (within the same transaction for the Transaction and AccessGrant aggregates respectively, coordinated via the event in Step 2).

### 2. Chargeback Non-Destructive Invariant

**A chargeback never deletes, modifies, or retroactively alters any Execution record.**

This invariant is absolute and is reinforced by ADR-0005 (Execution Core Invariant Policy). The reasoning is:
- The professional performed a documented service. That fact is permanent.
- The financial dispute is between the client and their payment provider.
- The platform's historical service delivery record is independent of the financial dispute outcome.

### 3. AccessGrant Revocation on Chargeback

When a chargeback occurs:
- The AccessGrant linked to the charged Transaction is revoked (`REVOKED` status).
- Revocation applies to **future access only**. Past Execution records created under this AccessGrant are permanently retained.
- The client loses access to future sessions under the revoked grant.
- The client retains read access to historical Execution records from completed sessions (per ADR-0000 delivered content permanence principle).

### 4. Refund Processing Flow

When a `refund.created` webhook is received:

```
1. Gateway webhook received → validated
2. Transaction status → REFUNDED (event: PaymentRefunded)
3. AccessGrant behavior → determined by refund policy configuration:
   a. IMMEDIATE_REVOKE: AccessGrant → REVOKED immediately
   b. PERIOD_PRESERVE: AccessGrant remains ACTIVE until validUntil
4. Execution records → UNCHANGED
5. AuditLog entry created
```

Refund policy (IMMEDIATE_REVOKE vs. PERIOD_PRESERVE) is configurable (ADR-0032). The default is `PERIOD_PRESERVE` for full refunds of unexpired plans.

### 5. Partial Refund Policy

Partial refunds do not alter AccessGrant status in MVP. Full refund triggers the policy in Section 4. Partial refund processing is tracked in Transaction metadata only.

### 6. Chargeback Win/Loss Outcome (Post-MVP)

| Outcome | Platform Response |
|---------|-----------------|
| Chargeback won (platform wins dispute) | AccessGrant reinstated if not expired; LedgerEntry reversal created |
| Chargeback lost (client wins dispute) | AccessGrant remains REVOKED; LedgerEntry compensation created |

Chargeback dispute outcome events are processed after MVP when the Ledger (ADR-0021) is implemented.

### 7. Chargeback and logicalDay

Chargeback processing does not alter the `logicalDay` field on any Execution record. The temporal record of when a service was performed is immutable (ADR-0010 and ADR-0005).

### 8. Audit Requirements for Chargeback

Every chargeback event must produce an AuditLog entry containing:
- `chargebackId` (gateway-provided)
- `transactionId`
- `accessGrantId`
- `professionalProfileId`
- `clientId`
- `chargebackAmountCents`
- `occurredAtUtc`
- `actorId = 'SYSTEM'`

## Invariants

1. Chargeback never deletes or modifies any Execution record. (See ADR-0005.)
2. Chargeback never deletes or modifies the Transaction record. Transaction status transitions to CHARGEBACK only.
3. Chargeback never alters logicalDay on any historical entity. (See ADR-0010.)
4. Every chargeback event produces an AuditLog entry.
5. AccessGrant revocation on chargeback applies only to future access, not to historical records.
6. Refund and chargeback processing is always idempotent. (See ADR-0007.)

## Constraints

- Chargeback processing is handled exclusively by the Billing context via the webhook integration (ADR-0019).
- No bounded context other than Billing may initiate an AccessGrant revocation.
- Chargeback dispute outcome handling (win/loss) is deferred to post-MVP Ledger implementation.

## Consequences

**Positive:**
- Historical service delivery records are protected from financial disputes.
- Clear legal separation between service fact (Execution) and financial right (Transaction/AccessGrant).
- Professionals have permanent proof of services rendered regardless of chargeback outcome.

**Negative:**
- Clients may lose future access while retaining read-only access to past Executions.
- Complex partial refund scenarios require manual handling in MVP.

## Dependencies

- ADR-0000: Project Foundation (chargeback non-destructive principle)
- ADR-0005: Execution Core Invariant Policy (Execution immutability under chargeback)
- ADR-0007: Idempotency Policy (chargeback idempotency)
- ADR-0008: Entity Lifecycle States (Transaction and AccessGrant transitions)
- ADR-0010: Canonical Temporal Policy (logicalDay immutability under chargeback)
- ADR-0019: Payment Provider Integration (chargeback webhook handling)
- ADR-0021: Immutable Financial Ledger (chargeback reconciliation post-MVP)
