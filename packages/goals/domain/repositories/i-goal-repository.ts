import type { Goal } from '../aggregates/goal.js';
import type { GoalMetricValue } from '../value-objects/goal-metric.js';

/**
 * Repository interface for the Goal aggregate root (ADR-0047).
 *
 * Interface lives in the domain layer; implementation lives in infrastructure.
 * All queries include professionalProfileId or clientId for tenant isolation (ADR-0025).
 */
export interface IGoalRepository {
  save(goal: Goal): Promise<void>;

  findById(id: string): Promise<Goal | null>;

  /**
   * Tenant-scoped lookup by ID (ADR-0025).
   * Preferred over `findById` in use cases that require professional ownership.
   */
  findByIdAndProfessionalProfileId(id: string, professionalProfileId: string): Promise<Goal | null>;

  /** All goals for a specific client (tenant-scoped). */
  findByClient(clientId: string): Promise<Goal[]>;

  /** Active goals only (approved, started, not completed or abandoned). */
  findActiveByClient(clientId: string): Promise<Goal[]>;

  /** All goals supervised by a professional (across their clients). */
  findByProfessional(professionalProfileId: string): Promise<Goal[]>;

  /** Draft goals (approvedAtUtc === null) awaiting professional approval. */
  findPendingApproval(professionalProfileId: string): Promise<Goal[]>;

  /**
   * Active goals for a client filtered by metric type.
   * Used by event handlers to update only goals tracking the incoming metric.
   */
  findActiveGoalsByMetric(clientId: string, metricType: GoalMetricValue): Promise<Goal[]>;
}
