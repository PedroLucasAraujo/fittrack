# ADR-0013 — Soft Delete and Data Retention Policy

## Status

ACCEPTED

## Context

FitTrack manages data with varying sensitivity, criticality, and legal retention requirements:
- Execution records and financial transactions are legally protected and must be preserved indefinitely.
- User-generated content and professional configurations may require eventual cleanup.
- LGPD grants data subjects rights to erasure, which must be balanced against legal retention obligations.

Without a formal data retention and deletion policy, developers inadvertently delete critical records, chargebacks destroy evidence, and compliance requests cannot be handled correctly.

## Decision

### 1. Entity Classification

Entities are classified into four tiers based on retention and deletion policy:

| Tier | Policy | Examples |
|------|--------|---------|
| **Tier 1 — Permanent** | Never deleted, never soft-deleted. Hard deletion is prohibited. | Execution, Transaction, AccessGrant, LedgerEntry, AuditLog |
| **Tier 2 — Retained on Closure** | Entity may be deactivated or closed, but record is permanently retained. | ProfessionalProfile, UserProfile, ServicePlan, Booking |
| **Tier 3 — Soft Delete Permitted** | Soft delete allowed (sets `deletedAt` timestamp). Hard delete prohibited in production. | CatalogItem, RecurringSchedule, WorkingAvailability, FeatureFlag |
| **Tier 4 — Ephemeral** | Hard delete permitted after TTL expiry. | IdempotencyKey (post-TTL), SessionToken, RefreshToken, TempUploadRecord |

### 2. Tier 1 — Permanent Entities

The following invariants apply without exception:

| Entity | Hard Delete | Soft Delete | Deactivation | Notes |
|--------|-------------|-------------|-------------|-------|
| Execution | Prohibited | Prohibited | Prohibited | Governed by ADR-0005 |
| Transaction | Prohibited | Prohibited | Prohibited | Financial record; permanently retained |
| AccessGrant | Prohibited | Prohibited | REVOKED/SUSPENDED status only | Status transitions only; record is never deleted |
| LedgerEntry | Prohibited | Prohibited | Prohibited | Post-MVP; immutable append-only |
| AuditLog | Prohibited | Prohibited | Prohibited | Immutable audit trail |

### 3. Tier 2 — Retained on Closure

| Entity | Closure Mechanism | Historical Record |
|--------|------------------|-------------------|
| ProfessionalProfile | Status → `DEACTIVATED` or `BANNED` | History, Executions, Transactions fully retained |
| UserProfile | Status → `DEACTIVATED` | PII may be anonymized (LGPD); Execution records retain anonymized userId |
| ServicePlan | Status → `ARCHIVED` | Existing subscriptions and AccessGrants unaffected |
| Booking | Status → terminal cancel/complete states | Record retained permanently |

### 4. Tier 3 — Soft Delete Protocol

Soft delete sets `deletedAt` (UTC timestamp) on the record. The record remains in the database but is excluded from all standard queries.

Rules:
- The `deletedAt` field is the exclusive soft-delete mechanism. No boolean `isDeleted` flags.
- Soft-deleted records are never returned to clients in standard API responses.
- Soft-deleted records are included in administrative and audit queries.
- Soft-deleted records may be restored by clearing `deletedAt` (where the use case is defined).
- Soft-deleted records are never hard-deleted except for Tier 4 entities post-TTL.

### 5. LGPD Compliance — Erasure Requests

LGPD erasure requests are handled through **anonymization**, not structural deletion, for Tier 1 and Tier 2 entities.

| Field Category | LGPD Erasure Response |
|---------------|----------------------|
| PII (name, email, phone, CPF) | Replaced with anonymized placeholder: `[ANONYMIZED]` or null |
| Health metrics | Retained (required for legal professional accountability) |
| Financial data | Retained (required for financial reconciliation and anti-fraud) |
| Execution records | Structure retained; PII fields anonymized |
| AuditLog entries | Retained; actor PII may be anonymized |

Anonymization event is logged in AuditLog with `actorId = userId`, `action = 'DATA_ANONYMIZATION_REQUEST'`.

**LGPD erasure does not delete any record from the database.**

### 6. Data Retention Schedule

| Entity | Minimum Retention Period | Notes |
|--------|-------------------------|-------|
| Execution | Permanent | No minimum — permanent by policy |
| Transaction | 5 years minimum | Brazilian financial regulation |
| AccessGrant | 5 years minimum | Financial evidence |
| AuditLog | 5 years minimum | Regulatory compliance |
| ProfessionalProfile | 5 years post-deactivation | Professional accountability |
| Booking | 3 years | Contractual evidence |
| IdempotencyKey | Per TTL (governed by ADR-0007) | Ephemeral |
| SessionToken | Per TTL (governed by ADR-0023) | Ephemeral |

### 7. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Hard-deleting a Tier 1 entity for any reason | Destroys legally required evidence |
| Chargeback triggering deletion of Execution | Explicitly prohibited by ADR-0020 |
| "Undo" functionality that removes historical Executions | No undo of fact records |
| LGPD erasure implemented as row deletion | Incorrect compliance implementation |
| Soft-deleting AccessGrant instead of using status transitions | Status transitions are the correct mechanism |

## Invariants

1. Tier 1 entities are never deleted by any actor, process, or automated operation.
2. Tier 2 entities reach terminal states via domain lifecycle transitions, never via delete operations.
3. LGPD erasure produces field-level anonymization, not row deletion, for Tier 1 and Tier 2 entities.
4. Soft delete uses `deletedAt` field exclusively. No boolean flags.
5. Hard delete is permitted only for Tier 4 entities after their defined TTL expires.

## Constraints

- No database cascade delete is configured for Tier 1 or Tier 2 entity tables.
- Repository interfaces for Tier 1 entities do not expose `delete` methods.
- Retention periods must be enforced by policy; automated purge jobs apply only to Tier 4 entities.

## Consequences

**Positive:**
- Legal defensibility for all historical financial and service delivery records.
- Correct LGPD compliance without data destruction.
- Audit trail integrity maintained by construction.

**Negative:**
- Storage volume grows indefinitely for Tier 1 entities.
- LGPD erasure requires anonymization implementation rather than simple deletion.

## Dependencies

- ADR-0000: Project Foundation (soft delete scope, history permanence)
- ADR-0005: Execution Core Invariant Policy (Execution deletion prohibition)
- ADR-0007: Idempotency Policy (IdempotencyKey TTL and cleanup)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback non-destructive rule)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (LGPD controller obligations)
