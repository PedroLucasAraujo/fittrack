export interface UserEngagementDashboardDTO {
  userId: string;
  overallScore: number;
  engagementLevel: string;
  trend: string;
  trendPercentage: number | null;
  workoutScore: number;
  habitScore: number;
  goalProgressScore: number;
  streakScore: number;
  workoutsCompleted: number;
  nutritionLogsCreated: number;
  bookingsAttended: number;
  currentStreak: number;
  activeGoalsCount: number;
  goalsOnTrackCount: number;
  windowStartDate: string;
  windowEndDate: string;
  isAtRisk: boolean;
  daysInactive: number | null;
  lastActivityDate: string | null;
  riskDetectedAt: string | null;
  calculatedAt: string;
  updatedAt: string;
}

export interface UpsertUserEngagementDashboardInput {
  userId: string;
  overallScore: number;
  engagementLevel: string;
  trend: string;
  trendPercentage: number | null;
  workoutScore: number;
  habitScore: number;
  goalProgressScore: number;
  streakScore: number;
  workoutsCompleted: number;
  nutritionLogsCreated: number;
  bookingsAttended: number;
  currentStreak: number;
  activeGoalsCount: number;
  goalsOnTrackCount: number;
  windowStartDate: string;
  windowEndDate: string;
  isAtRisk: boolean;
  calculatedAtUtc: string;
}

export interface MarkAtRiskInput {
  userId: string;
  daysInactive: number;
  lastActivityDate: string | null;
  riskDetectedAtUtc: string;
}

/**
 * Read model interface for user engagement dashboard queries (CQRS read side).
 *
 * Implementations query the denormalized `user_engagement_dashboard` table
 * for fast dashboard reads (< 100ms target).
 */
export interface IUserEngagementDashboardReadModel {
  /** Returns the engagement dashboard row for a user. Null if not yet calculated. */
  findByUserId(userId: string): Promise<UserEngagementDashboardDTO | null>;

  /** Upsert the full dashboard row for a user (called by UserEngagementProjection). */
  upsert(input: UpsertUserEngagementDashboardInput): Promise<void>;

  /** Update at-risk fields for a user (called by UserEngagementProjection). */
  markAtRisk(input: MarkAtRiskInput): Promise<void>;
}
