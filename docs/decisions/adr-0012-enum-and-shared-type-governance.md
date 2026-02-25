# ADR-0012 — Enum and Shared Type Governance

## Status

ACCEPTED

## Context

FitTrack uses enumerated types throughout multiple bounded contexts: transaction statuses, risk statuses, booking states, plan types, metric types, and delivery modes. Without centralized governance, enums diverge between frontend and backend, database migrations break silently, and invalid state values proliferate.

## Decision

### 1. Canonical Enum Registry

All enums that are used across multiple bounded contexts or serialized to the persistence layer must be declared in `shared/domain/` (governed by ADR-0002). Single-context enums remain in their owning module's domain layer.

### 2. Official Shared Enums

| Enum | Values | Owning Context |
|------|--------|---------------|
| `RiskStatus` | `NORMAL`, `WATCHLIST`, `BANNED` | Risk / ProfessionalProfile |
| `TransactionStatus` | `PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED`, `CHARGEBACK` | Billing |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `CANCELLED_BY_CLIENT`, `CANCELLED_BY_PROFESSIONAL`, `CANCELLED_BY_SYSTEM`, `COMPLETED`, `NO_SHOW` | Scheduling |
| `AccessGrantStatus` | `ACTIVE`, `EXPIRED`, `REVOKED`, `SUSPENDED` | Billing |
| `PlanType` | `RECURRING`, `ONE_TIME`, `TRIAL` | ServicePlan |
| `EntitlementStatus` | `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`, `EXPIRED` | Billing |
| `ServicePlanStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`, `DELETED` | ServicePlan |
| `ExecutionStatus` | `PENDING`, `CONFIRMED`, `CANCELLED` | Execution |
| `MetricType` | `WEIGHT`, `BODY_FAT`, `VO2_MAX`, `RESTING_HEART_RATE`, `CUSTOM` | Metrics |
| `DeliverableType` | `TRAINING_PRESCRIPTION`, `DIET_PLAN`, `PHYSIOLOGICAL_ASSESSMENT`, `SESSION` | Deliverables |
| `SelfLogSource` | `EXECUTION`, `SELF` | PersonalMode |

> **DeliverableType deprecation note:** Previous abbreviated values (`TRAINING`, `DIET`, `EVALUATION`) are deprecated. All new code must use the descriptive names above (`TRAINING_PRESCRIPTION`, `DIET_PLAN`, `PHYSIOLOGICAL_ASSESSMENT`). The deprecated values remain in the enum while any persisted record references them (per §4 Enum Deprecation Protocol).

### 3. Enum Addition Protocol

To add a new value to an existing shared enum:
1. Propose the new value via an ADR amendment.
2. Add the value to the enum definition in `shared/domain/`.
3. Create a database migration to add the value to any relevant DB enum type.
4. Update all switch/match statements that handle the enum exhaustively.
5. Update API documentation.

### 4. Enum Deprecation Protocol

To deprecate an existing enum value:
1. Mark the value as `@deprecated` in code documentation.
2. Ensure no new code produces the deprecated value.
3. The value remains in the enum indefinitely while any persisted record may reference it.
4. **Enum values are never removed from the codebase while any production record references them.**

### 5. Enum Prohibition Rules

| Prohibited | Reason |
|-----------|--------|
| Dynamic enums editable by platform users | User-defined status values create unbounded state space |
| Numeric enum values for domain concepts | Numeric values are opaque and break readable audit logs |
| String enums without a centralized registry | Leads to typo-based bugs and deserialization failures |
| Removing an enum value from production code | Breaks deserialization of historical records |

### 6. Database Synchronization

- Database schema enum types must always be a superset of or equal to the application enum.
- Application code must never produce a value not defined in the database enum.
- Migrations that add enum values must be deployed before the application code that produces the new value.

## Invariants

1. No shared enum value is removed from the codebase while any production record references it.
2. All shared enums live in `shared/domain/`. No bounded context domain layer redefines a shared enum independently.
3. Every switch/match statement on a shared enum is exhaustive (compiler-enforced where possible).
4. The database schema enum type is always consistent with or a superset of the application enum.

## Constraints

- No custom string literals may be used as status or type values where a defined enum exists.
- TypeScript `string` union types may not substitute for domain-critical enums in entity definitions.

## Consequences

**Positive:**
- Single source of truth for all domain status values.
- Frontend/backend deserialization safety.
- Database migration safety.

**Negative:**
- Enum additions require coordinated deployment across application and database.
- Deprecated values persist in the codebase indefinitely.

## Dependencies

- ADR-0000: Project Foundation (shared type management)
- ADR-0002: Modular Structure (shared/domain/ placement)
- ADR-0008: Entity Lifecycle States (enum values for lifecycle states)
