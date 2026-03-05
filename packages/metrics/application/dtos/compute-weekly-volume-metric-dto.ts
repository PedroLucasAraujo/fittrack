export interface ComputeWeeklyVolumeMetricInputDTO {
  /** UUID of the user (client) whose metric to compute. */
  userId: string;
  /** Tenant scope. */
  professionalProfileId: string;
  /** ISO 8601 date of the Monday starting the ISO week (YYYY-MM-DD). */
  weekStartDate: string;
}

export interface ComputeWeeklyVolumeMetricOutputDTO {
  /** ID of the persisted WEEKLY_VOLUME Metric aggregate. */
  metricId: string;
  /** Number of confirmed Executions in the week. */
  workoutCount: number;
  /** Total training volume (sum of all set volumes). */
  totalVolume: number;
}
