# ADR-0011 — Catalog and Resource Snapshot Policy

## Status

ACCEPTED

## Context

FitTrack maintains reusable catalog resources: exercise definitions, food items (post-MVP), and evaluation templates. These catalog resources are referenced when creating Deliverables (training plans, diet prescriptions, assessment forms).

If a Deliverable directly references a live catalog resource, any subsequent modification to that catalog resource retroactively alters the historical prescription. This creates:
- Historical record corruption (a prescription from 6 months ago now reflects current definitions).
- Audit failures (the originally prescribed content cannot be reconstructed).
- Metric derivation inconsistencies (derivation rules change when catalog changes).

## Decision

### 1. Snapshot Requirement

**Deliverables never reference live catalog resources directly.**

At the moment a Deliverable is created (prescription time), the system creates an **immutable snapshot** of the referenced catalog resource and embeds it within the Deliverable. The snapshot contains all data necessary to reconstruct the prescribed content without referencing the original catalog record.

### 2. Snapshot Composition Requirements

A snapshot must include sufficient data for complete historical reconstruction. At minimum:

| Catalog Resource | Required Snapshot Fields |
|-----------------|--------------------------|
| Exercise | `name`, `category`, `muscleGroups`, `instructions`, `mediaUrl` (at snapshot time), `catalogItemId`, `catalogVersion` |
| Food Item (post-MVP) | `name`, `portionUnit`, `macrosPer100g`, `catalogItemId`, `catalogVersion` |
| Evaluation Template | `name`, `fields[]`, `scoringRules`, `templateId`, `templateVersion` |

All snapshots include `snapshotCreatedAtUtc` and `catalogItemId` for traceability.

### 3. Snapshot Immutability Rule

**A snapshot is immutable after creation.**

| Operation | Permitted |
|-----------|-----------|
| Create | Yes, once, at Deliverable prescription time |
| Read | Yes, unrestricted |
| Update | No |
| Delete | No |

If the catalog resource is modified or deleted after snapshot creation, the snapshot is unaffected. The Deliverable retains its original content permanently.

### 4. Catalog Versioning

Catalog items carry a `version` field that increments with each modification. Snapshots record the `catalogVersion` at the time of snapshot creation.

This enables auditors to determine which catalog version was active when a Deliverable was prescribed, without needing the historical state of the catalog record.

### 5. Catalog Independence from Deliverables

- Modifications to a catalog item do not affect any existing Deliverable.
- Deletion (archiving) of a catalog item does not affect any existing Deliverable.
- New Deliverables created after catalog modification use the new version in their snapshot.
- The platform does not support automatic propagation of catalog updates to existing prescriptions.

### 6. Execution Reference Chain

The reference chain for an Execution record is:

```
Execution
  → Deliverable (by ID)
    → Snapshot (embedded in Deliverable, immutable)
      → CatalogItemId (reference only, for traceability)
```

The Execution references the Deliverable by ID. The Deliverable contains the embedded snapshot. No Execution-time lookup of the catalog is required or permitted.

### 7. Catalog Item Lifecycle

| Status | Description |
|--------|-------------|
| `ACTIVE` | Available for new Deliverable prescription |
| `DEPRECATED` | No longer recommended; still available for prescription; existing snapshots unaffected |
| `ARCHIVED` | Not available for new prescriptions; existing snapshots unaffected |

Catalog items are never hard-deleted if any snapshot references them (for audit traceability via `catalogItemId`).

## Invariants

1. No Deliverable references a live catalog resource by direct object reference. All catalog data within a Deliverable is stored as an embedded immutable snapshot.
2. A snapshot is created once, at Deliverable creation time, and is never subsequently modified.
3. Modification or archival of a catalog item does not alter any existing snapshot or Deliverable.
4. Every snapshot includes `catalogItemId` and `catalogVersion` for traceability.
5. Execution records reference Deliverables by ID; they never reference catalog items directly.

## Constraints

- Snapshot data is stored as part of the Deliverable entity, not as a separate entity in the Catalog bounded context.
- The Catalog bounded context is not permitted to modify data in the Execution or Deliverable bounded context.
- Retroactive update of prescriptions (to reflect catalog changes) is not a supported platform operation.

## Consequences

**Positive:**
- Historical prescriptions are stable and auditable regardless of catalog evolution.
- Metric derivation uses the exact prescription content that existed at the time of execution.
- Professional liability is clear: the prescribed content is captured immutably.

**Negative:**
- Storage volume increases as each Deliverable embeds a full snapshot.
- Snapshot data can become stale relative to the current catalog, which is intentional.

## Dependencies

- ADR-0000: Project Foundation (snapshot immutability principle)
- ADR-0005: Execution Core Invariant Policy (Execution reference to Deliverable)
- ADR-0014: Projections and Derived Metrics (metric derivation uses snapshot content)
