import { BaseDomainEvent } from '@fittrack/core';

export interface FreezeTokenUsedPayload {
  readonly userId: string;
  /** Streak value preserved by the freeze. */
  readonly currentStreak: number;
  /** Remaining freeze tokens after spending one. */
  readonly freezeTokenCount: number;
}

/**
 * Emitted by `UseStreakFreezeTokenUseCase` after a user manually spends a
 * freeze token to preserve their at-risk streak.
 *
 * The system NEVER spends freeze tokens automatically (ADR-0066 anti-frustration rule).
 *
 * Consumers: push notifications ("1 freeze token used — streak preserved!"), analytics.
 *
 * eventVersion: 1
 */
export class FreezeTokenUsedEvent extends BaseDomainEvent {
  readonly eventType = 'FreezeTokenUsed' as const;
  readonly aggregateType = 'StreakTracker' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<FreezeTokenUsedPayload>,
  ) {
    super(1);
  }
}
