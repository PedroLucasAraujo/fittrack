# ADR-0051 — Domain Error Handling Policy

## Status

ACCEPTED

**Date**: 2025-02-25

## Context

The codebase uses `Either<DomainError, T>` (aliased as `DomainResult<T>`) for domain layer error handling, but this pattern is not formally documented. Lack of formalization leads to inconsistent error handling across contexts and unclear contracts between layers.

## Decision

### §1. Core Principle

The domain layer NEVER throws exceptions. Every domain method returns `DomainResult<T>` (alias for `Either<DomainError, T>`). `Left` indicates a business error; `Right` indicates success.

### §2. Layer Responsibilities

| Layer | Error Mechanism | Behavior |
|-------|----------------|----------|
| Domain | `DomainResult<T>` | Returns `Left(error)` or `Right(value)`. Never throws. |
| Application | Orchestrates DomainResults | Propagates domain errors. May throw infrastructure exceptions (caught by global middleware). |
| Infrastructure | May throw | Repository converts DB errors into DomainErrors when semantically relevant (e.g., unique constraint → `ConflictError`). Unrecoverable infrastructure failures are thrown as exceptions. |
| Presentation | Global error handler | Maps `DomainError` → HTTP status code. Maps unhandled exceptions → 500. |

### §3. DomainError Taxonomy

| Error Type | HTTP Status | Usage |
|-----------|------------|-------|
| `ValidationError` | 400 | Input validation failures, malformed data |
| `NotFoundError` | 404 | Entity not found within tenant scope |
| `ForbiddenError` | 403 | Authorization failures after policy evaluation |
| `ConflictError` | 409 | Duplicate detection, business state conflicts |
| `BusinessRuleViolation` | 422 | Domain invariant violated (e.g., invalid state transition, limit exceeded) |
| `ConcurrencyConflictError` | 409 | Optimistic lock failure (per ADR-0006) |

### §4. DomainError Structure

Every `DomainError` carries:

| Field | Type | Description |
|-------|------|-------------|
| `code` | string (enum) | Stable identifier (e.g., `EXECUTION_ALREADY_CONFIRMED`, `ACCESS_GRANT_EXPIRED`). Clients may match on this. Stable across versions. |
| `message` | string | Human-readable description for debugging. NOT stable — may change between versions. Safe for API responses. |
| `context` | object (optional) | Structured metadata (e.g., `{ entityId, currentStatus, attemptedTransition }`). Never contains PII. |

### §5. Production Safety

- Error responses in production NEVER expose stack traces, database messages, or internal server details.
- `DomainError.message` is safe for API responses.
- Infrastructure exception messages are NOT safe — they are replaced with generic text in error responses.
- AuditLog entries for errors use error `code` only, never `message` or `context` (to prevent PII leak risk, per ADR-0037).

### §6. Application Layer Obligations

- Application layer must handle `Left` results explicitly. Silent swallowing of `Left` values is prohibited.
- When an Application layer use case encounters a `Left`, it must either propagate it or map it to a semantically appropriate error.
- Application layer MUST NOT convert a `DomainError` to a thrown exception before the Presentation layer has had the opportunity to map it.

### §7. Infrastructure Layer Conversion Rules

The Infrastructure layer is the boundary where database/network exceptions are converted to `DomainError`:

| Infrastructure Exception | Converted To | Example |
|--------------------------|-------------|---------|
| Unique constraint violation | `ConflictError` | Duplicate `IdempotencyKey` |
| Record not found | `NotFoundError` | Entity missing from DB |
| Optimistic lock failure (version mismatch) | `ConcurrencyConflictError` | Concurrent aggregate modification |
| Unrecoverable DB failure | Thrown exception (not DomainError) | Connection lost, disk full |

## Invariants

1. Domain layer methods never throw exceptions; they return `DomainResult<T>`.
2. Application layer never silently swallows `Left` results.
3. Production error responses never contain stack traces, DB messages, or internal details.
4. Error `code` values are stable across versions. `message` values are not.
5. AuditLog error entries reference `code` only — never `message` or `context`.

## Constraints

- New `DomainError` codes must be documented in the relevant ADR or domain module before use.
- `ForbiddenError` (403) is used only after policy evaluation. Pre-policy failures use `NotFoundError` (404) per ADR-0025 tenant isolation rules (cross-tenant access → 404, not 403).
- `Either` type is defined in `@fittrack/core`. No bounded context redefines it independently.

## Consequences

**Positive:**
- Consistent, predictable error handling across all bounded contexts.
- Clear layer contracts: domain never throws, infrastructure converts, presentation maps.
- Safe API responses by construction — no accidental information leakage.
- Testable error paths: `Left` results are values, not thrown exceptions.

**Negative:**
- Domain methods return `DomainResult<T>` instead of plain values, adding a small ergonomic overhead.
- Application layer must explicitly unwrap results, adding boilerplate per use case.

## Dependencies

- ADR-0000: Project Foundation (domain purity)
- ADR-0006: Concurrency Control (ConcurrencyConflictError from optimistic lock)
- ADR-0025: Multi-Tenancy and Data Isolation (cross-tenant → 404 not 403)
- ADR-0027: Audit and Traceability (error codes in AuditLog)
- ADR-0037: Sensitive Data Handling (no PII in error context)
