import type { GoalMetricValue } from '../../domain/value-objects/goal-metric.js';

/**
 * Anti-corruption layer interface for fetching the latest measured value
 * of a metric from upstream contexts (Assessments, Metrics, Self-Log).
 *
 * Implemented in the infrastructure layer; injected into event handlers.
 * Goals never accesses Execution directly — data flows via Metrics (ADR-0068 §2).
 *
 * ## Intended usage
 *
 * This port is used when the Goals context needs to query the current value of a
 * metric on demand — for example, to populate the initial `currentValue` when a goal
 * transitions from DRAFT to ACTIVE (approve + start), or to refresh baseline on
 * re-activation scenarios. Automatic progress updates triggered by events
 * (AssessmentCompleted, MetricComputed, StreakIncremented) bypass this interface
 * and call `UpdateGoalProgress` directly via the event handler.
 */
export interface IGoalProgressQueryService {
  /**
   * Latest assessment value for assessment-sourced metrics (WEIGHT, BODY_FAT).
   * Returns null when no assessment exists for this client.
   */
  getLatestAssessmentValue(clientId: string, metric: GoalMetricValue): Promise<number | null>;

  /**
   * Latest computed metric value (WEEKLY_VOLUME, STREAK_DAYS).
   * Returns null when no metric record exists.
   */
  getLatestMetricValue(clientId: string, metric: GoalMetricValue): Promise<number | null>;

  /**
   * Latest self-log value (DAILY_PROTEIN, DAILY_WATER).
   * Returns null when no recent self-log exists.
   */
  getLatestSelfLogValue(clientId: string, metric: GoalMetricValue): Promise<number | null>;
}
