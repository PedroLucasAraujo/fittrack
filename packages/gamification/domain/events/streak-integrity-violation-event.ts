import { BaseDomainEvent } from '@fittrack/core';

export interface StreakIntegrityViolationPayload {
  readonly userId: string;
  /** The streak value stored in StreakTracker. */
  readonly trackerStreak: number;
  /** The streak recomputed from execution history. */
  readonly expectedStreak: number;
  /** Absolute difference between tracker and expected values. */
  readonly discrepancy: number;
}

/**
 * Emitted by `CheckStreakIntegrityUseCase` when the persisted streak differs
 * from the value recomputed from execution history.
 *
 * This is an **audit event only** — it does not modify the StreakTracker.
 * The operations team reviews violations to detect manipulation, event
 * processing bugs, or duplicate event exploits.
 *
 * eventVersion: 1
 */
export class StreakIntegrityViolationEvent extends BaseDomainEvent {
  readonly eventType = 'StreakIntegrityViolation' as const;
  readonly aggregateType = 'StreakTracker' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<StreakIntegrityViolationPayload>,
  ) {
    super(1);
  }
}
