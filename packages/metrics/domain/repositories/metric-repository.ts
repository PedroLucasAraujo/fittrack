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
 *
 * ## Batch computation (ADR-0054)
 *
 * `findUsersToComputeWeeklyVolume()` and `findUsersToComputeStreak()`
 * provide the set of user IDs for each batch job.
 * `findByUserAndWeekStart()` supports idempotent weekly volume computation.
 * `findByUserLastNWeeks()` and `findLatestStreakByUserId()` serve read-only queries.
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

  // ── Batch computation (ADR-0054) ───────────────────────────────────────────

  /**
   * Finds the most recent WEEKLY_VOLUME Metric for a user in the given ISO week,
   * scoped to tenant.
   *
   * Used by `ComputeWeeklyVolumeMetric` to support idempotent weekly computation.
   *
   * @param userId         The user (client) whose metric to find.
   * @param weekStartDate  Monday YYYY-MM-DD of the target week.
   * @param professionalProfileId  Tenant scope (empty string = system-level query).
   */
  findByUserAndWeekStart(
    userId: string,
    weekStartDate: string,
    professionalProfileId: string,
  ): Promise<Metric | null>;

  /**
   * Returns the WEEKLY_VOLUME Metric records for a user in the most recent N weeks,
   * ordered by weekStart descending (most recent first).
   *
   * @param userId                 The user (client) whose history to return.
   * @param lastNWeeks             Number of ISO weeks to include (default: 4).
   * @param professionalProfileId  Tenant scope.
   */
  findByUserLastNWeeks(
    userId: string,
    lastNWeeks: number,
    professionalProfileId: string,
  ): Promise<Metric[]>;

  /**
   * Returns the most recently computed STREAK_DAYS Metric for a user,
   * scoped to tenant.
   *
   * Used by `ComputeStreakMetric` and `GetUserStreakStatus`.
   */
  findLatestStreakByUserId(userId: string, professionalProfileId: string): Promise<Metric | null>;

  /**
   * Returns the list of (userId, professionalProfileId) pairs for users that had
   * at least one confirmed Execution during the given ISO week [weekStartDate, weekEndDate].
   *
   * Used by `ComputeWeeklyVolumeMetricsJob` (ADR-0054 §3, §6).
   * SYSTEM-scope: spans tenants — called by ComputeWeeklyVolumeMetricsJob only.
   * Each pair carries the correct professionalProfileId so the use case can create
   * the Metric with the right tenant (ADR-0025 §3).
   *
   * @param weekStartDate  Monday YYYY-MM-DD.
   * @param weekEndDate    Sunday YYYY-MM-DD.
   */
  findUsersToComputeWeeklyVolume(
    weekStartDate: string,
    weekEndDate: string,
  ): Promise<UserTenantPair[]>;

  /**
   * Returns the list of (userId, professionalProfileId) pairs for users that had
   * at least one confirmed Execution in the last `windowDays` days.
   *
   * Used by `ComputeStreakDaysMetricsJob` (ADR-0054 §4, §6).
   * SYSTEM-scope: spans tenants — called by ComputeStreakDaysMetricsJob only.
   * Each pair carries the correct professionalProfileId so the use case can create
   * the Metric with the right tenant (ADR-0025 §3).
   *
   * @param since  Earliest date to include (YYYY-MM-DD).
   */
  findUsersToComputeStreak(since: string): Promise<UserTenantPair[]>;
}

/**
 * A (userId, professionalProfileId) pair returned by system-scope batch queries
 * that span tenants (ADR-0054 §6, ADR-0025 §3).
 *
 * The job passes each pair directly to the use case so that the Metric aggregate
 * is created with the correct clientId and professionalProfileId.
 */
export interface UserTenantPair {
  readonly userId: string;
  readonly professionalProfileId: string;
}
