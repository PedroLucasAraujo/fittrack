import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ExecutionNotFoundError } from '../../domain/errors/execution-not-found-error.js';
import { InvalidExecutionError } from '../../domain/errors/invalid-execution-error.js';
import type { IExecutionRepository } from '../../domain/repositories/execution-repository.js';
import type { RecordExecutionCorrectionInputDTO } from '../dtos/record-execution-correction-input-dto.js';
import type { RecordExecutionCorrectionOutputDTO } from '../dtos/record-execution-correction-output-dto.js';

/**
 * Appends an immutable correction record to an existing Execution (ADR-0005 §4).
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `professionalProfileId`.
 * 2. Correction reason: non-empty string required (audit traceability, ADR-0027).
 * 3. Immutability (ADR-0005): original Execution fields are NEVER modified.
 *    The correction is appended as a new `ExecutionCorrection` subordinate entity.
 * 4. `correctedBy` must be a valid UUIDv4 (stored for audit, ADR-0027).
 *
 * ## Effect
 *
 * After save, the Application layer (or event bus subscriber) should dispatch
 * `ExecutionCorrectionRecorded` to trigger metric recomputation (ADR-0043).
 */
export class RecordExecutionCorrection {
  constructor(private readonly executionRepository: IExecutionRepository) {}

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

    // 3. Append correction (validates reason non-empty)
    const correctionResult = execution.recordCorrection(dto.reason, dto.correctedBy);
    if (correctionResult.isLeft()) return left(correctionResult.value);

    const correction = correctionResult.value;

    // 4. Persist the updated Execution (with appended correction)
    await this.executionRepository.save(execution);

    return right({
      correctionId: correction.id,
      executionId: execution.id,
      reason: correction.reason,
      correctedBy: correction.correctedBy,
      correctedAtUtc: correction.correctedAtUtc.toISO(),
    });
  }
}
