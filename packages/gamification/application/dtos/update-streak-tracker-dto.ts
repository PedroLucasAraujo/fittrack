export interface UpdateStreakTrackerInputDTO {
  /** UUIDv4 of the user whose streak to update. */
  userId: string;
  /**
   * YYYY-MM-DD UTC calendar date of the activity.
   * Sourced from the `logicalDay` field of `ExecutionRecordedEvent`.
   * Must not be in the future and must be within the 2-day retroactive window.
   */
  activityDay: string;
  /**
   * ID of the source Execution for deduplication and audit trail.
   * Not used by domain logic — stored for analytics/anti-fraud correlation.
   */
  executionId: string;
}

export interface UpdateStreakTrackerOutputDTO {
  /** Current streak after the activity was recorded. */
  currentStreak: number;
  /** All-time personal best streak. */
  longestStreak: number;
  /** True when the same activityDay was already recorded (idempotent call). */
  wasNoop: boolean;
}
