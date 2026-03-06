/**
 * Response DTO for a single achievement with user progress information.
 * Returned by ListUserAchievements and GetAchievementProgress use cases.
 */
export interface UserAchievementProgressDTO {
  /** ID of the UserAchievementProgress record. Null if no progress record exists yet. */
  progressId: string | null;
  definitionId: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  tierColor: string;
  iconUrl: string;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  isUnlocked: boolean;
  unlockedAtUtc: string | null;
  metricType: string;
  operator: string;
  timeWindow: string;
}
