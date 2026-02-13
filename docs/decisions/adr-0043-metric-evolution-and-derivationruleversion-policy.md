# ADR-0043 — Metric Evolution and DerivationRuleVersion Policy

## Status

ACCEPTED

## Context

FitTrack's metrics system derives aggregate health and performance metrics from Execution records (ADR-0014). The formulas used to derive these metrics (derivation rules) may need to evolve: calculation methods improve, new variables are added, or bugs are corrected. Without a formal versioning policy for derivation rules, metric evolution either silently breaks historical comparability, or forces prohibitive data freezes that prevent any metric improvement.

## Decision

### 1. DerivationRuleVersion Model

Every Metric record carries a `derivationRuleVersion` field identifying the rule set used to compute it:

```typescript
interface MetricRecord {
  readonly id: string;
  readonly userId: string;
  readonly professionalProfileId: string;
  readonly metricType: string;               // e.g., 'WEEKLY_VOLUME', 'BODY_FAT_ESTIMATE'
  readonly value: number;
  readonly unit: string;
  readonly derivationRuleVersion: string;    // e.g., 'v1', 'v2', 'v2.1'
  readonly sourceExecutionIds: string[];     // IDs of Execution records used
  readonly computedAtUtc: string;
  readonly logicalDay: string;               // Per ADR-0010
}
```

The `derivationRuleVersion` is immutable after the Metric record is created.

### 2. Rule Change Protocol

When a derivation rule changes:
1. A new `derivationRuleVersion` identifier is assigned (e.g., `v1` → `v2`).
2. The new rule is documented in the Metrics context's rule registry.
3. New Metric records computed after the rule change use the new `derivationRuleVersion`.
4. Existing Metric records computed with the old rule are **never overwritten**.
5. The platform maintains both the old and new versions of Metric records simultaneously if reprocessing has occurred.

### 3. Retroactive Reprocessing Policy

Retroactive reprocessing (computing new Metric records from old Execution data using a new rule) is permitted **only**:
- Via an explicit, administratively triggered batch job.
- The job creates new Metric records with the new `derivationRuleVersion`.
- The job does not delete or overwrite existing Metric records.
- The job is idempotent: re-running it does not produce duplicate Metric records.

Automatic retroactive reprocessing triggered by deployment or rule registration is prohibited.

### 4. Query Behavior by Rule Version

The metrics query API supports:
- Returning the latest version of each metric for a given time window.
- Returning a specific `derivationRuleVersion` for historical comparability.
- Returning all versions of a metric (for audit and research purposes).

The default query behavior (no version filter specified) returns the latest computed version for each day.

### 5. Metric Immutability

Individual Metric records are immutable after creation per ADR-0014:
- No metric value is overwritten after creation.
- Rule changes create new Metric records; they do not modify existing ones.
- This preserves the auditability of metric computation history.

### 6. Compound and Composite Metrics (Post-MVP)

Compound metrics (metrics derived from other metrics, not directly from Execution records) are a post-MVP feature:
- Compound metrics are always re-derivable from their source Metric records.
- A compound metric's `derivationRuleVersion` includes both the compound rule version and the source metric version it was derived from.
- Circular metric dependencies are prohibited.

## Invariants

1. Every Metric record carries an immutable `derivationRuleVersion` identifying the rule used to compute it.
2. Rule changes never overwrite existing Metric records.
3. Retroactive reprocessing requires an explicit administrative batch job; it never occurs automatically.
4. Retroactive reprocessing creates new Metric records alongside (not replacing) existing records.
5. Metric records are immutable after creation; only new records with new versions are added.

## Constraints

- The derivation rule registry must be version-controlled alongside the codebase.
- Post-MVP compound metrics must not introduce circular dependencies in the derivation graph.
- Metric query APIs must support filtering by `derivationRuleVersion` for historical comparability.

## Consequences

**Positive:**
- Historical metric comparability is preserved across rule changes.
- Metric evolution does not require database migrations of existing records.
- The computational audit trail is complete: every metric is traceable to its derivation rule.

**Negative:**
- Multiple metric records per `(userId, metricType, logicalDay)` may exist across rule versions.
- Storage grows as metrics are reprocessed with new rule versions.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (Execution records are the source of truth for metric computation)
- ADR-0010: Canonical Temporal Policy (logicalDay on Metric records)
- ADR-0014: Projections, Derived Metrics, and Read Models (Metric immutability and source-of-truth hierarchy)
- ADR-0016: Formal Eventual Consistency Policy (metric computation is an eventually consistent process)
