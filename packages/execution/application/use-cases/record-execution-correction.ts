import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ExecutionNotFoundError } from '../../domain/errors/execution-not-found-error.js';
import { InvalidExecutionError } from '../../domain/errors/invalid-execution-error.js';
import { ExecutionCorrectionRecordedEvent } from '../../domain/events/execution-correction-recorded-event.js';
import type { IExecutionRepository } from '../../domain/repositories/execution-repository.js';
import type { IExecutionEventPublisher } from '../ports/execution-event-publisher-port.js';
import type { RecordExecutionCorrectionInputDTO } from '../dtos/record-execution-correction-input-dto.js';
import type { RecordExecutionCorrectionOutputDTO } from '../dtos/record-execution-correction-output-dto.js';

/**
 * Appends an immutable correction record to an existing Execution (ADR-0005 §4).
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `professionalProfileId`.
 * 2. Status guard (ADR-0005 §9): only CONFIRMED Executions may receive corrections.
 * 3. Correction reason: non-empty string required (audit traceability, ADR-0027).
 * 4. Immutability (ADR-0005): original Execution fields are NEVER modified.
 *    The correction is appended as a new `ExecutionCorrection` subordinate entity.
 * 5. `correctedBy` must be a valid UUIDv4 (stored for audit, ADR-0027).
 *
 * ## Event publication (ADR-0005 §4, ADR-0009 §4, §7)
 *
 * After saving, `ExecutionCorrectionRecorded` is dispatched post-commit by this
 * use case (the sole authority for event dispatch — ADR-0009 §4). Downstream
 * consumers (Metrics context) use this event to trigger recomputation (ADR-0043).
 */
export class RecordExecutionCorrection {
  constructor(
    private readonly executionRepository: IExecutionRepository,
    private readonly eventPublisher: IExecutionEventPublisher,
  ) {}

  async execute(
    dto: RecordExecutionCorrectionInputDTO,
  ): Promise<DomainResult<RecordExecutionCorrectionOutputDTO>> {
    // 1. Validate correctedBy as UUID (stored for audit traceability, ADR-0027)
    const correctedByResult = UniqueEntityId.create(dto.correctedBy);
    if (correctedByResult.isLeft()) {
      return left(new InvalidExecutionError('invalid correctedBy: must be a valid UUIDv4'));
    }

    // 2. Scoped lookup — returns null for wrong tenant or invalid id (ADR-0025)
    const execution = await this.executionRepository.findByIdAndProfessionalProfileId(
      dto.executionId,
      dto.professionalProfileId,
    );

    if (!execution) {
      return left(new ExecutionNotFoundError(dto.executionId));
    }

    // 3. Append correction (validates CONFIRMED status and non-empty reason)
    const correctionResult = execution.recordCorrection(dto.reason, dto.correctedBy);
    if (correctionResult.isLeft()) return left(correctionResult.value);

    const correction = correctionResult.value;

    // 4. Persist the Execution with the appended correction
    await this.executionRepository.save(execution);

    // 5. Publish ExecutionCorrectionRecorded post-commit (ADR-0005 §4, ADR-0009 §4, §7)
    await this.eventPublisher.publishExecutionCorrectionRecorded(
      new ExecutionCorrectionRecordedEvent(execution.id, execution.professionalProfileId, {
        correctionId: correction.id,
        originalExecutionId: execution.id,
        reason: correction.reason,
      }),
    );

    return right({
      correctionId: correction.id,
      executionId: execution.id,
      reason: correction.reason,
      correctedBy: correction.correctedBy,
      correctedAtUtc: correction.correctedAtUtc.toISO(),
    });
  }
}
