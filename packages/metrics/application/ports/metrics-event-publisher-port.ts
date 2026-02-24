import type { MetricComputedEvent } from '../../domain/events/metric-computed-event.js';

/**
 * Port for publishing Metrics domain events post-commit (ADR-0009 §4).
 *
 * The infrastructure adapter (outbox, in-process dispatcher, etc.) is
 * registered at the composition root. The domain and application layers
 * depend only on this interface.
 */
export interface IMetricsEventPublisher {
  /**
   * Publishes a `MetricComputed` event after the Metric aggregate has been
   * persisted in the same transaction (ADR-0009 §4, ADR-0009 §7).
   */
  publishMetricComputed(event: MetricComputedEvent): Promise<void>;
}
