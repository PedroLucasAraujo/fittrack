# ADR-0002 — Modular Structure and Context-to-Module Mapping

## Status

ACCEPTED

## Context

The physical file and module structure of the codebase must enforce the bounded context boundaries defined in ADR-0001. Generic layer-based folder structures (e.g., `/controllers`, `/services`, `/repositories`) create cross-context coupling by encouraging shared infrastructure and mixed concerns.

## Decision

### 1. Module Structure

Each bounded context maps to a dedicated module directory. The canonical structure is:

```
/src
  /modules
    /identity/
      /domain/
      /application/
      /infrastructure/
      /presentation/
    /user-profile/
    /professional-profile/
    /service-plan/
    /scheduling/
    /execution/
    /metrics/
    /billing/
    /catalog/
    /personal-mode/
    /risk/
    /audit/
  /shared/
    /domain/          (shared value objects, base classes, domain primitives)
    /infrastructure/  (cross-cutting infra: database client, logger, event bus)
```

### 2. Intra-Module Layer Structure

Each module contains four layers. The following import rules are absolute:

| Layer | May Import From | May Not Import From |
|-------|----------------|---------------------|
| `domain/` | `shared/domain/` only | application, infrastructure, presentation, other modules |
| `application/` | `domain/`, `shared/domain/` | infrastructure, presentation, other module domain layers |
| `infrastructure/` | `domain/`, `application/`, `shared/infrastructure/` | presentation |
| `presentation/` | `application/` | domain (directly), infrastructure |

### 3. Cross-Module Import Rules

- Modules may not import from another module's `domain/` layer directly.
- Modules may import from another module's `application/` layer only through defined interface contracts.
- Cross-module communication in application logic uses domain events and interface contracts, not direct method calls into another module's internals.
- The `shared/` directory contains only primitives, base classes, and utilities that have no bounded context affiliation.

### 4. Shared Domain Primitives

The following types live in `shared/domain/` and are accessible to all modules:

- `AggregateRoot` (base class)
- `Entity` (base class)
- `ValueObject` (base class)
- `DomainEvent` (base interface)
- `UniqueEntityId` (value object)
- Common enums: `RiskStatus`, `BookingStatus`, `TransactionStatus`, `PlanType`, `MetricType` (governed by ADR-0012)

### 5. Module Naming Conventions

| Convention | Rule |
|-----------|------|
| Module directory | kebab-case matching bounded context name |
| Domain entities | PascalCase |
| Application use cases | PascalCase with `UseCase` suffix |
| Repository interfaces | `I{AggregateName}Repository` |
| Repository implementations | `Prisma{AggregateName}Repository` |
| Domain events | PascalCase past-tense noun (e.g., `ExecutionRecorded`) |

## Invariants

1. No file in a module's `domain/` layer may import from any infrastructure library, ORM type, or external framework.
2. No module's domain layer imports from another module's domain layer.
3. Repository interfaces are defined in the domain layer, not the infrastructure layer.
4. All domain-layer types must be serializable independently of ORM schema.

## Constraints

- Module boundaries are enforced at the import/dependency level, not only by convention.
- The `shared/` directory does not contain any business logic. Shared business rules belong to the relevant bounded context.
- No "utils" or "helpers" directories are permitted at the module level. Utilities are domain primitives or infrastructure services.

## Consequences

**Positive:**
- Physical code structure enforces bounded context isolation.
- Individual modules can be extracted into independent services without structural changes.
- Onboarding engineers can identify the responsible context for any code change.

**Negative:**
- More directories than a typical layered architecture.
- Cross-cutting concerns require explicit placement decisions.

## Dependencies

- ADR-0000: Project Foundation (layer rules)
- ADR-0001: Bounded Contexts (context definitions)
- ADR-0012: Enum and Shared Type Governance (shared enum placement)
