# ADR-0053 — Risk Triggers and Threshold Policy

## Status

ACCEPTED

## Context

ADR-0022 (Financial Risk Governance Framework) defines RiskStatus transitions and lists the events
that trigger risk assessment (§5), but does not formalize the exact threshold values or the domain
representation of those thresholds. This left threshold logic scattered across use cases as magic
numbers, which violates the no-magic-numbers principle and makes threshold changes operationally
unsafe.

Additionally, as the Risk module gained automated assessment use cases (payment failure rate and
professional-initiated cancellation rate), a canonical definition became necessary for:

1. What constitutes a threshold exceedance for each metric type.
2. How metric payloads are validated before entering domain logic.
3. Which bounded context is responsible for pre-computing metric values.

This ADR formalizes the above and introduces two value objects to encode these concerns.

## Decision

### 1. Automated Escalation Triggers

The following automated triggers cause a NORMAL ProfessionalProfile to be escalated to WATCHLIST.
All automated use cases only escalate to WATCHLIST; escalation to BANNED requires a human-initiated
administrative action (ProcessAdministrativeRiskReport).

| Signal | Threshold | Window | Comparison |
|--------|-----------|--------|------------|
| Payment failures | ≥ 3 failures | 30 days | Count-based (integer, inclusive `>=`) |
| Professional-initiated cancellation rate | > 30% of sessions | 14 days | Rate-based (decimal 0–1, exclusive `>`) |

### 2. RiskThreshold Value Object

`RiskThreshold` is an immutable value object that carries the four threshold parameters. It has no
identity and is compared structurally (extends `ValueObject<T>` from `@fittrack/core`).

Default values are accessible via `RiskThreshold.defaults()`. Use cases that perform automated
assessment MUST call `RiskThreshold.defaults()` to obtain the canonical thresholds. Custom
thresholds may be constructed via `RiskThreshold.create(props)` for future configurability.

Properties:

| Property | Type | Default | Constraint |
|----------|------|---------|-----------|
| `paymentFailureLimit` | positive integer | 3 | ≥ 1 |
| `cancellationRateLimit` | float [0, 1] | 0.30 | inclusive boundaries |
| `paymentWindowDays` | positive integer | 30 | ≥ 1 |
| `cancellationWindowDays` | positive integer | 14 | ≥ 1 |

### 3. RiskIndicators Value Object

`RiskIndicators` is an immutable value object representing a single observation payload received
from the infrastructure layer.

Infrastructure event handlers are responsible for pre-computing metric counts and rates from
external data sources before constructing `RiskIndicators`. The Risk context performs no
cross-context queries — this preserves bounded-context isolation (ADR-0001 §4).

Properties:

| Property | Type | Constraint |
|----------|------|-----------|
| `paymentFailureCount` | non-negative integer | ≥ 0 |
| `cancellationRate` | float [0, 1] | inclusive boundaries |
| `windowDays` | positive integer | ≥ 1 |

When checking payment failures, callers pass `cancellationRate = 0`.
When checking cancellation rate, callers pass `paymentFailureCount = 0`.
These are distinct, independent observations.

Threshold evaluation methods on `RiskIndicators`:

- `isPaymentFailureThresholdExceeded(threshold)` — returns `true` when
  `paymentFailureCount >= threshold.paymentFailureLimit`
- `isCancellationRateThresholdExceeded(threshold)` — returns `true` when
  `cancellationRate > threshold.cancellationRateLimit`

Both methods encode the threshold comparison in the domain layer, preventing callers from
performing raw numeric comparisons outside of the domain.

### 4. Comparison Semantics

**Count-based triggers (payment failures)** use inclusive comparison (`>=`): reaching the
configured limit is sufficient to trigger escalation. This is appropriate for discrete count
signals where an exact match at the limit represents a confirmed threshold breach.

**Rate-based triggers (cancellation rate)** use exclusive comparison (`>`): the rate must
strictly exceed the limit to trigger escalation. A rate exactly at the limit is considered within
acceptable bounds. This is appropriate for continuous ratio signals with natural variance at
boundary values.

### 5. Caller Responsibilities (Infrastructure Layer)

