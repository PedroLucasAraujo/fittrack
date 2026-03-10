import { BaseDomainEvent } from '@fittrack/core';

export interface FreezeTokenEarnedPayload {
  readonly userId: string;
  /** Current streak at the time the token was earned (multiple of 7). */
  readonly currentStreak: number;
  /** Total freeze tokens available after earning this one. */
  readonly freezeTokenCount: number;
}

/**
 * Emitted by `UpdateStreakTrackerUseCase` when a streak milestone (multiple of 7)
 * awards a new freeze token and the user is below the cap (2 tokens).
 *
 * Consumers: push notifications ("You earned a freeze token!"), Achievements.
 *
 * eventVersion: 1
 */
export class FreezeTokenEarnedEvent extends BaseDomainEvent {
  readonly eventType = 'FreezeTokenEarned' as const;
  readonly aggregateType = 'StreakTracker' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<FreezeTokenEarnedPayload>,
  ) {
    super(1);
  }
}
