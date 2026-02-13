# ADR-0024 — Policy-Based Authorization

## Status

ACCEPTED

## Context

FitTrack has multiple user roles (CLIENT, PROFESSIONAL, ADMIN) with distinct permission boundaries. Authentication establishes identity (ADR-0023); authorization governs what an authenticated identity may do. Without a formal authorization policy, role-only checks are insufficient for multi-tenant isolation, resource ownership, and risk-state-aware access control.

Execution immutability and AccessGrant access are governed by ADR-0005 (Execution Core Invariant Policy).

## Decision

### 1. Authorization Model

FitTrack uses **policy-based authorization** evaluated in the application layer. Authorization policies combine:
- **Role**: The authenticated user's role (CLIENT, PROFESSIONAL, ADMIN).
- **Ownership**: Whether the actor owns or is authorized to access the specific resource.
- **Tenant scope**: Whether the resource belongs to the actor's tenant (professionalProfileId).
- **RiskStatus**: Whether the actor's current RiskStatus permits the requested operation.
- **AccessGrant**: Whether a valid AccessGrant exists for access-controlled operations.

### 2. Authorization Execution Layer

Authorization is enforced exclusively in the **Application Layer** (use case layer). It is:
- Not enforced in the Domain layer (aggregates do not know the actor's identity).
- Not enforced in the Presentation layer (controllers do not make authorization decisions).
- Not enforced in the Infrastructure layer (repositories do not filter by role).

The application layer evaluates the relevant policy before executing the use case. If authorization fails, the use case is not executed.

### 3. Authorization Policies by Operation Class

| Operation Class | Required Policy |
|----------------|----------------|
| Read own data | Role = CLIENT and ownerId = actorId |
| Read professional's client data | Role = PROFESSIONAL and professionalProfileId = tenantId |
| Create Execution | Valid AccessGrant + PROFESSIONAL role + RiskStatus ≠ BANNED |
| Create ServicePlan | PROFESSIONAL role + PlatformEntitlement ≠ SUSPENDED + RiskStatus ≠ BANNED |
| Modify client data (professional's) | PROFESSIONAL role + professionalProfileId = tenantId + resource.professionalProfileId = tenantId |
| Admin read (any tenant) | ADMIN role + explicit tenant scope in request |
| Admin write (any tenant) | ADMIN role + AuditLog entry required |
| RevokegAccessGrant | ADMIN role or Billing context system actor |
| Change RiskStatus | ADMIN role (via Risk context) |

### 4. Authorization Failure Semantics

Authorization failures must not reveal the existence of a resource to unauthorized actors:

| Scenario | HTTP Response |
|----------|--------------|
| Actor lacks role | 403 Forbidden |
| Actor authenticated but wrong tenant | 404 Not Found (do not reveal resource exists) |
| Resource exists but actor has insufficient permission | 404 Not Found |
| Actor's AccessGrant invalid for operation | 403 Forbidden with explicit reason code |

404 is used instead of 403 for cross-tenant access attempts to prevent enumeration attacks.

### 5. Multi-Tenant Authorization

- All repository queries that operate within a tenant context must include `professionalProfileId` as a mandatory filter.
- The `professionalProfileId` filter is sourced from the authenticated token's `tenantId` claim, not from request parameters.
- An actor may not elevate their tenant scope by providing a different `professionalProfileId` in the request body or path.

### 6. RiskStatus-Aware Authorization

| RiskStatus | Authorization Impact |
|-----------|---------------------|
| `NORMAL` | No restrictions |
| `WATCHLIST` | Operational limits enforced (ADR-0022); new plan activation may require review |
| `BANNED` | All mutations blocked. All sessions invalidated (ADR-0023). Read access to own historical data may be retained per platform policy. |

### 7. Admin Authorization Constraints

Admin role grants platform-wide read and write access. Admin operations:
- Always produce an AuditLog entry with `actorId`, `targetId`, `action`, `tenantId`, and `occurredAtUtc`.
- May not bypass financial invariants (cannot delete Transactions or Executions).
- May not bypass risk governance (cannot unBAN a professional via authorization bypass).

## Invariants

1. Authorization is evaluated before any use case executes. No use case proceeds without a passed authorization check.
2. Authorization decisions are made in the application layer. Neither domain nor infrastructure layer enforces authorization.
3. A failed authorization for a cross-tenant resource returns 404, not 403.
4. Admin operations always produce AuditLog entries.
5. No actor may modify their own role or tenantId via any API endpoint.
6. RiskStatus = BANNED blocks all mutations for the affected professional's account.

## Constraints

- Authorization policies are code, not configuration. They cannot be modified at runtime without a deployment.
- RBAC (role-only checks) is insufficient. All resource access checks must include ownership validation.
- No frontend-only authorization logic. All authorization is backend-enforced.

## Consequences

**Positive:**
- Fine-grained, auditable access control.
- Multi-tenant isolation enforced at the application layer.
- RiskStatus changes immediately affect all subsequent operations.

**Negative:**
- Authorization logic must be maintained per use case.
- 404-vs-403 distinction adds complexity to error handling.

## Dependencies

- ADR-0000: Project Foundation (multi-tenant isolation principle)
- ADR-0005: Execution Core Invariant Policy (no bypass of Execution immutability)
- ADR-0022: Financial Risk Governance Framework (RiskStatus-aware authorization)
- ADR-0023: Authentication, Sessions, and Token Management (token claims used in authorization)
- ADR-0025: Multi-Tenancy and Data Isolation (tenant scope enforcement)
- ADR-0027: Audit and Traceability (admin operation audit requirements)
