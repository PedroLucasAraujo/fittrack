import type { UpdateStreakTracker } from '../use-cases/update-streak-tracker.js';

/**
 * Payload contract for the ExecutionRecorded event as consumed by the
 * Gamification bounded context.
 *
 * ## Bounded context isolation (ADR-0005)
 *
 * This interface is defined locally. Gamification MUST NOT import from
 * `@fittrack/execution`. The infrastructure layer maps the actual
 * `ExecutionRecordedEvent` payload to this DTO before calling `handle()`.
 *
 * Only the fields relevant to streak tracking are included.
 */
export interface ExecutionRecordedForStreakPayload {
  /** UUIDv4 of the execution (for idempotency / audit trail). */
  executionId: string;
  /** UUIDv4 of the client whose streak to update. */
  clientId: string;
  /**
   * YYYY-MM-DD calendar date of the execution in the client's timezone.
   * Sourced from ExecutionRecordedEvent.payload.logicalDay (ADR-0010).
   */
  logicalDay: string;
  /** Execution status — handler MUST only pass CONFIRMED executions. */
  status: string;
}

/**
 * Event handler that bridges `ExecutionRecordedEvent` from the Execution
 * bounded context to `UpdateStreakTracker` in the Gamification context.
 *
 * ## Filter contract
 *
 * The infrastructure subscription layer MUST only invoke `handle()` for
 * executions with `status = 'CONFIRMED'`. Pending and cancelled executions
 * do not count toward a streak (anti-fraud, ADR-0066 §4).
 */
export class OnExecutionRecorded {
  constructor(private readonly updateStreakTracker: UpdateStreakTracker) {}

  async handle(payload: ExecutionRecordedForStreakPayload): Promise<void> {
    // Guard: skip non-CONFIRMED executions in case the filter is misconfigured
    if (payload.status !== 'CONFIRMED') return;

    const result = await this.updateStreakTracker.execute({
      userId: payload.clientId,
      activityDay: payload.logicalDay,
      executionId: payload.executionId,
    });

    if (result.isLeft()) {
      // Log the rejection without PII (ADR-0037). clientId deliberately omitted.
      // Infrastructure should route repeated failures to a dead-letter queue.
      // eslint-disable-next-line no-console
      console.warn('[OnExecutionRecorded] streak update rejected', {
        errorCode: (result.value as { code: string }).code,
        executionId: payload.executionId,
      });
    }
  }
}
