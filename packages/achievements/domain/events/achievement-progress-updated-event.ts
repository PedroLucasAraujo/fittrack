import { BaseDomainEvent } from '@fittrack/core';

export interface AchievementProgressUpdatedPayload {
  readonly progressId: string;
  readonly userId: string;
  readonly achievementDefinitionId: string;
  readonly achievementCode: string;
  readonly oldValue: number;
  readonly newValue: number;
  readonly progressPercentage: number;
}

/**
 * Emitted when a user's achievement progress is updated (ADR-0009 §4).
 * Optional: useful for real-time progress notifications.
 */
export class AchievementProgressUpdatedEvent extends BaseDomainEvent {
  readonly eventType = 'AchievementProgressUpdated' as const;
  readonly aggregateType = 'UserAchievementProgress' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<AchievementProgressUpdatedPayload>,
  ) {
    super(1);
  }
}
