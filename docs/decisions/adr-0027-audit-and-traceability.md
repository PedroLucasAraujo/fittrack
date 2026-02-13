# ADR-0027 — Audit and Traceability

## Status

ACCEPTED

## Context

FitTrack manages financial transactions, health data, and access controls that require complete, immutable traceability for legal defense, dispute resolution, regulatory compliance, and security investigation. Without a formal audit log policy, critical events leave no trace, forensic investigation is impossible, and the platform cannot defend against false claims.

## Decision

### 1. AuditLog Architecture

The AuditLog is a Tier 1 permanent entity (governed by ADR-0013). It is append-only and immutable. No AuditLog entry may be modified or deleted after creation.

```typescript
interface AuditLogEntry {
  readonly id: string;             // UUIDv4
  readonly actorId: string;        // userId, or 'SYSTEM' for automated actions
  readonly actorRole: string;      // Role of the actor at time of action
  readonly targetEntityType: string; // e.g., 'Execution', 'AccessGrant', 'Transaction'
  readonly targetEntityId: string; // ID of the affected entity
  readonly action: string;         // Enumerated action code (see Section 2)
  readonly tenantId: string | null; // professionalProfileId if applicable
  readonly occurredAtUtc: string;  // ISO 8601 UTC
  readonly metadata: Record<string, unknown>; // Event-specific context (no PII)
}
```

### 2. Audited Action Catalog

The following actions require an AuditLog entry:

| Action Code | Trigger |
|-------------|---------|
| `RISK_STATUS_CHANGED` | RiskStatus transition for any ProfessionalProfile |
| `ACCESS_GRANT_REVOKED` | AccessGrant moved to REVOKED status |
| `ACCESS_GRANT_SUSPENDED` | AccessGrant moved to SUSPENDED status |
| `ACCESS_GRANT_REINSTATED` | AccessGrant moved back to ACTIVE from SUSPENDED |
| `CHARGEBACK_REGISTERED` | ChargebackRegistered event processed |
| `PAYMENT_REFUNDED` | PaymentRefunded event processed |
| `PLATFORM_ENTITLEMENT_CHANGED` | Any PlatformEntitlement status transition |
| `SERVICE_PLAN_DELETED` | ServicePlan transitioned to DELETED status |
| `EXECUTION_CORRECTION_RECORDED` | ExecutionCorrectionRecorded event |
| `DATA_ANONYMIZATION_REQUEST` | LGPD erasure request processed |
| `ADMIN_CROSS_TENANT_ACCESS` | Admin accessed data in a specific tenant |
| `ADMIN_WRITE_OPERATION` | Admin performed a write operation |
| `ACCOUNT_LOCKED` | Login lockout triggered |
| `REFRESH_TOKEN_THEFT_DETECTED` | Refresh token reuse detected |
| `WEBHOOK_VALIDATION_FAILED` | Webhook failed signature or timestamp validation |
| `AUTHORIZATION_FAILURE` | Authorization policy rejected a use case execution |

### 3. Automated Actor Convention

Actions performed by the system (scheduled jobs, event handlers, expiry timers) use `actorId = 'SYSTEM'` with `actorRole = 'SYSTEM'`. This distinguishes automated actions from human-initiated actions in audit logs.

### 4. AuditLog Separation from Domain Events

| Property | AuditLog | Domain Event |
|----------|----------|-------------|
| Purpose | Human-readable traceability and compliance | Machine-readable inter-context integration |
| Immutability | Always immutable | Always immutable |
| Retention | Permanent (Tier 1) | Until processed; outbox records have configurable TTL |
| Audience | Operators, regulators, compliance | Event consumers, monitoring |
| PII | Excluded (reference IDs only) | Excluded (reference IDs only) |

Both are produced for critical events. They are complementary, not substitutes.

### 5. AuditLog PII Policy

AuditLog entries must not contain:
- Full names, emails, phone numbers, or national IDs.
- Health metric values.
- Financial amounts (only transactionId and type).
- Passwords or credential data.

AuditLog entries reference entities by ID only. Lookup of entity details is performed separately using the referencing ID.

### 6. AuditLog Query Access

| Actor | Access Level |
|-------|-------------|
| Client | Own audit entries only (limited set of action codes) |
| Professional | Own tenant's audit entries |
| Admin | All audit entries with explicit scope |
| Compliance Officer (future) | All audit entries for regulatory scope |

### 7. AuditLog Retention

AuditLog entries are retained for a minimum of 5 years (governed by ADR-0013). No AuditLog entry is purged before this minimum period.

## Invariants

1. AuditLog entries are append-only and immutable after creation.
2. All actions listed in Section 2 produce an AuditLog entry without exception.
3. Automated system actions are attributed to `actorId = 'SYSTEM'`.
4. AuditLog entries never contain PII or sensitive health/financial data.
5. LGPD anonymization requests do not remove AuditLog entries (audit trail is a legal compliance requirement).

## Constraints

- AuditLog writes must not be part of the domain transaction. They are produced as a side effect in the application layer after the domain transaction commits.
- AuditLog writes must be fire-and-forget. A failure to write an AuditLog entry does not roll back the originating operation. AuditLog write failures are logged to the infrastructure monitoring system.
- The AuditLog is not used for application-level debugging or performance monitoring. Separate observability infrastructure serves that purpose.

## Consequences

**Positive:**
- Complete, immutable audit trail for all critical platform events.
- Legal defensibility for all access grant, financial, and risk decisions.
- Regulatory compliance evidence generation.

**Negative:**
- AuditLog volume grows with platform activity.
- AuditLog write failures (non-blocking) require monitoring.

## Dependencies

- ADR-0000: Project Foundation (audit-safe historical records)
- ADR-0013: Soft Delete and Data Retention Policy (AuditLog as Tier 1 entity)
- ADR-0022: Financial Risk Governance Framework (RiskStatus audit requirements)
- ADR-0024: Policy-Based Authorization (admin action audit requirements)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (LGPD compliance audit)
