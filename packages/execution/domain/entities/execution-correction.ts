import { BaseEntity, generateId } from '@fittrack/core';
import type { UTCDateTime } from '@fittrack/core';

export interface ExecutionCorrectionProps {
  /** Non-empty human-readable explanation for the correction. */
  reason: string;

  /** UTC instant when the correction was recorded. System-assigned. */
  correctedAtUtc: UTCDateTime;

  /** UUID of the professional (or admin) who recorded the correction. */
  correctedBy: string;
}

/**
 * ExecutionCorrection — subordinate entity of the Execution aggregate (ADR-0047 §4).
 *
 * Represents a compensating record appended to an Execution when the
 * professional identifies an error in the original delivery record (ADR-0005 §4).
 *
 * ## Correction semantics (ADR-0005 §4)
 *
 * Corrections do NOT modify the original Execution fields. They are immutable,
 * append-only compensating records that explain why the recorded delivery was
 * incorrect. The Application layer dispatches `ExecutionCorrectionRecorded`
 * post-commit (ADR-0009 §1), which triggers metric recomputation (ADR-0043).
 *
 * ## Ownership
 *
 * - Owned exclusively by the Execution aggregate.
 * - Not accessible by ID from outside the Execution boundary (ADR-0047 §4).
 * - Created only through `Execution.recordCorrection()`.
 */
export class ExecutionCorrection extends BaseEntity<ExecutionCorrectionProps> {
  private constructor(id: string, props: ExecutionCorrectionProps) {
    super(id, props);
  }

  static create(props: ExecutionCorrectionProps, id?: string): ExecutionCorrection {
    return new ExecutionCorrection(id ?? generateId(), props);
  }

  static reconstitute(id: string, props: ExecutionCorrectionProps): ExecutionCorrection {
    return new ExecutionCorrection(id, props);
  }

  get reason(): string {
    return this.props.reason;
  }

  get correctedAtUtc(): UTCDateTime {
    return this.props.correctedAtUtc;
  }

  get correctedBy(): string {
    return this.props.correctedBy;
  }
}
