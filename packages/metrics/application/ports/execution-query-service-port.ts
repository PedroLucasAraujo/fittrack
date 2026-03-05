/**
 * Read-only data returned by the Execution bounded context for metric computation.
 * This is a DTO — it carries no domain invariants of its own.
 * All values are primitive to avoid cross-context aggregate coupling (ADR-0047).
 */
export interface ExecutionSummary {
  /** Count of distinct confirmed Execution records in the requested window. */
  readonly workoutCount: number;
  /** Sum of all set volumes (weight × reps) across all executions in the window. */
  readonly totalVolume: number;
  /** Total number of individual sets. */
  readonly totalSets: number;
  /** Count of distinct exercises. */
  readonly uniqueExercises: number;
  /** IDs of source executions — for lineage in Metric.sourceExecutionIds. */
  readonly sourceExecutionIds: string[];
}

/**
 * Anti-Corruption Layer port: read-only queries into the Execution bounded context
 * (ADR-0005, ADR-0043, ADR-0047).
 *
 * The Metrics context MUST NOT import Execution domain aggregates directly.
 * All data crossing the boundary flows through this interface as plain DTOs.
 *
 * Implementations live in infrastructure (or a shared integration layer) and are
 * registered at the composition root.
 */
export interface IExecutionQueryService {
  /**
   * Returns an aggregated summary of confirmed Executions for a user
   * within an ISO week window [weekStartDate, weekEndDate] inclusive (UTC dates).
   *
   * Returns an empty summary (workoutCount=0, totalVolume=0, …) if no executions exist.
   *
   * @param userId         The user whose executions to aggregate.
   * @param weekStartDate  Monday 00:00:00 UTC of the target week (YYYY-MM-DD).
   * @param weekEndDate    Sunday 23:59:59 UTC of the target week (YYYY-MM-DD).
   */
  getWeeklyExecutionSummary(
    userId: string,
    weekStartDate: string,
    weekEndDate: string,
  ): Promise<ExecutionSummary>;

  /**
   * Returns all unique logicalDays on which the user had at least one confirmed
   * Execution, within the given date window [startDate, endDate] inclusive (YYYY-MM-DD).
   *
   * Returned dates are normalised to YYYY-MM-DD strings, deduplicated, and ordered
   * chronologically ascending.
   *
   * @param userId     The user whose activity to query.
   * @param startDate  Window start (inclusive), YYYY-MM-DD.
   * @param endDate    Window end (inclusive), YYYY-MM-DD.
   */
  getActivityDatesInWindow(userId: string, startDate: string, endDate: string): Promise<string[]>;
}
