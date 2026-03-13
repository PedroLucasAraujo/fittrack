import { BaseDomainEvent } from '@fittrack/core';

export interface EngagementScoreCalculatedPayload {
  readonly userId: string;
  readonly overallScore: number;
  readonly engagementLevel: string;
  readonly trend: string;
  readonly trendPercentage: number | null;
  readonly workoutScore: number;
  readonly habitScore: number;
  readonly goalProgressScore: number;
  readonly streakScore: number;
  readonly workoutsCompleted: number;
  readonly nutritionLogsCreated: number;
  readonly bookingsAttended: number;
  readonly currentStreak: number;
  readonly activeGoalsCount: number;
  readonly goalsOnTrackCount: number;
  readonly windowStartDate: string;
  readonly windowEndDate: string;
  readonly calculatedAtUtc: string;
  readonly isAtRisk: boolean;
}

/**
 * Emitted when the engagement score is calculated or recalculated for a user.
 *
 * Consumers:
 * - Analytics.UserEngagementProjection → upsert user_engagement_dashboard
 * - Analytics.PlatformMetricsProjection → aggregate counters per level
 */
export class EngagementScoreCalculatedEvent extends BaseDomainEvent {
  readonly eventType = 'EngagementScoreCalculated';
  readonly aggregateType = 'UserEngagement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<EngagementScoreCalculatedPayload>,
  ) {
    super(1);
  }
}
