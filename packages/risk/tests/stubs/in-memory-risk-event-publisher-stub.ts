import type { IRiskEventPublisher } from '../../application/ports/risk-event-publisher-port.js';
import type { RiskStatusChanged } from '@fittrack/identity';

export class InMemoryRiskEventPublisherStub implements IRiskEventPublisher {
  public publishedRiskStatusChanged: RiskStatusChanged[] = [];

  async publishRiskStatusChanged(event: RiskStatusChanged): Promise<void> {
    this.publishedRiskStatusChanged.push(event);
  }
}
