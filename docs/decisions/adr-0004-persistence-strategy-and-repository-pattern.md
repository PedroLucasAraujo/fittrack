# ADR-0004 — Persistence Strategy and Repository Pattern

## Status

ACCEPTED

## Context

The domain layer must remain completely independent of the persistence technology (ORM, database driver, query language). Direct ORM dependency in domain entities creates:
- Test brittleness (tests require database or ORM stubs).
- Migration complexity (ORM changes break domain logic).
- Layer boundary violations (infrastructure concerns in domain logic).

## Decision

### 1. ORM Role

Prisma is the persistence adapter. It operates exclusively in the infrastructure layer. The domain layer has no knowledge of Prisma types, Prisma models, or Prisma query syntax.

### 2. Repository Pattern

Each aggregate root has a corresponding repository interface defined in its `domain/` layer and implemented in its `infrastructure/` layer.

**Interface contract (domain layer):**
```typescript
interface IExecutionRepository {
  findById(id: UniqueEntityId): Promise<Execution | null>
  findByLogicalDay(
    professionalProfileId: UniqueEntityId,
    clientId: UniqueEntityId,
    logicalDay: LogicalDay
  ): Promise<Execution[]>
  save(execution: Execution): Promise<void>
}
```

**Implementation (infrastructure layer):**
```typescript
class PrismaExecutionRepository implements IExecutionRepository {
  // Uses Prisma client to implement interface
  // Uses ExecutionMapper for domain ↔ persistence translation
}
```

### 3. Mapper Contract

Explicit mappers translate between domain objects and persistence schemas. Mappers live in the infrastructure layer.

```typescript
class ExecutionMapper {
  static toDomain(raw: PrismaExecution): Execution { ... }
  static toPersistence(execution: Execution): PrismaExecution { ... }
}
```

**Mapper rules:**
- `toDomain` reconstructs a fully valid domain aggregate from persistence data.
- `toPersistence` produces a persistence-ready object from a domain aggregate.
- Mappers may not apply business logic. They perform structural translation only.
- Mappers must handle all fields defined in the domain aggregate. Partial reconstruction is prohibited.

### 4. Repository Contract Rules

| Rule | Statement |
|------|-----------|
| Complete reconstruction | A repository `findBy*` method returns a complete, valid aggregate root or null. It never returns a partially populated aggregate. |
| No lazy loading | All required associations are loaded eagerly by the repository. Lazy loading is prohibited in the domain layer. |
| No raw queries in domain | Domain layer never executes database queries directly. All data access is through repository interfaces. |
| No ORM types in domain | Domain entities never reference Prisma-generated types. |
| Persistence mapping at boundary | Translation between domain types and persistence types occurs exclusively in mappers. |

### 5. Read Models

For complex read operations (dashboards, analytics, projected views) that do not require aggregate reconstruction, dedicated read model queries may be implemented in the infrastructure layer using Prisma directly. Read models:
- Are used exclusively for reads.
- Never return domain aggregate objects.
- Never trigger domain operations.
- Are defined in the application layer as interfaces and implemented in infrastructure.

### 6. Technology Constraint

Prisma is the designated ORM for MVP. Replacement of Prisma with another persistence technology must be achievable by replacing infrastructure implementations without modifying any file in a module's `domain/` or `application/` layer.

## Invariants

1. Repository interfaces are defined in the domain layer.
2. Repository implementations are in the infrastructure layer.
3. Domain objects are never partially populated by repositories.
4. No ORM type is referenced in any domain or application layer file.
5. Mappers perform no business logic.

## Constraints

- No Active Record pattern. Domain entities do not contain database methods.
- No Data Transfer Object used as a domain entity.
- Prisma schema changes require mapper updates but must not require domain entity changes unless the domain model itself changes.

## Consequences

**Positive:**
- Domain layer is fully testable without database infrastructure.
- ORM can be replaced without touching domain logic.
- Clear separation of persistence concerns from business rules.

**Negative:**
- Mapper boilerplate increases per-entity.
- Read-heavy features require separate query optimization strategies.

## Dependencies

- ADR-0000: Project Foundation (domain isolation principle)
- ADR-0002: Modular Structure (layer placement rules)
- ADR-0014: Projections and Derived Metrics (read model strategy)
