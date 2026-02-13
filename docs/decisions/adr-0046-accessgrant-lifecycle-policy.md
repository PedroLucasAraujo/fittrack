# ADR-0046 — AccessGrant Lifecycle Policy

## Status

ACCEPTED

## Context

The AccessGrant is the authorization token that connects a confirmed payment to the right to create Execution records. It is referenced in ADR-0015 (ServicePlan and AccessGrant Lifecycle), ADR-0017 (Subscription-First Model), ADR-0024 (Policy-Based Authorization), and ADR-0005 (Execution Core Invariant). These references define that AccessGrant is required but do not formally specify its complete lifecycle, validation protocol, or the precise conditions under which it expires, is revoked, or is suspended. This ADR is the canonical authority for AccessGrant lifecycle policy.

## Decision

### 1. AccessGrant Definition

An AccessGrant is an authorization record that:
- Is created by the Billing context after a payment is confirmed.
- Authorizes a specific client (`clientId`) to receive services under a specific service plan (`servicePlanId`) from a specific professional (`professionalProfileId`).
- Governs the creation of Execution records.
- Is the **single gating mechanism** between payment confirmation and service delivery.

```typescript
interface AccessGrant {
  readonly id: string;                       // UUIDv4; immutable
  readonly clientId: string;                 // The client authorized to receive services
  readonly professionalProfileId: string;    // The tenant; immutable
  readonly servicePlanId: string;            // The service plan being delivered
  readonly transactionId: string;            // The payment that created this grant; immutable
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  readonly sessionAllotment: number | null;  // null = unlimited; set at creation
  sessionsConsumed: number;                  // Incremented on each Execution
  readonly validFrom: string;               // ISO 8601 UTC; immutable
  readonly validUntil: string | null;        // ISO 8601 UTC; null = no time limit
  readonly createdAtUtc: string;
  suspendedAtUtc?: string;
  revokedAtUtc?: string;
  revokedReason?: string;
}
```

### 2. AccessGrant Status Lifecycle

| Status | Description | Terminal? |
|--------|-------------|----------|
| `ACTIVE` | Grant is valid; Execution creation is permitted. | No |
| `EXPIRED` | Time limit (`validUntil`) has passed, or session allotment exhausted. | Yes |
| `REVOKED` | Explicitly terminated due to chargeback, refund, or administrative action. | Yes |
| `SUSPENDED` | Temporarily blocked due to WATCHLIST status or investigation. | No (may be reinstated) |

**Transitions:**
- `ACTIVE` → `EXPIRED`: automatic, triggered by time expiry or session exhaustion.
- `ACTIVE` → `REVOKED`: triggered by `ChargebackRegistered`, `PaymentRefunded`, or admin action.
- `ACTIVE` → `SUSPENDED`: triggered by professional's RiskStatus entering WATCHLIST.
- `SUSPENDED` → `ACTIVE`: triggered by professional's RiskStatus returning to NORMAL.
- `SUSPENDED` → `REVOKED`: triggered by chargeback, refund, or admin action while suspended.
- `EXPIRED` and `REVOKED` are terminal states. No transition out.

### 3. AccessGrant Validity Check Protocol

Before creating an Execution record, the application layer must validate all five conditions:

| Check | Condition |
|-------|-----------|
| 1. Status | `accessGrant.status === 'ACTIVE'` |
| 2. Ownership | `accessGrant.clientId === requestingUserId` |
| 3. Tenant | `accessGrant.professionalProfileId === requestingTenantId` |
| 4. Time | `accessGrant.validUntil === null \|\| currentUtc <= accessGrant.validUntil` |
| 5. Sessions | `accessGrant.sessionAllotment === null \|\| accessGrant.sessionsConsumed < accessGrant.sessionAllotment` |

All five conditions must pass. Failure on any condition blocks Execution creation.

### 4. Session Consumption

When an Execution is created against an AccessGrant:
- `sessionsConsumed` is incremented by 1 within the same domain transaction as Execution creation.
- After increment, if `sessionsConsumed >= sessionAllotment`, the AccessGrant status transitions to `EXPIRED` in the same transaction.
- Session consumption is reversible only through a compensating `ExecutionCorrectionRecorded` event — the session count is decremented, and the grant status may revert from `EXPIRED` to `ACTIVE` if the correction restores valid state.

### 5. Immutability Rules

The following fields are immutable after AccessGrant creation:
- `id`, `clientId`, `professionalProfileId`, `servicePlanId`, `transactionId`
- `sessionAllotment`, `validFrom`, `validUntil`
- `createdAtUtc`

The following fields are mutable:
- `status` (lifecycle transitions only; never arbitrary writes)
- `sessionsConsumed` (incremented on Execution creation)
- `suspendedAtUtc`, `revokedAtUtc`, `revokedReason`

### 6. Revocation Protocol

Revocation is triggered by:
- `ChargebackRegistered` event → AccessGrant revoked; all future Execution creation blocked.
- `PaymentRefunded` event → AccessGrant revoked if refund covers full payment.
- Admin action → AccessGrant revoked with explicit `revokedReason`.

Revocation does not delete or modify historical Execution records created before revocation. Execution records created before revocation remain valid and permanent (ADR-0005).

### 7. Suspension vs Revocation

| Aspect | Suspension | Revocation |
|--------|-----------|-----------|
| Trigger | Professional's RiskStatus → WATCHLIST | Chargeback, refund, admin action |
| Reversibility | Yes (reinstated on NORMAL status return) | No |
| Effect on historical Executions | None | None |
| Effect on future Executions | Blocks | Blocks |
| AuditLog entry | `ACCESS_GRANT_SUSPENDED` | `ACCESS_GRANT_REVOKED` |

## Invariants

1. An AccessGrant in EXPIRED or REVOKED status cannot be used to create Execution records.
2. An AccessGrant in SUSPENDED status cannot be used to create Execution records.
3. `sessionsConsumed` is incremented atomically within the same transaction as Execution creation.
4. An AccessGrant's immutable fields are never modified after creation.
5. Revocation of an AccessGrant does not modify, delete, or invalidate historical Execution records.
6. All AccessGrant status transitions produce AuditLog entries.

## Constraints

- AccessGrant status transitions are performed by the application layer in response to domain events; they are not modified directly by user input.
- The Billing context is the sole creator of AccessGrant records. No other context may create AccessGrant records.
- An AccessGrant carries an explicit `professionalProfileId` (tenant scope) and is scoped accordingly per ADR-0025.

## Consequences

**Positive:**
- Complete, auditable lifecycle with explicit transition rules.
- Session-based and time-based service plans are both supported by the same mechanism.
- Revocation does not corrupt historical service delivery records.

**Negative:**
- Validation check requires reading the AccessGrant from the database on every Execution creation.
- Session exhaustion transition requires atomic increment + status update in one transaction.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (AccessGrant required for all Execution creation)
- ADR-0008: Entity Lifecycle States (AccessGrant formal state machine)
- ADR-0017: Subscription-First Model (AccessGrant is created after payment confirmation)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback triggers revocation)
- ADR-0022: Financial Risk Governance Framework (WATCHLIST triggers suspension)
- ADR-0024: Policy-Based Authorization (AccessGrant as authorization factor)
- ADR-0025: Multi-Tenancy and Data Isolation (AccessGrant tenant-scoped by professionalProfileId)
- ADR-0027: Audit and Traceability (AccessGrant status transitions produce AuditLog entries)
