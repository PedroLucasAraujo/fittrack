import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the WeeklyVolumeMetricComputed domain event (ADR-0009 §7).
 *
 * Must not contain health values or PII (ADR-0037).
 * `totalVolume` is intentionally excluded — downstream consumers query the
 * Metrics read model directly for numerical values.
 */
export interface WeeklyVolumeMetricComputedPayload {
  /** ID of the newly created WEEKLY_VOLUME Metric aggregate. */
  readonly metricId: string;
  /** Client to whom this metric belongs. */
  readonly clientId: string;
  /** Tenant identifier. */
  readonly professionalProfileId: string;
  /** Monday YYYY-MM-DD of the computed week. */
  readonly weekStartDate: string;
  /** Sunday YYYY-MM-DD of the computed week. */
  readonly weekEndDate: string;
  /** Number of distinct confirmed Executions in the week. */
  readonly workoutCount: number;
  /** Derivation rule version applied. */
  readonly derivationRuleVersion: string;
}

/**
 * Emitted by `ComputeWeeklyVolumeMetric` after a WEEKLY_VOLUME Metric
 * record is persisted (ADR-0009 §4).
 *
 * eventVersion: 1
 */
export class WeeklyVolumeMetricComputedEvent extends BaseDomainEvent {
  readonly eventType = 'WeeklyVolumeMetricComputed' as const;
  readonly aggregateType = 'Metric' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<WeeklyVolumeMetricComputedPayload>,
  ) {
    super(1);
  }
}
