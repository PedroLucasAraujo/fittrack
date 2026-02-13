# ADR-0014 — Projections, Derived Metrics, and Read Models

## Status

ACCEPTED

## Context

FitTrack produces multiple views of service delivery data:
- Derived health metrics (weight trends, VO2 max estimates, body composition).
- Client progress reports.
- Professional analytics dashboards.
- SelfLog entries from personal mode.

Without a formal policy on the relationship between source-of-truth records (Execution) and derived representations (Metrics, SelfLog, read models), engineers treat projections as authoritative, create circular derivation chains, and retroactively corrupt historical data by altering derivation rules.

## Decision

### 1. Source of Truth Hierarchy

The platform enforces a strict one-directional data flow:

```
Execution (source of truth)
  ↓ (one-directional derivation)
Metric (derived, versioned)
  ↓ (one-directional projection)
Read Model / Dashboard View
```

- **Execution** is the authoritative source for all service delivery facts. It cannot be derived from or influenced by Metrics or SelfLog.
- **Metrics** are derived from Execution records. They are not authoritative. They may be recomputed.
- **Read Models** are projections for display. They are not authoritative. They may be regenerated.
- **SelfLog (source=SELF)** is personal self-tracking data. It is not authoritative. It never governs domain rules.

### 2. Derived Metric Contract

Every Metric record must carry:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UniqueEntityId | Unique metric record ID |
| `derivedFromExecutionId` | UniqueEntityId | ID of the source Execution |
| `derivationRuleVersion` | string | Version of the derivation rule used (governed by ADR-0043) |
| `metricType` | MetricType enum | Type of metric |
| `value` | numeric | Computed metric value |
| `unit` | string | Unit of measurement |
| `computedAtUtc` | UTC timestamp | When this metric was computed |
| `logicalDay` | ISO date string | logicalDay of the source Execution (per ADR-0010) |

### 3. SelfLog Classification

SelfLog entries carry a `source` field:

| Source Value | Meaning | Authoritative? | Governs Domain? |
|-------------|---------|---------------|----------------|
| `EXECUTION` | Projected from a confirmed Execution | Yes (as projection) | No |
| `SELF` | Manually entered by the client (Personal Mode) | No | No |

SelfLog entries with `source=SELF` are never used as the basis for metric derivation, AccessGrant validation, or any domain rule evaluation.

SelfLog entries with `source=EXECUTION` are projections created by the Metrics context after `ExecutionRecorded` is processed. They reflect Execution data but do not supersede it.

### 4. Read Model Policy

Read models are defined for:
- Client progress dashboard (session history, metric trends)
- Professional analytics (client activity, completion rates)
- Scheduling view (agenda by logicalDay)
- Billing history (transaction and AccessGrant summary)

Read model rules:
- Read models are eventually consistent with the write model (governed by ADR-0016).
- Read models are never used as input for domain operations.
- Read models are regenerated on demand or via event-triggered projection updates.
- Read models do not have a separate aggregate root. They are infrastructure-layer views.

### 5. Metric Immutability Policy

Once a Metric record is persisted:
- The `derivedFromExecutionId` and `derivationRuleVersion` fields are immutable.
- The computed `value` is immutable.
- If the derivation rule changes, a **new** Metric record is created with the new `derivationRuleVersion`. The old Metric record is retained.
- Old Metric records are never overwritten during rule updates.
- Recomputation protocol is governed by ADR-0043.

### 6. Prohibited Patterns

| Prohibited | Reason |
|-----------|--------|
| Using SelfLog (source=SELF) as input for domain decisions | SelfLog is not authoritative |
| Deriving Execution data from Metric data | Violates source-of-truth hierarchy |
| Retroactively modifying Metric values | Historical metrics must be stable |
| Read models triggering aggregate mutations | Read path must never write |
| Analytics jobs modifying Execution records | Analytics is read-only |

## Invariants

1. Execution is the exclusive source of truth for service delivery facts. No derived entity supersedes it.
2. Every Metric record carries `derivedFromExecutionId` and `derivationRuleVersion`.
3. Metric records are immutable after creation. Rule changes produce new records, not updates.
4. SelfLog entries with `source=SELF` are never used in any domain rule evaluation.
5. Read models never trigger domain mutations.
6. logicalDay on a Metric record always matches the logicalDay of its source Execution.

## Constraints

- Metrics bounded context may read from the Execution table but may not write to it.
- Metric recomputation is an explicit, operator-triggered or scheduled operation — not an automatic side effect of rule changes.
- Read model regeneration is idempotent (governed by ADR-0007).

## Consequences

**Positive:**
- Historical metrics remain stable as derivation rules evolve.
- Source-of-truth integrity is maintained regardless of analytics or dashboard changes.
- Recomputation is safe because Execution records are never altered.

**Negative:**
- Rule changes produce metric duplication (old and new versions coexist).
- Read model regeneration adds operational complexity.

## Dependencies

- ADR-0000: Project Foundation (Execution as source of truth)
- ADR-0005: Execution Core Invariant Policy (Execution immutability)
- ADR-0010: Canonical Temporal Policy (logicalDay on Metric matches Execution)
- ADR-0016: Formal Eventual Consistency Policy (read model eventual consistency)
- ADR-0043: Metric Evolution and DerivationRuleVersion (recomputation protocol)
