# ADR-0005 — Execution Core Invariant Policy

## Status

ACCEPTED — CANONICAL

## Context

The Execution entity is the foundational source of truth for all service delivery in FitTrack. Multiple bounded contexts (Billing, Risk, Scheduling, Metrics, Audit) reference or derive data from Execution records. The immutability and permanence of Execution records is a non-negotiable architectural invariant that must be formally specified and centrally referenced.

This ADR supersedes and consolidates all implicit or scattered references to Execution immutability found in other ADRs. All ADRs referencing Execution immutability must cite this document as the canonical authority.

Previously, this slot contained a duplicate of ADR-0004. This ADR replaces that duplicate with the canonical Execution invariant policy.

## Decision

### 1. Execution Definition

An **Execution** is an immutable record that documents the fact that a specific service (as defined by a Deliverable) was performed by or for a specific client on a specific logicalDay under a specific AccessGrant.

Execution is the authoritative record. No derived entity (Metric, SelfLog, projection, read model, or report) supersedes or replaces an Execution record.

### 2. Execution Immutability Rule

**An Execution record, once persisted, is permanently immutable.**

| Operation | Permitted | Notes |
|-----------|-----------|-------|
| Create | Yes | One-time, at the moment of service delivery |
| Read | Yes | Unrestricted by any role |
| Update | No | Prohibited under all circumstances |
| Delete (soft) | No | Prohibited |
| Delete (hard) | No | Prohibited |
| Retroactive alteration | No | Including system migrations, corrections, or bulk updates |

### 3. Execution Permanence Rule

**An Execution record is retained permanently and is never subject to deletion.**

The following events do not alter or delete Execution records:
- Chargeback or financial dispute on the associated Transaction.
- Revocation of the associated AccessGrant.
- Account closure or deactivation of the associated User or ProfessionalProfile.
- RiskStatus change to WATCHLIST or BANNED for the associated professional.
- LGPD deletion request (anonymization of PII fields is permitted; structural deletion of the Execution record is not — see ADR-0028).
- Any platform operational event.

### 4. Execution Correction Protocol

**Corrections to erroneously recorded Executions are handled by compensating records, not by modification.**

If an Execution was recorded in error:
- A correction event (`ExecutionCorrectionRecorded`) is emitted referencing the original `executionId`.
- The correction event documents the error and its resolution.
- The original Execution record is unchanged.
- Derived metrics (Metrics context) may be recomputed using the correction record via an explicit job (governed by ADR-0043).

### 5. Execution logicalDay Invariant

The `logicalDay` field of an Execution record is set at creation time and never modified, even if the user subsequently changes their timezone. This is governed by ADR-0010.

### 6. Execution and AccessGrant Relationship

An Execution may only be created when a valid AccessGrant exists for the client, professional, and service scope at the time of Execution creation. However:
- A subsequent revocation of the AccessGrant does not invalidate or delete the Execution.
- A chargeback on the originating Transaction does not delete the Execution.
- Historical access to completed Execution records is permanent for authorized parties.

### 7. Execution and Metrics Relationship

Metrics are derived from Execution records via the Metrics context (governed by ADR-0014 and ADR-0043). The following invariants hold:
- Metrics are always derived; they are never the primary record.
- A metric references its source Execution via `derivedFromExecutionId`.
- A metric carries the `derivationRuleVersion` at which it was computed.
- Recomputation of metrics does not alter the source Execution.

### 8. Fields Required on Every Execution Record

| Field | Type | Invariant |
|-------|------|-----------|
| `id` | UniqueEntityId | Globally unique, immutable after creation |
| `professionalProfileId` | UniqueEntityId | Never null, never changed |
| `clientId` | UniqueEntityId | Never null, never changed |
| `accessGrantId` | UniqueEntityId | Never null at creation; record is preserved if grant is later revoked |
| `deliverableId` | UniqueEntityId | References the snapshot; never changed |
| `occurredAtUtc` | UTC timestamp | Set at creation; never changed |
| `logicalDay` | ISO date string (YYYY-MM-DD) | Set at creation per ADR-0010; never changed |
| `timezoneUsed` | IANA timezone string | Timezone of the user at creation time; never changed |
| `status` | ExecutionStatus enum | Transitions defined in Section 9 below |
| `createdAtUtc` | UTC timestamp | System-assigned; never changed |

### 9. Execution Status Lifecycle

| Status | Description | Valid Preceding States | Valid Transitions |
|--------|-------------|----------------------|------------------|
| `PENDING` | Execution initiated but not yet confirmed | — (initial state) | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Execution confirmed as completed | `PENDING` | None (terminal state) |
| `CANCELLED` | Execution cancelled before confirmation | `PENDING` | None (terminal state) |

- Once in `CONFIRMED` or `CANCELLED`, no further status transition is permitted.
- A `CONFIRMED` Execution is the trigger for metric derivation.
- A `CANCELLED` Execution is retained permanently; it is never deleted.

## Invariants

1. Execution records are immutable after creation. No field may be modified after the initial `save` operation.
2. Execution records are never deleted by any event, process, or actor.
3. `logicalDay` on an Execution is set at creation time and never recomputed.
4. An Execution in `CONFIRMED` or `CANCELLED` status has no valid further state transitions.
5. Metrics derived from an Execution never supersede the Execution as source of truth.
6. The absence or revocation of an AccessGrant does not alter existing Execution records.

## Constraints

- This ADR is the single canonical reference for Execution immutability. No other ADR may redefine this invariant independently.
- ADR-0024, ADR-0037, ADR-0046 reference this ADR when citing Execution immutability.
- Any code implementing Execution persistence must enforce the immutability constraint at the repository level (no update methods exposed on the Execution repository beyond status-flag-only transitions).

## Consequences

**Positive:**
- Audit-safe service delivery history by construction.
- Chargebacks, disputes, and account changes cannot erase historical service records.
- Clear legal defensibility for service delivery claims.
- Metrics recomputation is safe because the source is always intact.

**Negative:**
- Correction of erroneous Execution records requires a compensating event workflow instead of a simple data fix.
- Long-term storage costs increase monotonically with platform usage.

## Dependencies

- ADR-0000: Project Foundation (Execution immutability principle)
- ADR-0010: Canonical Temporal Policy (logicalDay invariant)
- ADR-0014: Projections and Derived Metrics (metric derivation rules)
- ADR-0017: Subscription-First Model (AccessGrant prerequisite for Execution)
- ADR-0020: Chargeback, Revocation, and History Preservation (chargeback non-destructive rule)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (LGPD anonymization vs deletion)
- ADR-0043: Metric Evolution and DerivationRuleVersion (correction recomputation protocol)
