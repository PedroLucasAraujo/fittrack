# ADR-0022 — Financial Risk Governance Framework

## Status

ACCEPTED — CANONICAL

## Context

FitTrack applies professional risk classification (RiskStatus) to govern financial and operational behavior. Risk governance rules appear in multiple ADRs (formerly ADR-0039, ADR-0041, ADR-0046) without a consolidated framework, creating redundancy and inconsistency.

This ADR supersedes the previous content of this slot (which was a duplicate of ADR-0021). It consolidates all financial risk governance into a single canonical framework. All ADRs referencing RiskStatus financial impact must cite this ADR as the canonical authority.

## Decision

### 1. RiskStatus Definition

`RiskStatus` is an enumerated classification of a ProfessionalProfile's financial and operational standing on the platform.

| Status | Meaning | Operational Impact |
|--------|---------|-------------------|
| `NORMAL` | No risk indicators; full platform access | No restrictions |
| `WATCHLIST` | Risk indicators present; monitoring active | Operational restrictions (see Section 3) |
| `BANNED` | Confirmed violation or persistent risk; permanent suspension | Full operational suspension (see Section 4) |

RiskStatus is owned by the Risk bounded context (governed by ADR-0001). It is referenced by Billing, Scheduling, and Execution contexts for authorization decisions.

### 2. RiskStatus Transition Rules

| Transition | Trigger | Emitted Event |
|-----------|---------|--------------|
| `NORMAL → WATCHLIST` | Risk threshold exceeded (high chargeback rate, dispute volume, suspicious pattern) | `RiskStatusChanged` |
| `NORMAL → BANNED` | Confirmed violation, fraud, or platform abuse | `RiskStatusChanged` |
| `WATCHLIST → NORMAL` | Risk indicators resolved; manual review passed | `RiskStatusChanged` |
| `WATCHLIST → BANNED` | Escalation from watchlist monitoring | `RiskStatusChanged` |
| `BANNED → *` | Terminal state; no transitions out of BANNED | None |

BANNED is a terminal state. A BANNED professional may not recover to NORMAL or WATCHLIST by any mechanism.

Every RiskStatus transition produces an AuditLog entry with the actor, timestamp, reason, and previous/new status.

### 3. WATCHLIST Operational Restrictions

A professional classified as `WATCHLIST` is subject to the following restrictions:

| Restriction | Description |
|-------------|-------------|
| Hard limit reduction | Maximum concurrent open ServicePlans reduced (governed by ADR-0041) |
| Long-plan block | ServicePlans longer than a configured maximum duration are blocked |
| New plan requires review | New ServicePlan activation requires platform review (feature-flagged) |
| AccessGrant suspension | Existing AccessGrants may be suspended pending review (operator-triggered, not automatic) |
| Financial monitoring | All transactions are flagged for enhanced monitoring |

### 4. BANNED Operational Suspension

A professional classified as `BANNED` is subject to full operational suspension:

| Action | Outcome |
|--------|---------|
| All active ServicePlans | Forced to `PAUSED` status |
| All active AccessGrants | Forced to `SUSPENDED` status |
| New purchases | Blocked |
| New Bookings | Blocked |
| New Execution creation | Blocked |
| Platform entitlement | Suspended (no new billing cycle) |
| Existing Execution history | Permanently retained; read-accessible to authorized parties |
| Existing Transaction history | Permanently retained |

BANNED status never alters historical Execution records. The service delivery history is preserved regardless of risk status.

### 5. Risk Assessment Triggers

The following events trigger risk assessment evaluation:

| Trigger Event | Risk Signal |
|--------------|-------------|
| `ChargebackRegistered` | Chargeback rate calculation; threshold: >2% of transactions in rolling 30 days |
| `PaymentFailed` (repeated) | Multiple consecutive payment failures |
| `BookingCancelled` (high rate by professional) | Professional-initiated cancellation rate >20% in rolling 30 days |
| Administrative report | Manual flag by platform operator |

### 6. Financial Risk Governance and Ledger (Post-MVP)

When the Ledger (ADR-0021) is activated:
- Chargeback reversals are tracked in LedgerEntries for each BANNED or WATCHLIST professional.
- Net negative balance professionals are escalated to WATCHLIST automatically.
- BANNED professional historical entries remain in the Ledger for audit purposes.

### 7. Risk Governance and Compliance

- Every RiskStatus change is logged in AuditLog.
- RiskStatus history is retained permanently (AuditLog is Tier 1 — governed by ADR-0013).
- LGPD erasure requests do not remove RiskStatus history from AuditLog (financial compliance obligation).
- Platform is not liable for professional conduct, but must demonstrate it applies risk controls (LGPD and marketplace regulation compliance).

## Invariants

1. BANNED is a terminal RiskStatus. No transition out of BANNED is permitted under any circumstance.
2. RiskStatus changes never alter historical Execution or Transaction records.
3. Every RiskStatus transition emits `RiskStatusChanged` domain event and produces an AuditLog entry.
4. AccessGrant suspension on BANNED is immediate (target: within the RiskStatusChanged consistency window per ADR-0016).
5. Historical data for BANNED professionals is retained permanently; only operational access is suspended.
6. Chargeback rate threshold for automatic WATCHLIST escalation is configurable (ADR-0032). It is not a domain constant.

## Constraints

- The Risk context owns RiskStatus. No other context may directly modify it.
- Billing and Scheduling contexts read RiskStatus via application-layer policy; they do not modify it.
- Risk assessment automation is applied via event handlers consuming Billing domain events. The Risk context does not directly subscribe to Execution events in MVP.
- **Cross-context repository port placement**: `IProfessionalRiskRepository` is intentionally placed in `application/ports/` rather than `domain/repositories/`. Because it operates on `ProfessionalProfile` (owned by the Identity context), placing it in the domain layer would require importing `@fittrack/identity` from within the Risk domain, violating bounded-context isolation (ADR-0001 §4). The application layer is the correct boundary for cross-context interactions. The infrastructure adapter for this port delegates to the same database schema as the Identity context's repository but is registered as a separate bean (ADR-0047 §7).

## Consequences

**Positive:**
- Consolidated, auditable risk governance framework.
- Chargeback and dispute management has a defined escalation path.
- Financial exposure from high-risk professionals is bounded by operational restrictions.

**Negative:**
- BANNED professional's clients lose access to future services (expected consequence).
- Chargeback rate calculation requires reliable event stream for accuracy.

## Dependencies

- ADR-0000: Project Foundation (risk management non-destructive principle)
- ADR-0005: Execution Core Invariant Policy (risk changes non-destructive to Execution)
- ADR-0008: Entity Lifecycle States (RiskStatus transitions)
- ADR-0016: Formal Eventual Consistency Policy (RiskStatus enforcement window)
- ADR-0021: Immutable Financial Ledger (post-MVP risk financial tracking)
- ADR-0027: Audit and Traceability (RiskStatus audit requirements)
- ADR-0041: Operational Hard Limits (WATCHLIST limit reduction)
