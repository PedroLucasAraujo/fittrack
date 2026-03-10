import { BaseDomainEvent } from '@fittrack/core';

export interface StreakIncrementedPayload {
  /** User whose streak was incremented. No PII — ID only (ADR-0037). */
  readonly userId: string;
  /** New current streak value after the increment. */
  readonly currentStreak: number;
  /** User's all-time personal best streak. */
  readonly longestStreak: number;
  /** YYYY-MM-DD UTC — the activity day that triggered the increment. */
  readonly activityDay: string;
}

/**
 * Emitted by `UpdateStreakTrackerUseCase` when a new activity day successfully
 * advances or restarts a user's streak.
 *
 * Consumers: push notifications ("Your streak is now X days!"), Achievements.
 *
 * eventVersion: 1
 */
export class StreakIncrementedEvent extends BaseDomainEvent {
  readonly eventType = 'StreakIncremented' as const;
  readonly aggregateType = 'StreakTracker' as const;

  constructor(
    readonly aggregateId: string,
    /** userId — gamification is user-scoped, not tenant-scoped. */
    readonly tenantId: string,
    readonly payload: Readonly<StreakIncrementedPayload>,
  ) {
    super(1);
  }
}
