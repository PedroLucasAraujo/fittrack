# ADR-0025 — Multi-Tenancy and Data Isolation

## Status

ACCEPTED

## Context

FitTrack is a multi-tenant platform where multiple professionals (ProfessionalProfiles) operate simultaneously on shared infrastructure. Each professional manages their own clients, service plans, sessions, executions, and financial records. Without rigorous data isolation, cross-tenant data leakage corrupts professional confidentiality and exposes sensitive client health and financial data.

## Decision

### 1. Tenancy Model

FitTrack uses **logical multi-tenancy** with a shared database (no physical per-tenant database in MVP). Isolation is enforced through mandatory tenant-scoped queries at the application and infrastructure layers.

**Tenant unit:** `professionalProfileId`

Every client, service plan, booking, execution, and financial record is owned by exactly one tenant (professional) and must carry an explicit `professionalProfileId` foreign key.

### 2. Tenant-Scoped Entity Requirements

| Entity | Required Tenant Field | Notes |
|--------|----------------------|-------|
| Client (professional-client link) | `professionalProfileId` | A client may have accounts with multiple professionals; each link is tenant-scoped |
| ServicePlan | `professionalProfileId` | Immutable; set at creation |
| Booking | `professionalProfileId` | Immutable; set at creation |
| Execution | `professionalProfileId` | Immutable; set at creation; governed by ADR-0005 |
| AccessGrant | `professionalProfileId` | Immutable; set at creation; governed by ADR-0015 |
| Transaction | `professionalProfileId` | Immutable; set at creation |
| Deliverable | `professionalProfileId` | Immutable; set at creation |
| AuditLog | `tenantId` (= professionalProfileId when applicable) | Set at event creation |

### 3. Repository Isolation Rules

All repositories that expose tenant-scoped entities must enforce the following:

1. **Mandatory tenant filter**: Every `findBy*` method that returns tenant-scoped data requires `professionalProfileId` as a non-optional parameter.
2. **No implicit global queries**: No repository method returns all records across tenants without explicit admin authorization and scope declaration.
3. **Parameter source**: `professionalProfileId` for filtering is sourced from the authenticated token's `tenantId` claim. It is never trusted from request body or path parameters for authorization purposes.
4. **No join-based cross-tenant access**: SQL joins that traverse tenant boundaries without explicit tenant filter are prohibited.

### 4. Application Layer Isolation Enforcement

The application layer is responsible for:
1. Extracting `tenantId` from the authenticated token (ADR-0023).
2. Passing `tenantId` to all repository calls involving tenant-scoped data.
3. Verifying that the resource returned by the repository belongs to the requesting tenant before performing any mutation.
4. Never trusting `professionalProfileId` values from untrusted input (request body, query parameters) for security decisions.

### 5. Client-Tenant Association

A client (USER role) may be associated with multiple professionals. The `ProfessionalClientLink` entity models this many-to-many relationship:

```typescript
interface ProfessionalClientLink {
  professionalProfileId: string;  // Tenant
  clientId: string;               // Client user ID
  createdAtUtc: string;
  status: 'ACTIVE' | 'ENDED';
}
```

A client may only access data within the context of an active `ProfessionalClientLink`. Client queries for execution history are scoped by `(clientId, professionalProfileId)`.

### 6. Admin Cross-Tenant Access

Admin access to cross-tenant data is permitted only:
- With explicit `tenantId` scope in the admin request.
- With an AuditLog entry recording the admin access (actorId, tenantId accessed, action).
- For administrative operations defined in the authorization policy (ADR-0024).

No admin operation returns unscoped data across all tenants without explicit scope declaration.

### 7. Future Isolation Enhancement

The current logical isolation model supports future migration to:
- **Sharding by professionalProfileId**: The domain model's consistent use of `professionalProfileId` as a partition key enables horizontal sharding without contract changes.
- **Physical isolation (dedicated database per tenant)**: The repository interface pattern (ADR-0004) allows per-tenant database routing without domain layer changes.

## Invariants

1. Every tenant-scoped entity carries a non-null `professionalProfileId` field that is immutable after creation.
2. No repository method returns cross-tenant data without an explicit admin scope parameter.
3. `professionalProfileId` used for authorization filtering always originates from the authenticated token, never from client-supplied input.
4. A cross-tenant access attempt returns 404 Not Found (per ADR-0024 authorization failure semantics).
5. All admin cross-tenant accesses are logged in AuditLog.

## Constraints

- No physical per-tenant database or schema in MVP.
- Row-level security (RLS) at the database layer is a post-MVP enhancement. MVP isolation is enforced at the application layer.
- A client user's association with a professional is always mediated by `ProfessionalClientLink`. There is no direct link from UserProfile to ServicePlan without this association.

## Consequences

**Positive:**
- Client health and financial data is isolated by design.
- Simple operational model (shared database) reduces infrastructure complexity in MVP.
- Consistent `professionalProfileId` as partition key enables future sharding.

**Negative:**
- Application-layer isolation requires discipline: every query must include the tenant filter.
- Cross-tenant administrative queries require careful scoping.

## Dependencies

- ADR-0000: Project Foundation (multi-tenant logical isolation principle)
- ADR-0004: Persistence Strategy (repository interfaces carry tenant filter)
- ADR-0024: Policy-Based Authorization (tenant scope sourced from token)
- ADR-0036: Indexing and Modeling (tenant key as index prefix)
- ADR-0040: Multi-Tenant Data Isolation — Operational (operational enforcement detail)
