# ADR-0034 — Backup, Recovery, and Business Continuity

## Status

ACCEPTED

## Context

FitTrack stores Tier 1 permanent entities — Execution records, Transactions, AuditLogs, AccessGrants — that are legally required to be retained for a minimum of 5 years (ADR-0013). Data loss is operationally and legally unacceptable. The platform must have a documented, tested, and automatable backup and recovery strategy that does not depend on individual operator knowledge.

## Decision

### 1. Backup Policy

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full database backup | Daily | 30 days minimum |
| Incremental backup | Every 6 hours | 7 days |
| Point-in-time recovery (PITR) | Continuous (WAL archiving) | 7 days |
| Pre-migration backup | Before every production migration | 90 days |

Backups are stored in a separate storage system from the primary database — geographically distinct if the infrastructure provider supports it.

### 2. Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | ≤ 6 hours (last incremental backup) |
| **RTO** (Recovery Time Objective) | ≤ 4 hours for full restoration from backup |
| Point-in-time recovery precision | ≤ 5 minutes for PITR-capable events |

These targets are operational commitments, not SLA guarantees to end users. They must be validated annually through recovery tests.

### 3. Recovery Testing

Untested backups are not valid backups:
- Full restoration test must be performed at minimum **quarterly** in a non-production environment.
- Test procedure: restore from backup → run data integrity validation queries → confirm Tier 1 entity counts match pre-backup counts.
- Test results must be documented and retained.

### 4. Disaster Recovery Plan

The Disaster Recovery (DR) plan must:
- Be documented in the operations runbook.
- Not require knowledge held exclusively by any individual operator.
- Define the escalation chain for activating DR.
- Specify which data sources are authoritative for reconstruction (primary database → backup → Tier 1 entities).
- Be reviewed and updated after every production incident that affects data availability.

### 5. Pre-Migration Backup Gate

Before any database migration runs in production (per ADR-0032):
- A verified backup is created and confirmed accessible.
- The migration proceeds only after backup confirmation.
- If backup is not accessible or not confirmed, the migration is blocked.

### 6. Data Loss Classification

In the event of partial data loss, recovery priority order is:

| Priority | Entity Class | Reason |
|----------|-------------|--------|
| 1 | Execution records | Legal compliance; financial verification |
| 2 | Transaction records | Financial regulation |
| 3 | AuditLog entries | Regulatory compliance |
| 4 | AccessGrant records | Service authorization history |
| 5 | UserProfile records | Operational continuity |
| 6 | Scheduling and ServicePlan data | Operational continuity |

## Invariants

1. Backup and primary database are stored in separate storage systems.
2. Backup restoration is tested at minimum quarterly; untested backups are not operationally valid.
3. Production database migrations require a verified backup before execution.
4. The DR plan does not depend on individual operator knowledge.
5. Backup retention meets the minimum legal retention period for Tier 1 entities (5 years, per ADR-0013).

## Constraints

- Point-in-time recovery capability (WAL archiving or equivalent) is required for the production database.
- Backup encryption must match the data encryption policy (ADR-0028): backups are encrypted at rest.
- Recovery tests are performed in an isolated environment; they never target the production database.

## Consequences

**Positive:**
- Operationally resilient against database failure, provider incidents, and accidental data loss.
- Legal compliance maintained even in recovery scenarios.
- Recovery procedures are executable by any trained operator.

**Negative:**
- Backup storage cost grows with data volume.
- Recovery tests consume engineering time.

## Dependencies

- ADR-0013: Soft Delete and Data Retention Policy (Tier 1 entities require 5-year retention)
- ADR-0028: Platform Nature, LGPD, and Liability Boundaries (backup encryption obligations)
- ADR-0032: Deploy, Environments, and Configuration (pre-migration backup gate)
