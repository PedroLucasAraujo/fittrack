import type { IMetricsEventPublisher } from '../../application/ports/metrics-event-publisher-port.js';
import type { MetricComputedEvent } from '../../domain/events/metric-computed-event.js';

export class InMemoryMetricsEventPublisherStub implements IMetricsEventPublisher {
  public publishedMetricComputed: MetricComputedEvent[] = [];

  async publishMetricComputed(event: MetricComputedEvent): Promise<void> {
    this.publishedMetricComputed.push(event);
  }
}
