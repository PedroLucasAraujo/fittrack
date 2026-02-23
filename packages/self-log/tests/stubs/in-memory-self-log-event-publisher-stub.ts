import type { ISelfLogEventPublisher } from '../../application/ports/self-log-event-publisher-port.js';
import type { SelfLogRecordedEvent } from '../../domain/events/self-log-recorded-event.js';

/**
 * In-memory stub for ISelfLogEventPublisher.
 *
 * Captures all published events in-memory for test assertions.
 * Does not involve any external infrastructure.
 */
export class InMemorySelfLogEventPublisherStub implements ISelfLogEventPublisher {
  public publishedSelfLogRecorded: SelfLogRecordedEvent[] = [];

  async publishSelfLogRecorded(event: SelfLogRecordedEvent): Promise<void> {
    this.publishedSelfLogRecorded.push(event);
  }
}
