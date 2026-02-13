# ADR-0035 — Horizontal Scalability Strategy

## Status

ACCEPTED

## Context

FitTrack is a multi-tenant platform with read-intensive workloads (scheduling, catalogs, execution history) and write-critical paths (Execution creation, payment processing). The platform uses event-driven coordination for cross-context workflows. Vertical scaling (larger database instances) is not a sustainable growth strategy. The architecture must support horizontal scaling without violating domain invariants.

## Decision

### 1. Stateless Application Layer

The application process must be stateless:
- No user session data stored in application process memory.
- No critical business state cached exclusively in process memory (see ADR-0030).
- Multiple application instances may run simultaneously without coordination.

All state resides in:
- The primary database (authoritative state).
- Redis (distributed cache and rate limit counters; see ADR-0030).
- External storage (file attachments, exports).

### 2. Workload Separation

The application architecture supports separation of workloads into independently scalable units:

| Workload | Scaling Characteristic | Future Separation Target |
|----------|----------------------|------------------------|
| Synchronous API | Request-bound; scales with connection pool | API service |
| Async event workers | Throughput-bound; scales with queue depth | Worker service |
| Webhook handlers | Burst-tolerant; isolated from main API | Webhook service |
| Scheduled jobs | Time-triggered; singleton or distributed | Scheduler service |

In MVP, these workloads run in a single deployable unit. The architecture must not create dependencies that prevent future workload separation without domain contract changes.

### 3. Read/Write Separation

Read models (scheduling agenda, dashboard, analytics) are derived from write models and do not share the same query path:
- Read models may be served from Redis cache (ADR-0030) or dedicated read replicas.
- Read model staleness is bounded by the eventual consistency SLA (ADR-0016).
- Write model integrity (Execution as source of truth) is not compromised by read model separation.

Read replicas are a post-MVP enhancement. MVP uses the primary database for all reads.

### 4. Domain Invariant Preservation Under Scale

Horizontal scaling must not compromise:
- **Execution immutability** (ADR-0005): Concurrent writes use optimistic locking (ADR-0006).
- **Idempotency** (ADR-0007): Idempotency keys are stored in the shared database, not process memory.
- **Tenant isolation** (ADR-0025): Tenant filters are applied in the application layer; no process-local state bypasses tenant isolation.
- **Financial ledger consistency** (ADR-0021): Post-MVP ledger entries are produced by at-most-once-guaranteed mechanisms.

### 5. Partition Key Design

`professionalProfileId` is the primary partition key for all tenant-scoped entities. This enables future database sharding without domain contract changes:
- All queries on tenant-scoped data include `professionalProfileId` as the leading filter.
- Index design uses `professionalProfileId` as the index prefix (ADR-0036).
- Future sharding by `professionalProfileId` requires no application-layer changes.

### 6. Observability Requirements for Scaled Deployments

Horizontal scaling requires distributed observability:
- Structured logging with correlation IDs traceable across instances.
- Distributed tracing for multi-instance request flows.
- Centralized log aggregation (all instances write to the same log sink).
- Health check endpoints per instance for load balancer integration.

## Invariants

1. The application process is stateless. No domain state is held in process memory between requests.
2. Idempotency keys and rate limit counters reside in shared distributed storage (Redis), not process memory.
3. Horizontal scaling never bypasses tenant isolation, Execution immutability, or financial invariants.
4. `professionalProfileId` is always used as the leading key in tenant-scoped queries, supporting future sharding.
5. Multiple application instances may run simultaneously without coordination for stateless operations.

## Constraints

- Redis is a runtime dependency for distributed state. The platform cannot operate without it in production.
- Optimistic locking (ADR-0006) is the concurrency control mechanism; it does not prevent scaling but requires conflict-retry logic in high-concurrency scenarios.
- Read replicas require lag monitoring. Reads served from replicas are subject to the eventual consistency SLA (ADR-0016).

## Consequences

**Positive:**
- Predictable horizontal scaling path as platform usage grows.
- No scaling bottleneck from stateful application processes.
- Future workload separation (workers, webhooks) does not require domain model changes.

**Negative:**
- Redis is a mandatory infrastructure dependency.
- Observability complexity increases with instance count.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (immutability preserved under concurrent writes)
- ADR-0006: Concurrency Control (optimistic locking for concurrent access)
- ADR-0007: Idempotency Policy (idempotency keys in shared storage)
- ADR-0016: Formal Eventual Consistency Policy (read model staleness SLA)
- ADR-0025: Multi-Tenancy and Data Isolation (tenant isolation preserved under scaling)
- ADR-0030: Cache and Performance Strategy (Redis as shared distributed cache)
- ADR-0036: Indexing and Modeling for Growth (partition key design)
