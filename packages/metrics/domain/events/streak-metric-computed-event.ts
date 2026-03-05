import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the StreakMetricComputed domain event (ADR-0009 §7).
 * Must not contain PII (ADR-0037).
 */
export interface StreakMetricComputedPayload {
  /** ID of the newly created STREAK_DAYS Metric aggregate. */
  readonly metricId: string;
  /** Client to whom this metric belongs. */
  readonly clientId: string;
  /** Tenant identifier. */
  readonly professionalProfileId: string;
  /** Current active streak length in days. */
  readonly currentStreak: number;
  /** Longest streak observed in the 90-day window. */
  readonly longestStreak: number;
  /** Status of the streak: ACTIVE | BROKEN | NEVER_STARTED */
  readonly streakStatus: string;
  /** Derivation rule version applied. */
  readonly derivationRuleVersion: string;
}

/**
 * Emitted by `ComputeStreakMetric` after a STREAK_DAYS Metric record is
 * persisted (ADR-0009 §4).
 *
 * eventVersion: 1
 */
export class StreakMetricComputedEvent extends BaseDomainEvent {
  readonly eventType = 'StreakMetricComputed' as const;
  readonly aggregateType = 'Metric' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<StreakMetricComputedPayload>,
  ) {
    super(1);
  }
}
