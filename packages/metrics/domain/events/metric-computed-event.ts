import { BaseDomainEvent } from '@fittrack/core';

/**
 * Payload for the MetricComputed domain event (ADR-0009 §7).
 *
 * Must not contain PII or raw health metric values — reference IDs and
 * metadata only (ADR-0037). The `value` and `unit` fields from the Metric
 * aggregate are intentionally excluded because they may contain aggregated
 * health-adjacent data; downstream consumers needing the value query
 * the Metrics read model directly.
 *
 * Registered in the official domain event catalog (ADR-0009 §7, ADR-0047).
 */
export interface MetricComputedPayload {
  /** ID of the Metric aggregate. */
  readonly metricId: string;
  /** Client to whom this metric belongs (cross-aggregate ref, ADR-0047). */
  readonly clientId: string;
  /** Tenant identifier — professionalProfileId (ADR-0025). */
  readonly professionalProfileId: string;
  /** Metric type key (e.g., 'EXECUTION_COUNT'). */
  readonly metricType: string;
  /** YYYY-MM-DD anchor date for this metric (ADR-0010). */
  readonly logicalDay: string;
  /** Derivation rule version used to produce this Metric record (ADR-0043). */
  readonly derivationRuleVersion: string;
}

/**
 * Emitted by `DeriveExecutionMetrics` after a Metric record is persisted
 * (ADR-0009 §4, ADR-0009 §7).
 *
 * Downstream consumers (Analytics, Dashboard read models) use this event
 * to invalidate or update their projections without coupling to the Metrics
 * aggregate internals.
 *
 * eventVersion: 1
 */
export class MetricComputedEvent extends BaseDomainEvent {
  readonly eventType = 'MetricComputed' as const;
  readonly aggregateType = 'Metric' as const;

  constructor(
    readonly aggregateId: string,
    /** professionalProfileId — tenant scope (ADR-0025). */
    readonly tenantId: string,
    readonly payload: Readonly<MetricComputedPayload>,
  ) {
    super(1);
  }
}
