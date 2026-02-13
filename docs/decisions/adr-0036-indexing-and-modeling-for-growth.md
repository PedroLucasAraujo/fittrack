# ADR-0036 — Indexing and Modeling for Growth

## Status

ACCEPTED

## Context

FitTrack's high-volume entities — Execution, SelfLog, AuditLog, Transaction, Booking — are queried frequently by time range, tenant scope, and user scope. Without formal indexing decisions, queries degrade to full table scans as data volume grows, causing progressive performance degradation and lock contention. Over-indexing degrades write performance. Both extremes must be avoided through deliberate index design.

## Decision

### 1. Mandatory Index Catalog

The following indexes are required for performance correctness at production scale:

**Execution table:**
```sql
-- Primary query patterns
INDEX idx_execution_tenant_user     ON Execution (professionalProfileId, userId, executedAtUtc DESC)
INDEX idx_execution_tenant_day      ON Execution (professionalProfileId, logicalDay)
INDEX idx_execution_user_day        ON Execution (userId, logicalDay)
INDEX idx_execution_access_grant    ON Execution (accessGrantId, executedAtUtc DESC)
```

**Transaction table:**
```sql
INDEX idx_transaction_tenant_user   ON Transaction (professionalProfileId, userId, createdAtUtc DESC)
INDEX idx_transaction_service_plan  ON Transaction (servicePlanId, createdAtUtc DESC)
INDEX idx_transaction_status        ON Transaction (status, createdAtUtc DESC)
```

**Booking table:**
```sql
INDEX idx_booking_tenant_day        ON Booking (professionalProfileId, logicalDay)
INDEX idx_booking_user              ON Booking (userId, logicalDay)
INDEX idx_booking_session           ON Booking (sessionId, status)
```

**AuditLog table:**
```sql
INDEX idx_audit_entity              ON AuditLog (targetEntityType, targetEntityId, occurredAtUtc DESC)
INDEX idx_audit_actor               ON AuditLog (actorId, occurredAtUtc DESC)
INDEX idx_audit_tenant              ON AuditLog (tenantId, occurredAtUtc DESC)
```

**AccessGrant table:**
```sql
INDEX idx_access_grant_client       ON AccessGrant (professionalProfileId, clientId, status)
INDEX idx_access_grant_plan         ON AccessGrant (servicePlanId, status)
```

### 2. Index Justification Requirement

New indexes must be justified with:
1. The specific query pattern they serve.
2. The expected data volume at which they become necessary.
3. The write performance impact assessment.

Indexes without justification documentation are subject to removal in performance review.

### 3. Temporal Modeling Requirements

All entities with time-based queries must include:

| Field | Purpose | Mandatory For |
|-------|---------|--------------|
| `createdAtUtc` | Record creation timestamp | All entities |
| `executedAtUtc` | Activity timestamp | Execution, SelfLog, Booking |
| `logicalDay` | Calendar date in user timezone (ADR-0010) | Execution, Booking, Deliverable |

Temporal indexes always sort descending (`DESC`) on time fields to optimize "most recent first" query patterns.

### 4. Composite Index Prefix Convention

All composite indexes on tenant-scoped entities must begin with `professionalProfileId` as the leading column:
- This enables the index to be used for both tenant-scoped and platform-wide queries.
- This aligns with the partition key strategy (ADR-0035) for future sharding.

### 5. Future Partitioning Preparation

Execution and AuditLog are expected to reach volumes requiring table partitioning. The index design supports future partitioning by:
- `logicalDay` (monthly/yearly range partitions).
- `professionalProfileId` (shard partitions).

Partitioning is a post-MVP enhancement. MVP uses standard indexed tables. The index design must not assume partitioned tables before they exist.

### 6. Index Maintenance

- Indexes are created via version-controlled database migrations (ADR-0032).
- No index is created manually in production.
- Unused indexes (not referenced by any query in ≥90 days) are candidates for removal after performance review.

## Invariants

1. All tenant-scoped composite indexes begin with `professionalProfileId` as the leading column.
2. All Execution and AuditLog tables have indexes on `(professionalProfileId, occurredAtUtc DESC)` or equivalent.
3. No index is created without documented query pattern justification.
4. Indexes are created only via database migrations; no manual index creation in production.

## Constraints

- Index design must account for write performance: every index added to high-write tables (Execution, AuditLog) must be evaluated for write overhead.
- Covering indexes (indexes that include all columns needed by a query) are preferred over index + fetch for high-frequency query paths.
- Partial indexes are permitted where applicable (e.g., index only ACTIVE AccessGrants).

## Consequences

**Positive:**
- Predictable query performance as data volume grows.
- Future sharding enabled by consistent partition key prefix in all indexes.
- Controlled index sprawl through justification requirements.

**Negative:**
- Index planning requires upfront effort and ongoing review.
- Future schema migrations for partitioning will require index restructuring.

## Dependencies

- ADR-0005: Execution Core Invariant Policy (Execution is the primary high-volume write target)
- ADR-0010: Canonical Temporal Policy (logicalDay as indexed field)
- ADR-0025: Multi-Tenancy and Data Isolation (professionalProfileId as leading index column)
- ADR-0032: Deploy, Environments, and Configuration (indexes created via migrations)
- ADR-0035: Horizontal Scalability Strategy (partition key alignment for future sharding)
