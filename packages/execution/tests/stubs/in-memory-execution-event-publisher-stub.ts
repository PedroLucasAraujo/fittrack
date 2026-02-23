import type { IExecutionEventPublisher } from '../../application/ports/execution-event-publisher-port.js';
import type { ExecutionRecordedEvent } from '../../domain/events/execution-recorded-event.js';
import type { ExecutionCorrectionRecordedEvent } from '../../domain/events/execution-correction-recorded-event.js';

/**
 * In-memory stub for IExecutionEventPublisher.
 *
 * Captures all published events in-memory for test assertions.
 * Does not involve any external infrastructure.
 */
export class InMemoryExecutionEventPublisherStub implements IExecutionEventPublisher {
  /** All ExecutionRecorded events published during the test. */
  public publishedExecutionRecorded: ExecutionRecordedEvent[] = [];

  /** All ExecutionCorrectionRecorded events published during the test. */
  public publishedCorrectionRecorded: ExecutionCorrectionRecordedEvent[] = [];

  async publishExecutionRecorded(event: ExecutionRecordedEvent): Promise<void> {
    this.publishedExecutionRecorded.push(event);
  }

  async publishExecutionCorrectionRecorded(event: ExecutionCorrectionRecordedEvent): Promise<void> {
    this.publishedCorrectionRecorded.push(event);
  }
}
