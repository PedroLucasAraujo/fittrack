import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ExecutionCorrectionRecordedEvent } from '@fittrack/execution';

/**
 * Acknowledges an `ExecutionCorrectionRecorded` event in the Metrics context.
 *
 * ## Why this use case exists
 *
 * When an Execution is corrected, its derived Metric records may no longer
 * reflect accurate data. This use case subscribes to `ExecutionCorrectionRecorded`
 * to serve as the integration point for future correction handling.
 *
 * ## MVP behaviour: log-only, no automatic recomputation
 *
 * ADR-0043 §3 explicitly states: retroactive reprocessing of metrics requires
 * **an explicit, administratively triggered batch job**. Automatic recomputation
 * triggered by this event is prohibited.
 *
 * In MVP, this handler:
 * 1. Validates the event is well-formed (has the required IDs).
 * 2. Returns `right(undefined)` — no metric records are created or modified.
 *
 * The infrastructure layer (adapter) is responsible for writing an operational
 * log or audit entry. The domain use case has no side effects beyond validation.
 *
 * ## Post-MVP path
 *
 * A future batch job can query this use case's event log to identify which
 * Metric records need recomputation for corrections applied after a given date.
 * That job would create new Metric records with the new derivationRuleVersion
 * (ADR-0043 §3, §4) without modifying existing records.
 *
 * ## Consistency boundary (ADR-0003)
 *
 * This handler executes in its own transaction scope. The Execution correction
 * transaction has already committed before this handler is invoked (ADR-0016).
 */
export class HandleExecutionCorrection {
  async execute(event: ExecutionCorrectionRecordedEvent): Promise<DomainResult<void>> {
    // No metric records are created or modified.
    // Retroactive recomputation requires an explicit admin batch job (ADR-0043 §3).
    // The infrastructure adapter logs the correction ID and original execution ID.
    void event; // event is received for future extensibility; not processed in MVP
    return right(undefined);
  }
}
