# ADR-0054 — Scheduled Jobs: Contract and Governance

## Status

ACCEPTED

## Context

FitTrack requires periodic background operations that are not triggered by user requests: expiring PlatformEntitlements when their `expiresAt` date has passed, future billing reconciliation, metrics derivation, and access revocation. Without a formal contract for scheduled jobs, each implementation diverges: some throw unhandled exceptions, some manipulate aggregates directly (violating ADR-0047), some embed domain logic in the job (violating ADR-0009), and some produce no observable output for monitoring.

The ExpirePlatformEntitlementsJob was the first concrete scheduled job in the platform. This ADR formalises the contract and governance rules derived from that implementation so all future jobs follow a consistent, ADR-compliant pattern.

## Decision

### §1. IScheduledJob Contract

All scheduled jobs MUST implement the `IScheduledJob` interface:

```typescript
interface IScheduledJob {
  readonly name: string;      // Unique human-readable identifier
  readonly schedule: string;  // Cron expression (UTC)
  execute(): Promise<JobResult>;
}
```

**`name`** — unique across all registered jobs; used in logs, metrics, and alerting.

**`schedule`** — standard 5-field cron expression, always interpreted as UTC. Jobs that run on a fixed daily/hourly cadence MUST use UTC expressions. Timezone-dependent scheduling is not permitted.

**`execute()`** — MUST never throw. All errors, including infrastructure failures, are captured and returned as `JobResult.failure(error)`. An unhandled rejection from a job is an invariant violation.

### §2. JobResult Contract

```typescript
class JobResult {
  readonly isSuccess: boolean;
  readonly data?: Record<string, unknown>;
  readonly error?: Error;

  static success(data?: Record<string, unknown>): JobResult;
  static failure(error: Error): JobResult;
}
```

Every `execute()` call returns exactly one `JobResult`. The scheduler uses `isSuccess` to determine whether to alert or retry. `data` contains observability metadata (counts, timestamps). `error` is present only when `isSuccess === false`.

### §3. Job Responsibilities

Jobs are **pure orchestrators**. They MUST NOT:

- Contain domain logic (ADR-0009). No state machine transitions, no invariant checks.
- Manipulate aggregates directly. All mutations go through a Use Case (ADR-0047).
- Import or instantiate infrastructure adapters (repository implementations, ORM clients). Dependencies are injected via constructor (ADR-0002).
- Access `professionalProfileId` from context for authorization. System-scope queries that span tenants are permitted for SYSTEM-actor jobs, provided the Use Case re-enforces tenant isolation during mutation (ADR-0025 §3 exception for SYSTEM actors).

Jobs MUST:

- Query data through repository interfaces.
- Dispatch mutations through Use Cases.
- Aggregate results (processed, succeeded, failed counts).
- Return `JobResult.failure(error)` on infrastructure errors (e.g., repository throw).
- Return `JobResult.success(data)` even when some individual items fail (partial failure model — the job itself is not a failure when individual items are retried by the Use Case's idempotency).

### §4. Logging and Observability (ADR-0037 §4)

Job logs MUST NOT contain:

- Entity IDs (`entitlementId`, `clientId`, `professionalProfileId`).
- Health data, financial amounts, or PII.
- Error messages that contain user-identifiable information.

Job logs MAY contain:

- Counts (processed, succeeded, failed).
- Error codes (domain error codes from `DomainErrorCodes` — codes are not entity-specific).
- Timestamps in UTC ISO 8601 format.
- The job name.

**Correct pattern:**
```typescript
console.error('[JobName] Partial failures:', { processed: N, failed: M, failures: [{ errorCode, error }] });
```

**Prohibited pattern:**
```typescript
console.error('[JobName] Failed:', { entitlementId: '...', professionalProfileId: '...' });
```

### §5. Temporal Policy Compliance (ADR-0010 §2)

Jobs that use the current time as a reference point MUST capture it as a UTC ISO 8601 string:

```typescript
const nowUtc = new Date().toISOString(); // ✅ correct
```

This string is passed to repository query methods. Repository interface methods that accept a time reference MUST be typed as `string` (ISO UTC), not `Date` object, to enforce the temporal policy at the type level.

### §6. Repository Query Methods for Jobs

Repository methods introduced specifically for job queries (e.g., `findExpiredEntitlements`) follow the same tenant isolation rules as other queries, with the following exception:

**System-scope queries** that intentionally span all tenants (e.g., "find all expired entitlements across all professionals") are permitted when:

1. The caller is a SYSTEM-actor job (no authenticated user token).
2. The query result is used solely to dispatch Use Cases that re-enforce tenant isolation during mutation.
3. The method is documented with `// SYSTEM-scope: spans tenants — called by [JobName] only`.

### §7. Job Registration

Jobs are registered in a central `scheduledJobs` registry. The registry is the sole point where job instances are created with their dependencies. Jobs are never instantiated ad-hoc in use cases or domain code.

### §8. Idempotency

Jobs rely on Use Case idempotency (ADR-0007) for safe retries. A job that processes 100 entitlements and fails on item 50 may be re-run; the Use Cases for items 1–49 will return `Right(void)` without side effects. The job MUST NOT implement its own deduplication logic — that is the Use Case's responsibility.

## Invariants

1. All scheduled jobs implement `IScheduledJob`. No `execute()` call ever throws — errors return `JobResult.failure(error)`.
2. Jobs contain no domain logic. All mutations go through Use Cases.
3. Job logs never contain entity IDs or PII (ADR-0037 §4).
4. Repository methods for jobs accept `string` (ISO UTC) for time references, not `Date` objects (ADR-0010 §2).
5. Jobs use `new Date().toISOString()` to capture the current time as a UTC string before passing it to repositories.
6. System-scope repository queries (spanning tenants) are documented and used only by SYSTEM-actor jobs.

## Constraints

- Job implementations live in the `jobs/` directory of the module that owns the data (e.g., `packages/platform/jobs/`).
- Shared infrastructure (`IScheduledJob`, `JobResult`) lives in `shared/jobs/` within the module until a cross-module scheduler package is introduced.
- Cron expressions are always UTC. Timezone-aware scheduling requires a future ADR amendment.

## Consequences

**Positive:**
- Uniform pattern for all background jobs: predictable error handling, consistent logging, and observable results.
- ADR-compliant separation between orchestration (job) and domain mutations (use case).
- Sanitized logging eliminates a class of ADR-0037 violations in background processing.

**Negative:**
- Jobs that previously returned `void` or threw exceptions require refactoring to `JobResult`.
- System-scope repository queries require explicit documentation to distinguish from accidental cross-tenant access.

## Dependencies

- ADR-0009: Domain Event Contract (aggregate purity — jobs are not aggregates)
- ADR-0010: Canonical Temporal Policy (ISO UTC strings in repository signatures)
- ADR-0025: Multi-Tenancy and Data Isolation (SYSTEM-scope exception for scheduler queries)
- ADR-0037: Sensitive Data Handling (log sanitization)
- ADR-0045: ADR Governance (this ADR formalises the IScheduledJob contract)
- ADR-0047: Canonical Aggregate Root Definition (Use Case dispatch, not direct aggregate manipulation)
- ADR-0007: Idempotency Policy (job retries rely on Use Case idempotency)
