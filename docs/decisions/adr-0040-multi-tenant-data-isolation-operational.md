# ADR-0040 — Multi-Tenant Data Isolation — Operational

## Status

ACCEPTED

## Context

ADR-0025 defines the conceptual multi-tenancy model and isolation requirements. This ADR defines the operational enforcement of those requirements: how tenant isolation is verified in code, what patterns are prohibited, how tenant scoping is tested, and how violations are detected. Without operational enforcement detail, tenant isolation remains a theoretical constraint that is frequently violated in practice through omission or misunderstanding.

## Decision

### 1. Repository-Level Enforcement Checklist

Every repository method returning tenant-scoped data must satisfy the following checklist:

| Check | Requirement |
|-------|-------------|
| Mandatory tenant parameter | `professionalProfileId` is a non-optional parameter on all `findBy*` methods that return tenant-scoped data |
| Parameter source | `professionalProfileId` comes from the authenticated token's `tenantId` claim, never from request body or query parameters |
| No implicit global query | No method returns all records across tenants without an explicit admin scope |
| Post-fetch ownership check | After fetching a record, the application layer verifies `record.professionalProfileId === requestingTenantId` before mutating |
| Cross-tenant join prohibition | SQL joins across tenant boundaries without explicit tenant filter are prohibited |

### 2. Application Layer Tenant Extraction Protocol

```typescript
// Correct: tenant extracted from authenticated token
async function executeUseCase(
  actor: AuthenticatedActor,
  command: CreateExecutionCommand
): Promise<void> {
  const tenantId = actor.tenantId; // From JWT claim — never from command
  const accessGrant = await this.accessGrantRepository
    .findByIdAndTenant(command.accessGrantId, tenantId);

  if (!accessGrant) {
    throw new NotFoundError(); // 404; do not reveal cross-tenant existence
  }
  // ...
}
```

The `tenantId` is extracted from the `AuthenticatedActor` (from JWT), never from the command payload. Providing a different `professionalProfileId` in the request body or path parameters has no effect on authorization decisions.

### 3. Prohibited Tenant Isolation Patterns

The following patterns are prohibited and constitute critical security defects:

| Prohibited Pattern | Why |
|-------------------|-----|
| `findAll()` without tenant filter on tenant-scoped entities | Returns cross-tenant data |
| Trusting `professionalProfileId` from request body for authorization | Allows tenant scope elevation |
| Joining across tenant boundaries without explicit filter | Cross-tenant data leakage |
| Returning entity existence information for cross-tenant resources (403 instead of 404) | Enables resource enumeration |
| Sharing database connection state between tenants | Not applicable in shared-database model but relevant for future isolation |

### 4. Admin Cross-Tenant Access Protocol

Admin operations that access cross-tenant data must:
1. Require an explicit `tenantId` parameter in the admin request (not a "fetch all" operation).
2. Produce an AuditLog entry with: `actorId` (admin userId), `tenantId` accessed, `action` (`ADMIN_CROSS_TENANT_ACCESS`), `occurredAtUtc`.
3. Be authorized by the `ADMIN` role policy (ADR-0024).
4. Return only the data within the explicitly specified tenant scope.

No admin operation returns unscoped data across all tenants in a single response.

### 5. Tenant Isolation Testing Requirements

Every repository implementation must have integration tests covering:
- Query with correct `professionalProfileId` returns expected records.
- Query with a different `professionalProfileId` returns no records (isolation confirmed).
- Attempt to access cross-tenant resource by authenticated non-admin returns 404.
- Admin access to cross-tenant resource produces AuditLog entry.

### 6. Client-to-Professional Scope

A client (USER role) may have active relationships with multiple professionals. Data access is scoped by the `(clientId, professionalProfileId)` pair:
- A client can see their own Execution history only within the scope of a given professional.
- A client cannot see Execution records from another professional's context, even their own.
- A professional can see only clients with an active `ProfessionalClientLink` to their profile.

### 7. Billing Isolation

Financial records (Transactions, AccessGrants) are doubly scoped:
- `professionalProfileId`: tenant scope.
- `userId`: client scope.

Cross-tenant billing data access (e.g., platform-level revenue reports) is an admin operation subject to Section 4 above.

## Invariants

1. Every repository query on tenant-scoped data includes `professionalProfileId` as a non-optional parameter.
2. `professionalProfileId` for authorization decisions always comes from the authenticated JWT token.
3. Cross-tenant resource access attempts return 404, never 403.
4. Admin cross-tenant access always produces an AuditLog entry.
5. No repository method returns data across multiple tenants without an explicit admin scope parameter.

## Constraints

- Row-level security (RLS) at the database layer is a post-MVP enhancement. MVP isolation is enforced at the application layer.
- Tenant isolation testing is mandatory for every repository implementation; untested repositories are not deployable.
- Future migration to physical per-tenant databases must not require domain model changes (the `professionalProfileId` field is present on all tenant-scoped entities as the migration key).

## Consequences

**Positive:**
- Operational enforcement prevents accidental cross-tenant data leakage.
- Testable isolation rules enable regression coverage.
- Admin access trail provides forensic capability.

**Negative:**
- Application-layer isolation requires discipline at every repository method.
- Testing overhead increases with the number of tenant-scoped entities.

## Dependencies

- ADR-0024: Policy-Based Authorization (authorization failure semantics: 404 for cross-tenant)
- ADR-0025: Multi-Tenancy and Data Isolation (conceptual model; this ADR is the operational extension)
- ADR-0027: Audit and Traceability (admin cross-tenant access logging)
- ADR-0036: Indexing and Modeling for Growth (professionalProfileId as index leading column)
