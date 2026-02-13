# ADR-0032 — Deploy, Environments, and Configuration

## Status

ACCEPTED

## Context

FitTrack handles sensitive personal and financial data, integrates with external payment gateways, processes webhooks, and runs asynchronous workers. Without formal environment isolation and configuration management, credentials leak between environments, production deployments introduce untested configuration, and manual interventions create non-reproducible states.

## Decision

### 1. Required Environments

| Environment | Purpose | Database Isolation |
|-------------|---------|-------------------|
| **local** | Individual developer workstation. Uses Docker-compose. | Isolated; never shared. |
| **staging** | Integration testing, QA validation, preview of releases. | Isolated; never shares production data. |
| **production** | Live platform serving real users. | Isolated; no dev/staging access. |

No environment shares a database with another environment. Production database credentials are never present in local or staging environments.

### 2. Configuration via Environment Variables

All runtime configuration is injected via environment variables. The following categories must **never** be hardcoded in source code or committed to version control:

| Category | Examples |
|----------|---------|
| Payment gateway credentials | `PAYMENT_GATEWAY_API_KEY`, `PAYMENT_WEBHOOK_SECRET` |
| Authentication secrets | `JWT_PRIVATE_KEY`, `REFRESH_TOKEN_SECRET` |
| Database connection strings | `DATABASE_URL` |
| External service URLs | `PAYMENT_GATEWAY_BASE_URL` |
| Cache configuration | `REDIS_URL`, `CACHE_TTL_SECONDS` |
| Security parameters | `BCRYPT_ROUNDS`, `SESSION_EXPIRY_SECONDS` |
| Rate limiting values | `LOGIN_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_MAX` |

Configuration values that are security-sensitive are managed via a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault). They are injected at runtime and not persisted in environment files committed to source control.

### 3. Immutable Deployable Artifact

A single build artifact is compiled once and promoted across environments:
- The artifact is not recompiled between staging and production.
- Configuration is injected at runtime via environment variables; it is not baked into the artifact.
- Deployment to production uses the same artifact that was validated in staging.

This guarantees that what is tested is what is deployed.

### 4. Database Migrations

Database schema migrations:
- Are executed by the CI/CD pipeline as a separate migration step, not on application startup.
- Are version-controlled and sequential (no manual migration in production).
- Are backward-compatible with the running application version during rolling deployments (no destructive migrations without a backward-compatible transition phase).
- Are executed against a staging environment before production.

### 5. Deployment Pipeline Requirements

| Stage | Gate |
|-------|------|
| Build | All tests pass; no type errors |
| Staging deploy | Integration tests pass; smoke tests pass |
| Migration | Backup confirmed before migration in production |
| Production deploy | Staging validation passed; rollback plan documented |

### 6. Feature Flag and Configuration Separation

Business logic parameters (rate limit values, session timeouts, feature flag states) are environment variables, not hardcoded constants. This allows configuration changes without redeployment, within the bounds defined by ADR-0031 (Feature Flags).

## Invariants

1. No environment shares a database with another environment.
2. Production credentials are never present in local or staging environments.
3. The deployment artifact is immutable — compiled once and promoted between environments.
4. Database migrations are never executed manually in production.
5. Security-sensitive configuration values are never committed to source control.

## Constraints

- Environment variables for production are managed via a secrets manager, not plain `.env` files.
- Database migrations must be backward-compatible during deployment windows.
- Rollback must be a documented, tested procedure for every production deployment.

## Consequences

**Positive:**
- Reproducible deployments across environments.
- No credential leakage between environments.
- Predictable configuration management reduces operational incidents.

**Negative:**
- CI/CD pipeline complexity increases.
- Secrets management infrastructure is a prerequisite.

## Dependencies

- ADR-0023: Authentication, Sessions, and Token Management (JWT secret configuration)
- ADR-0026: Rate Limiting and Security Policies (rate limit values as environment config)
- ADR-0031: Feature Flags and Controlled Rollout (feature flag storage in DB, not env vars)
- ADR-0035: Horizontal Scalability Strategy (stateless application depends on external config)
