# ADR-0030 — Cache and Performance Strategy

## Status

ACCEPTED

## Context

FitTrack serves high-read workloads: public service plan catalogs, scheduling read models, professional profiles, and exercise/food templates. Without a cache strategy, every request hits the primary database, increasing latency, database load, and infrastructure cost. Conversely, caching sensitive or mutable data (AccessGrants, Transactions, Execution records) creates inconsistency risk and compliance exposure.

## Decision

### 1. Cache Layer Architecture

The platform uses three cache layers with strict scope restrictions:

**Layer 1 — HTTP/CDN Cache (Infrastructure):**
- Applicable only to static assets, public documentation, and unauthenticated marketing content.
- Never applied to authenticated API responses, health data, or financial data.

**Layer 2 — Application Cache (Redis):**
- Shared distributed cache; consistent across all application instances (ADR-0035).
- Applicable to: public catalogs, active exercise/food templates, professional profile read models, scheduling read models, feature flags, rate limit counters.
- All entries must have an explicit TTL.
- Cache keys must be namespaced by entity type and version.

**Layer 3 — Process-Level In-Memory Cache:**
- Applicable only to immutable configuration: enumerators, feature flag snapshots, static policy tables.
- Must be invalidated on deployment.
- Never used for tenant-scoped data.

### 2. Cacheable vs Non-Cacheable Data

| Data | Cacheable | Cache Layer | TTL |
|------|-----------|-------------|-----|
| Public service plan catalog | Yes | Redis | 5 minutes |
| Exercise/food templates (active) | Yes | Redis | 15 minutes |
| Professional profile (public view) | Yes | Redis | 10 minutes |
| Scheduling read model (agenda) | Yes | Redis | 1 minute |
| Feature flags | Yes | Redis + Process | 5 minutes |
| Rate limit counters | Yes | Redis | Per limit window |
| Static enumerators | Yes | Process | Until deployment |
| Execution records | **No** | — | — |
| Transaction records | **No** | — | — |
| AccessGrant status | **No** | — | — |
| RiskStatus | **No** | — | — |
| Billing state | **No** | — | — |
| logicalDay computations | **No** | — | — |
| Health metric data | **No** | — | — |

The prohibition on caching Execution, Transaction, AccessGrant, RiskStatus, and Billing state is an invariant (Section 5). These entities require always-current state for correctness and compliance.

### 3. Cache Invalidation Policy

Cache entries are invalidated by:
- Domain event publication (e.g., `ServicePlanUpdated`, `TemplateVersionChanged`).
- TTL expiry (the primary safety net when events are missed).
- Explicit invalidation on write operations that modify cached entities.

Cache invalidation must be fire-and-forget — a failure to invalidate cache does not block the originating write. Stale cache is corrected by TTL expiry.

### 4. Cache Key Conventions

```
fittrack:{entity_type}:{entity_id}:{version_or_variant}
```

Examples:
```
fittrack:service_plan:public:{professionalProfileId}
fittrack:schedule:read_model:{professionalProfileId}:{logicalDay}
fittrack:feature_flags:global:v1
```

Tenant-scoped cache keys must include `professionalProfileId` to prevent cross-tenant cache pollution.

### 5. Sensitive Data Cache Prohibition

The following data must never be stored in any cache layer under any circumstances:
- Execution records and their computed metrics.
- Transaction records, payment status, or financial amounts.
- AccessGrant status or remaining session counts.
- UserProfile PII (name, email, phone, national ID).
- Health metric values (physiological assessments).
- RiskStatus of any professional.
- Authentication tokens (handled by ADR-0023).

## Invariants

1. Execution, Transaction, AccessGrant, RiskStatus, and Billing state are never cached.
2. All Redis cache entries have an explicit TTL. No entry is created without TTL.
3. Tenant-scoped cache keys always include `professionalProfileId` to prevent cross-tenant pollution.
4. Cache invalidation failures do not block or roll back write operations.
5. Process-level in-memory cache is invalidated on deployment and never holds tenant-scoped data.

## Constraints

- Redis is the shared distributed cache for all application instances. Local process cache is restricted to immutable data only.
- Cache is not a substitute for database indexing. Both must be correctly implemented per ADR-0036.
- Cache warming on startup is permissible for static data only.

## Consequences

**Positive:**
- Reduced database load on high-read paths.
- Horizontal scaling without per-instance cache divergence.
- Predictable latency for public catalog and scheduling reads.

**Negative:**
- Temporary stale data possible on cached paths (bounded by TTL).
- Cache invalidation complexity grows with data relationships.
- Redis dependency required for distributed cache consistency (ADR-0035).

## Dependencies

- ADR-0009: Domain Event Contract (events trigger cache invalidation)
- ADR-0010: Canonical Temporal Policy (logicalDay used in cache keys; never recomputed from cache)
- ADR-0025: Multi-Tenancy and Data Isolation (tenant-scoped cache keys)
- ADR-0035: Horizontal Scalability Strategy (Redis as shared state)
- ADR-0036: Indexing and Modeling for Growth (cache complements indexing; does not replace it)
