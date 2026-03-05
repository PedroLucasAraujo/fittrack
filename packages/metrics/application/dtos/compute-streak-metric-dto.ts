export interface ComputeStreakMetricInputDTO {
  /** UUID of the user (client) whose streak to compute. */
  userId: string;
  /** Tenant scope. */
  professionalProfileId: string;
  /**
   * ISO 8601 date to treat as "today" for streak computation (default: actual today).
   * Useful for deterministic testing and backfill scenarios.
   */
  computeDate?: string;
}

export interface ComputeStreakMetricOutputDTO {
  /** ID of the persisted STREAK_DAYS Metric aggregate. */
  metricId: string;
  /** Number of consecutive days with activity up to D-1. */
  currentStreak: number;
  /** Longest streak in the 90-day window. */
  longestStreak: number;
  /** ACTIVE | BROKEN | NEVER_STARTED */
  streakStatus: string;
}
