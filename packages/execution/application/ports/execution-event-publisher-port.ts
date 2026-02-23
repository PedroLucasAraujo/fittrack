import type { ExecutionRecordedEvent } from '../../domain/events/execution-recorded-event.js';
import type { ExecutionCorrectionRecordedEvent } from '../../domain/events/execution-correction-recorded-event.js';

/**
 * Port for publishing domain events from the Execution bounded context
 * (ADR-0009 §4).
 *
 * The Application layer (UseCase) is the sole dispatcher of domain events.
 * Events are published **post-commit** — after the producing transaction
 * commits successfully (ADR-0009 §1, ADR-0003 §4).
 *
 * Infrastructure implementations may publish to an in-process dispatcher,
 * an outbox table, or an external message bus (ADR-0009, ADR-0016).
 */
export interface IExecutionEventPublisher {
  /**
   * Publishes `ExecutionRecorded` after `CreateExecution` successfully
   * persists and confirms a new Execution (ADR-0009 §7).
   *
   * Downstream: Metrics derivation (ADR-0043), analytics, webhooks.
   */
  publishExecutionRecorded(event: ExecutionRecordedEvent): Promise<void>;

  /**
   * Publishes `ExecutionCorrectionRecorded` after `RecordExecutionCorrection`
   * successfully appends a correction (ADR-0005 §4, ADR-0009 §7).
   *
   * Downstream: Metric recomputation (ADR-0043).
   */
  publishExecutionCorrectionRecorded(event: ExecutionCorrectionRecordedEvent): Promise<void>;
}