**For `HandlePaymentFailedRiskAssessment`:**
1. Subscribe to `PaymentFailed` events from the Billing context.
2. Query the Billing context to count payment failures for the professional in the rolling window.
3. Construct `HandlePaymentFailedRiskAssessmentInputDTO` with the pre-computed `paymentFailureCount`.
4. Call the use case.

**For `HandleHighCancellationRateAssessment`:**
1. Subscribe to professional-initiated `BookingCancelled` events from the Scheduling context.
2. Query the Scheduling context to compute the cancellation rate in the rolling window.
3. Construct `HandleHighCancellationRateAssessmentInputDTO` with the pre-computed `cancellationRate`.
4. Call the use case.

The Risk context performs no cross-context queries. Pre-computation at the infrastructure boundary
is the canonical pattern — consistent with how `HandleChargebackRiskAssessment` receives the
transaction reference as an event field rather than querying the Billing context.

### 6. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Magic number thresholds in use case bodies | Use `RiskThreshold.defaults()` |
| Threshold comparisons outside `RiskIndicators` methods | Comparison logic belongs in the domain VO |
| Automated use cases escalating to BANNED | Only WATCHLIST; BANNED requires human review |
| Infrastructure handler comparing raw metrics without constructing `RiskIndicators` | Pass VO to the use case; validation and comparison stay in domain |

## Invariants

1. `RiskThreshold.defaults()` always returns the canonical default values:
   `paymentFailureLimit=3, cancellationRateLimit=0.30, paymentWindowDays=30, cancellationWindowDays=14`.
2. Payment failure threshold comparison: `paymentFailureCount >= paymentFailureLimit` (inclusive).
3. Cancellation rate threshold comparison: `cancellationRate > cancellationRateLimit` (exclusive).
   A rate of exactly 0.30 with a limit of 0.30 does NOT trigger escalation.
4. Automated assessment use cases only escalate NORMAL → WATCHLIST. BANNED requires administrative
   action via `ProcessAdministrativeRiskReport`.
5. `RiskIndicators.create()` validates all fields and returns `Left(InvalidRiskIndicatorError)` on
   invalid input. Infrastructure handlers must handle this Left before proceeding.
6. Pre-computation of metric values is an infrastructure responsibility. The Risk domain contains
   no query ports for Billing or Scheduling data.

## Constraints

- `RiskThreshold` and `RiskIndicators` are domain value objects; they have no Prisma schema
  representations and are not persisted.
- Both VOs extend `ValueObject<T>` from `@fittrack/core` (ADR-0047 §4).
- The default threshold values in this ADR are compile-time constants in `RiskThreshold.defaults()`.
  Runtime configuration (feature flag, database-backed thresholds) is post-MVP scope.
- `InvalidRiskIndicatorError` uses error code `RISK.RISK_INDICATOR_INVALID` from `RiskErrorCodes`.
- All automated use cases use `actorId = 'SYSTEM'` and `actorRole = 'SYSTEM'` in the AuditLog
  (ADR-0027 §3).

## Consequences

**Positive:**
- Threshold values are centralized: changing the default requires one line in `RiskThreshold`.
- Domain comparison logic is fully testable without infrastructure mocks.
- Infrastructure handlers have a clean DTO contract: they compute counts and rates; they do not
  implement threshold logic.
- New metric types (e.g., dispute rate) can be added by extending `RiskIndicators` with a new
  field and adding an evaluation method, without changing use case structure.

**Negative:**
- Infrastructure handlers must query historical data before invoking use cases, introducing a
  cross-context read at event-handling time.
- The exclusive vs inclusive comparison distinction must be carefully documented and tested to
  avoid off-by-one errors at threshold boundaries.

## Dependencies

- ADR-0001: Bounded Context Isolation (Risk context has no query ports into Billing/Scheduling)
- ADR-0003: One Aggregate Per Transaction
- ADR-0009: Domain Events Policy (post-commit dispatch; UseCase is sole dispatcher)
- ADR-0022: Financial Risk Governance Framework (canonical; defines RiskStatus state machine)
- ADR-0027: Audit and Traceability (actorId='SYSTEM' for automated actions)
- ADR-0037: Sensitive Data Handling (no PII in error context)
- ADR-0047: Canonical Aggregate Root Definition (ValueObject base class)
- ADR-0051: Domain Error Handling Policy (DomainResult<T>; no throws in domain)
