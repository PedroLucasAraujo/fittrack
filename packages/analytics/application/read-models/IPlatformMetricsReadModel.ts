export interface PlatformMetricsDTO {
  metricDate: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageEngagementScore: number | null;
  veryHighCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  veryLowCount: number;
  atRiskCount: number;
  calculatedAt: string;
}

export interface IncrementPlatformCountersInput {
  metricDate: string;
  engagementLevel: string;
  isAtRisk: boolean;
  overallScore: number;
  calculatedAtUtc: string;
}

/**
 * Read model interface for platform-level engagement metrics (CQRS read side).
 *
 * Queries the denormalized `platform_metrics` table.
 * Admin-only data — not tenant-scoped.
 */
export interface IPlatformMetricsReadModel {
  /** Returns metrics for a specific date. Null if no data for that date. */
  findByDate(date: string): Promise<PlatformMetricsDTO | null>;

  /** Returns metrics for a date range, ordered by date desc. */
  findDateRange(startDate: string, endDate: string): Promise<PlatformMetricsDTO[]>;

  /** Increment counters for the given date (called by PlatformMetricsProjection). */
  incrementCounters(input: IncrementPlatformCountersInput): Promise<void>;
}
