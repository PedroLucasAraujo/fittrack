import type { LogicalDay } from '@fittrack/core';
import type { SelfLogEntry } from '../aggregates/self-log-entry.js';

/**
 * Repository interface for the SelfLogEntry aggregate (ADR-0047 §7).
 *
 * ## Tenant isolation (ADR-0025)
 *
 * All query methods accept `professionalProfileId` as a mandatory scoping
 * parameter. `findById` returns `null` on cross-tenant access (404, not 403).
 *
 * ## Idempotency
 *
 * `findBySourceExecutionId` is used by the `ProjectExecutionToSelfLog` handler
 * to guard against duplicate projections (ADR-0007 idempotency policy).
 *
 * ## Indexing requirements (ADR-0036)
 *
 * Infrastructure implementations MUST maintain composite indexes on:
 * - (clientId, logicalDay, professionalProfileId) — for day-range queries
 * - (sourceId, professionalProfileId) — for projection idempotency checks
 * - (clientId, professionalProfileId) — for full client history queries
 */
export interface ISelfLogEntryRepository {
  /**
   * Persists a new or updated SelfLogEntry.
   * Infrastructure must handle both INSERT (new) and UPDATE (anonymized)
   * based on whether the aggregate has been previously persisted.
   */
  save(entry: SelfLogEntry): Promise<void>;

  /**
   * Finds a SelfLogEntry by its ID, scoped to the given tenant.
   * Returns null if not found or if the entry belongs to a different tenant.
   * Cross-tenant access returns null (404 semantics, ADR-0025).
   */
  findById(id: string, professionalProfileId: string): Promise<SelfLogEntry | null>;

  /**
   * Finds all non-deleted SelfLog entries for a client on a specific logical day.
   * Scoped to the given tenant (professionalProfileId).
   */
  findByClientAndLogicalDay(
    clientId: string,
    logicalDay: LogicalDay,
    professionalProfileId: string,
  ): Promise<SelfLogEntry[]>;

  /**
   * Finds all non-deleted SelfLog entries for a client within a date range
   * (inclusive on both ends). Scoped to the given tenant.
   */
  findByClientAndDateRange(
    clientId: string,
    from: LogicalDay,
    to: LogicalDay,
    professionalProfileId: string,
  ): Promise<SelfLogEntry[]>;

  /**
   * Finds a SelfLogEntry that was projected from the given Execution ID.
   * Used by `ProjectExecutionToSelfLog` to check for existing projections
   * and enforce idempotency (ADR-0007).
   *
   * Returns null if no projection exists for the given executionId.
   */
  findBySourceExecutionId(
    executionId: string,
    professionalProfileId: string,
  ): Promise<SelfLogEntry | null>;

  /**
   * Returns all SelfLog entries (including anonymized) for a given client,
   * scoped to the given tenant. Used for LGPD data subject access requests
   * and audit purposes.
   *
   * Returns an empty array if no entries exist.
   */
  findAllByClientId(clientId: string, professionalProfileId: string): Promise<SelfLogEntry[]>;
}
