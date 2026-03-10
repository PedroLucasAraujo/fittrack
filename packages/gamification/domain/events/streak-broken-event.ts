import { BaseDomainEvent } from '@fittrack/core';

export interface StreakBrokenPayload {
  readonly userId: string;
  /** The streak value just before it was broken. */
  readonly previousStreak: number;
  /** YYYY-MM-DD UTC — the last day the streak was active. */
  readonly lastActivityDay: string | null;
}

/**
 * Emitted when a user's streak is reset to 0.
 *
 * Sources:
 * - `CheckStreakIntegrityUseCase` (explicit break for inactive trackers)
 * - `UpdateStreakTrackerUseCase` (implicit break when a gap is detected on new activity)
 *
 * Consumers: push notifications ("Your X-day streak was broken"), analytics.
 *
 * eventVersion: 1
 */
export class StreakBrokenEvent extends BaseDomainEvent {
  readonly eventType = 'StreakBroken' as const;
  readonly aggregateType = 'StreakTracker' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<StreakBrokenPayload>,
  ) {
    super(1);
  }
}
