import type { ISelfLogEventPublisher } from '../../application/ports/self-log-event-publisher-port.js';
import type { SelfLogRecordedEvent } from '../../domain/events/self-log-recorded-event.js';
import type { SelfLogAnonymizedEvent } from '../../domain/events/self-log-anonymized-event.js';
import type { SelfLogCorrectionProjectedEvent } from '../../domain/events/self-log-correction-projected-event.js';

/**
 * In-memory stub for ISelfLogEventPublisher.
 *
 * Captures all published events in-memory for test assertions.
 * Does not involve any external infrastructure.
 */
export class InMemorySelfLogEventPublisherStub implements ISelfLogEventPublisher {
  public publishedSelfLogRecorded: SelfLogRecordedEvent[] = [];
  public publishedSelfLogAnonymized: SelfLogAnonymizedEvent[] = [];
  public publishedSelfLogCorrectionProjected: SelfLogCorrectionProjectedEvent[] = [];

  async publishSelfLogRecorded(event: SelfLogRecordedEvent): Promise<void> {
    this.publishedSelfLogRecorded.push(event);
  }

  async publishSelfLogAnonymized(event: SelfLogAnonymizedEvent): Promise<void> {
    this.publishedSelfLogAnonymized.push(event);
  }

  async publishSelfLogCorrectionProjected(event: SelfLogCorrectionProjectedEvent): Promise<void> {
    this.publishedSelfLogCorrectionProjected.push(event);
  }
}
