import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the NewLongestStreak domain event.
 * Emitted when the newly computed longestStreak exceeds the previous record.
 * Must not contain PII (ADR-0037).
 */
export interface NewLongestStreakPayload {
  readonly clientId: string;
  readonly professionalProfileId: string;
  /** New all-time longest streak in the 90-day window. */
  readonly longestStreak: number;
  /** Previous longest streak (before the record was broken). */
  readonly previousLongestStreak: number;
}

/**
 * Emitted by `ComputeStreakMetric` when a new personal streak record is set.
 * eventVersion: 1
 */
export class NewLongestStreakEvent extends BaseDomainEvent {
  readonly eventType = 'NewLongestStreak' as const;
  readonly aggregateType = 'Metric' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<NewLongestStreakPayload>,
  ) {
    super(1);
  }
}
