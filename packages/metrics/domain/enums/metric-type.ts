/**
 * Recognized metric types for the Metrics bounded context (ADR-0014, ADR-0043).
 *
 * ## Constraints (ADR-0028 §4 — Platform Non-Interpretation Rule)
 *
 * The platform does not automatically interpret physiological data. All metric
 * types defined here are **behavioral** — they describe execution patterns,
 * not clinical or physiological values. Physiological metric computation
 * (e.g., BODY_FAT_ESTIMATE) is explicitly prohibited without professional
 * configuration and is out of scope for MVP.
 *
 * ## Metric type definitions
 *
 * - `EXECUTION_COUNT`: The fact that one confirmed Execution occurred on a
 *   given logicalDay. Always value=1 per record; read models aggregate for totals.
 *   Source: one Execution (1:1 event-driven derivation from ExecutionRecorded).
 *
 * - `WEEKLY_VOLUME`: Total number of confirmed Executions in a given ISO week.
 *   Source: N Executions in the same ISO week (aggregated — post-MVP batch derivation).
 *
 * - `STREAK_DAYS`: Number of consecutive logicalDays with at least one confirmed
 *   Execution, ending on the most recent active day.
 *   Source: N Executions across contiguous logicalDays (post-MVP batch derivation).
 */
export const MetricType = {
  /** One confirmed Execution occurred on this logicalDay. value=1, unit='session'. */
  EXECUTION_COUNT: 'EXECUTION_COUNT',
  /** Total confirmed Executions in an ISO week. unit='session'. Post-MVP batch. */
  WEEKLY_VOLUME: 'WEEKLY_VOLUME',
  /** Consecutive active logicalDays ending on this anchor day. unit='day'. Post-MVP batch. */
  STREAK_DAYS: 'STREAK_DAYS',
} as const;

export type MetricType = (typeof MetricType)[keyof typeof MetricType];
