import type {
  EngagementScoreCalculatedEvent,
  UserDisengagedEvent,
} from '@fittrack/engagement';
import type { IUserEngagementDashboardReadModel } from '../read-models/IUserEngagementDashboardReadModel.js';

/**
 * Projection handler for the user_engagement_dashboard read model.
 *
 * Handles:
 * - EngagementScoreCalculatedEvent → upsert full dashboard row
 * - UserDisengagedEvent → update is_at_risk, days_inactive, risk_detected_at
 */
export class UserEngagementProjection {
  constructor(
    private readonly readModel: IUserEngagementDashboardReadModel,
  ) {}

  async onEngagementScoreCalculated(event: EngagementScoreCalculatedEvent): Promise<void> {
    const p = event.payload;
    await this.readModel.upsert({
      userId: p.userId,
      overallScore: p.overallScore,
      engagementLevel: p.engagementLevel,
      trend: p.trend,
      trendPercentage: p.trendPercentage ?? null,
      workoutScore: p.workoutScore,
      habitScore: p.habitScore,
      goalProgressScore: p.goalProgressScore,
      streakScore: p.streakScore,
      workoutsCompleted: p.workoutsCompleted,
      nutritionLogsCreated: p.nutritionLogsCreated,
      bookingsAttended: p.bookingsAttended,
      currentStreak: p.currentStreak,
      activeGoalsCount: p.activeGoalsCount,
      goalsOnTrackCount: p.goalsOnTrackCount,
      windowStartDate: p.windowStartDate,
      windowEndDate: p.windowEndDate,
      isAtRisk: p.isAtRisk,
      calculatedAtUtc: p.calculatedAtUtc,
    });
  }

  async onUserDisengaged(event: UserDisengagedEvent): Promise<void> {
    const p = event.payload;
    await this.readModel.markAtRisk({
      userId: p.userId,
      daysInactive: p.daysInactive,
      lastActivityDate: p.lastActivityDate,
      riskDetectedAtUtc: p.detectedAtUtc,
    });
  }
}
