import { BaseDomainEvent } from '@fittrack/core';

export interface AchievementUnlockedPayload {
  readonly progressId: string;
  readonly userId: string;
  readonly achievementDefinitionId: string;
  readonly achievementCode: string;
  readonly achievementName: string;
  readonly achievementCategory: string;
  readonly achievementTier: string;
  /** ISO 8601 UTC timestamp when the achievement was unlocked. */
  readonly unlockedAtUtc: string;
}

/**
 * Emitted when a user unlocks an achievement (ADR-0009 §4).
 *
 * Downstream consumers:
 * - Notifications: send email/push celebrating the achievement (ADR-0048).
 * - Analytics: track unlock rates per achievement.
 *
 * Must not contain PII — reference IDs and category labels only (ADR-0037).
 */
export class AchievementUnlockedEvent extends BaseDomainEvent {
  readonly eventType = 'AchievementUnlocked' as const;
  readonly aggregateType = 'UserAchievementProgress' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<AchievementUnlockedPayload>,
  ) {
    super(1);
  }
}
