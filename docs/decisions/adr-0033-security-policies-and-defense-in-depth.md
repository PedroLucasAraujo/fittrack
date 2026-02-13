# ADR-0033 — Security Policies and Defense-in-Depth

## Status

ACCEPTED

## Context

FitTrack stores health data, processes financial transactions, and manages multi-tenant access. Rate limiting (ADR-0026) and authentication (ADR-0023) address specific threat vectors, but a comprehensive security posture requires layered controls. Defense-in-depth means no single control is relied upon exclusively; multiple independent layers protect the platform against different attack classes.

## Decision

### 1. Security Layer Model

| Layer | Control | ADR Reference |
|-------|---------|--------------|
| Network | TLS 1.2+ for all communications | ADR-0028 |
| Transport | Security headers on all responses | ADR-0026 |
| Authentication | JWT with short expiry; refresh token rotation | ADR-0023 |
| Rate limiting | Per-IP and per-user rate limiting | ADR-0026 |
| Authorization | Policy-based; application layer only | ADR-0024 |
| Input validation | Schema validation at presentation layer | ADR-0026 |
| Data isolation | Tenant-scoped repository queries | ADR-0025 |
| Audit | Immutable AuditLog for all sensitive operations | ADR-0027 |
| Data protection | Encryption at rest and in transit | ADR-0028 |
| Sensitive data | LGPD operational controls | ADR-0037 |

No single layer is a substitute for any other. All layers must be active simultaneously.

### 2. Input Sanitization Policy

- All inputs entering the system through HTTP are validated against a schema at the presentation layer before reaching the application layer.
- SQL injection prevention: parameterized queries only; no string interpolation into SQL.
- XSS prevention: no raw user input rendered in HTML responses.
- Command injection prevention: no user input interpolated into shell commands.
- Path traversal prevention: file paths derived from user input are rejected or normalized before use.
- Validation failures return HTTP 422 with structured error details (no stack traces or internal error messages exposed to clients).

### 3. Secrets Management Policy

| Secret Type | Storage | Access |
|-------------|---------|--------|
| JWT signing keys | Secrets manager | Application layer only; never logged |
| Payment gateway API keys | Secrets manager | Payment context only |
| Database credentials | Secrets manager | Infrastructure layer only |
| Webhook signing secrets | Secrets manager | Webhook handler only |
| Refresh tokens (hashed) | Database | Authentication context only |

Secrets must never appear in:
- Application logs.
- Error responses.
- Version control.
- Environment files committed to source control.

### 4. Dependency Security

- Third-party dependencies must be reviewed for known vulnerabilities (CVE scanning) in the CI/CD pipeline.
- Dependencies with known critical vulnerabilities must not be deployed to production.
- Dependency updates are treated as code changes and require testing before deployment.

### 5. Error Handling and Information Leakage Prevention

- Production error responses must not expose: stack traces, database error messages, internal entity IDs (beyond what the API contract requires), or server configuration details.
- Authentication failures return generic messages (no distinction between "user not found" and "wrong password" to prevent user enumeration).
- Cross-tenant access attempts return 404 (ADR-0024) to prevent resource enumeration.

### 6. Security Monitoring

The following security events generate monitoring alerts:
- `ACCOUNT_LOCKED`: login lockout threshold reached.
- `REFRESH_TOKEN_THEFT_DETECTED`: token reuse pattern detected.
- `AUTHORIZATION_FAILURE`: repeated authorization failures from same actor.
- `WEBHOOK_VALIDATION_FAILED`: repeated webhook signature failures from same source.
- Rate limit threshold exceeded on sensitive endpoints.

All events above also generate AuditLog entries per ADR-0027.

### 7. Security Testing Requirements

- Authentication and authorization flows require integration tests covering:
  - Cross-tenant access attempts (must return 404).
  - Expired token rejection.
  - Revoked session rejection.
  - BANNED professional access rejection.
- Input validation must have unit tests covering: SQL injection patterns, oversized inputs, malformed UUIDs, and missing required fields.

## Invariants

1. TLS 1.2+ is mandatory for all API communications. HTTP (non-TLS) is not permitted in staging or production.
2. No user input is interpolated directly into SQL queries, HTML responses, or shell commands.
3. Secrets never appear in logs, error responses, or source control.
4. Security controls operate at separate layers; disabling one layer does not compensate with another.
5. Cross-tenant access attempts always return 404, never 403, to prevent resource enumeration.

## Constraints

- Security headers (ADR-0026) are applied at the infrastructure/middleware layer, not per-route.
- Input validation is the responsibility of the presentation layer; domain aggregates do not re-validate externally validated input.
- Security monitoring alerts must be actionable: false positives must be minimized through threshold tuning.

## Consequences

**Positive:**
- Defense-in-depth reduces the blast radius of any single control failure.
- Layered controls provide forensic evidence chains for incident response.

**Negative:**
- Multiple independent security layers require coordinated maintenance.
- Security testing overhead increases with each new endpoint.

## Dependencies

- ADR-0023: Authentication, Sessions, and Token Management (authentication layer)
- ADR-0024: Policy-Based Authorization (authorization layer)
- ADR-0025: Multi-Tenancy and Data Isolation (data isolation layer)
- ADR-0026: Rate Limiting and Security Policies (rate limiting and security headers)
- ADR-0027: Audit and Traceability (security event logging)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (data encryption obligations)
- ADR-0037: Sensitive Data Handling — LGPD Operational (sensitive data classification)
