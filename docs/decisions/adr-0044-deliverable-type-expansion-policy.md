# ADR-0044 — Deliverable Type Expansion Policy

## Status

ACCEPTED

## Context

FitTrack's core Deliverable abstraction covers training prescriptions, diet plans, physiological assessments, and scheduled sessions. The platform will need to support additional service types: mentoring sessions, teleconsultations, hybrid programs, and educational content. Without a formal expansion policy, new Deliverable types bypass domain invariants (snapshot requirement, AccessGrant validation, subscription-first enforcement) and introduce inconsistency in the service delivery model.

## Decision

### 1. Deliverable Type Definition

A Deliverable type represents a category of professional service that can be prescribed by a professional and executed by a client. The current registered types are:

| Type | Description | Has Execution | Requires Snapshot |
|------|-------------|--------------|------------------|
| `TRAINING_PRESCRIPTION` | Workout plan | Yes | Yes |
| `DIET_PLAN` | Nutrition plan | Yes | Yes |
| `PHYSIOLOGICAL_ASSESSMENT` | Body composition and fitness assessment | Yes | Yes |
| `SESSION` | Scheduled training session | Yes | Yes |

All existing and future Deliverable types must satisfy the requirements in Section 2.

### 2. New Deliverable Type Requirements

A new Deliverable type is valid only if it satisfies all of the following:

| Requirement | Description |
|-------------|-------------|
| Snapshot mandatory | The Deliverable content is captured as an immutable snapshot at prescription time (ADR-0011) |
| AccessGrant required | Service delivery requires a valid AccessGrant (ADR-0015, ADR-0046) |
| Subscription-first | Payment confirmation precedes service delivery (ADR-0017) |
| Execution required (if executable) | If the service produces a performance record, it must create an immutable Execution (ADR-0005) |
| logicalDay required (if time-bound) | If the service has a calendar date, logicalDay must be stored (ADR-0010) |
| Tenant-scoped | The Deliverable carries a non-null `professionalProfileId` (ADR-0025) |
| Lifecycle governed | The Deliverable follows the lifecycle state machine defined in ADR-0008 |

A new Deliverable type that cannot satisfy all of these requirements indicates a design gap that must be resolved before the type is introduced.

### 3. Introduction Protocol

New Deliverable types are introduced through the following process:
1. **ADR or RFC**: Document the new type's behavior, snapshot structure, Execution contract, and any departures from standard lifecycle.
2. **Core invariant review**: Confirm that subscription-first, AccessGrant, and Execution immutability are preserved.
3. **Feature flag**: The new type is introduced behind a feature flag (ADR-0031) for controlled rollout.
4. **Catalog entry**: The type is registered in the Deliverable type catalog (ADR-0012).
5. **Migration**: If existing data must be reclassified, a migration with backup (ADR-0034) is required.

Steps 1 and 2 must be completed before any code is written for the new type.

### 4. Backward Compatibility

New Deliverable types must not:
- Change the schema of existing Deliverable types.
- Require modifications to the Execution aggregate's core fields.
- Alter the behavior of existing AccessGrant validation for existing types.
- Break existing API contracts for existing Deliverable endpoints (ADR-0039).

New types add new API endpoints; they do not modify existing endpoints.

### 5. Non-Executable Deliverable Types

Some future Deliverable types may not produce Execution records (e.g., educational content read by a client):
- Non-executable types must still carry an AccessGrant requirement.
- Non-executable types must still use snapshot immutability for their content.
- Non-executable types track completion through a `DeliverableCompletion` record (post-MVP concept), not an Execution record.

Non-executable types are post-MVP. In MVP, all Deliverable types are executable.

## Invariants

1. Every Deliverable type requires an immutable content snapshot created at prescription time.
2. Every Deliverable type requires a valid AccessGrant for service delivery.
3. Every Deliverable type respects the subscription-first model: payment before delivery.
4. New Deliverable types are introduced behind a feature flag before general availability.
5. New Deliverable types never modify existing Deliverable type schemas or API contracts.

## Constraints

- New Deliverable types require ADR-level documentation before implementation.
- Feature flag activation for a new Deliverable type requires core invariant review (Section 2).
- The Deliverable type catalog (ADR-0012) must be updated when a new type is registered.

## Consequences

**Positive:**
- Platform extensibility without compromising domain invariants.
- Controlled, documented expansion process prevents architectural drift.
- New service types are testable in isolation via feature flags before platform-wide rollout.

**Negative:**
- Formal process for each new type adds planning overhead.
- Multiple simultaneous type expansions require careful sequencing.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (executable types must create Execution records)
- ADR-0010: Canonical Temporal Policy (time-bound types require logicalDay)
- ADR-0011: Catalog and Resource Snapshot Policy (snapshot requirement for all types)
- ADR-0012: Enum and Shared Type Governance (Deliverable type catalog)
- ADR-0015: ServicePlan and AccessGrant Lifecycle Policy (AccessGrant required for all types)
- ADR-0017: Subscription-First Model (payment before delivery for all types)
- ADR-0025: Multi-Tenancy and Data Isolation (tenant-scoped requirement)
- ADR-0031: Feature Flags and Controlled Rollout (new type rollout strategy)
- ADR-0039: External Contract Versioning Policy (new types do not break existing API contracts)
- ADR-0046: AccessGrant Lifecycle Policy (AccessGrant validation for new types)
