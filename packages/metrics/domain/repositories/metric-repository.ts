import type { LogicalDay } from '@fittrack/core';
import type { Metric } from '../aggregates/metric.js';
import type { MetricType } from '../enums/metric-type.js';

/**
 * Repository interface for the Metric aggregate root (ADR-0047 §3).
 *
 * ## Immutability contract (ADR-0014 §5, ADR-0043 §5)
 *
 * Metric records are never overwritten. This repository exposes only
 * `save()` (INSERT). No `update()` or `delete()` methods exist. Rule
 * changes produce new records via `save()`.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * All query methods require `professionalProfileId`. Cross-tenant queries
 * return `null` or empty arrays — never `403`.
 *
 * ## Idempotency (ADR-0007)
 *
 * `findBySourceExecutionIdAndType()` is used by `DeriveExecutionMetrics`
 * to guard against duplicate metric derivation on at-least-once event
 * delivery (ADR-0016 §1).
 */
export interface IMetricRepository {
  /**
   * Persists a new Metric record.
   * Implementations must enforce INSERT-only semantics (no UPDATE).
   */
  save(metric: Metric): Promise<void>;

  /**
   * Finds a Metric by its unique ID, scoped to the tenant.
   * Returns null when not found or when the metric belongs to a different tenant.
   */
  findById(id: string, professionalProfileId: string): Promise<Metric | null>;

  /**
   * Idempotency guard: finds the most recently computed Metric of the given
   * type that was derived from a specific Execution, scoped to the tenant.
   *
   * Used by `DeriveExecutionMetrics` to detect duplicate derivation.
   * Returns null if no metric has been derived for this execution + type combination.
   */
  findBySourceExecutionIdAndType(
    executionId: string,
    metricType: MetricType,
    professionalProfileId: string,
  ): Promise<Metric | null>;

  /**
   * Finds all Metric records for a client on a specific logicalDay, scoped to tenant.
   * Returns an empty array when none exist.
   */
  findByClientAndLogicalDay(
    clientId: string,
    logicalDay: LogicalDay,
    professionalProfileId: string,
  ): Promise<Metric[]>;

  /**
   * Finds all Metric records for a client within a logicalDay range [from, to] inclusive,
   * scoped to tenant.
   * Used by read models for dashboard views.
   * Returns an empty array when none exist.
   */
  findByClientAndDateRange(
    clientId: string,
    from: LogicalDay,
    to: LogicalDay,
    professionalProfileId: string,
  ): Promise<Metric[]>;
}
