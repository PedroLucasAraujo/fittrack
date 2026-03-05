import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the StreakBroken domain event.
 * Emitted when currentStreak transitions from >0 to 0.
 * Must not contain PII (ADR-0037).
 */
export interface StreakBrokenPayload {
  readonly clientId: string;
  readonly professionalProfileId: string;
  /** Previous streak length (before it broke). */
  readonly previousStreak: number;
  /** Last active logicalDay (YYYY-MM-DD). */
  readonly lastActivityDate: string;
}

/**
 * Emitted by `ComputeStreakMetric` when a previously active streak is broken
 * (currentStreak was >0, is now 0). eventVersion: 1
 */
export class StreakBrokenEvent extends BaseDomainEvent {
  readonly eventType = 'StreakBroken' as const;
  readonly aggregateType = 'Metric' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<StreakBrokenPayload>,
  ) {
    super(1);
  }
}
