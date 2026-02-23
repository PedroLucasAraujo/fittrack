import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ExecutionNotFoundError } from '../../domain/errors/execution-not-found-error.js';
import type { IExecutionRepository } from '../../domain/repositories/execution-repository.js';
import type { GetExecutionInputDTO } from '../dtos/get-execution-input-dto.js';
import type { GetExecutionOutputDTO } from '../dtos/get-execution-output-dto.js';

/**
 * Retrieves a single Execution by id, scoped to the requesting tenant.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): scoped lookup via `professionalProfileId`.
 *    Cross-tenant access returns NOT_FOUND (404), never FORBIDDEN (403).
 *
 * Includes the full correction history for audit traceability (ADR-0027).
 */
export class GetExecution {
  constructor(private readonly executionRepository: IExecutionRepository) {}

  async execute(dto: GetExecutionInputDTO): Promise<DomainResult<GetExecutionOutputDTO>> {
    const execution = await this.executionRepository.findByIdAndProfessionalProfileId(
      dto.executionId,
      dto.professionalProfileId,
    );

    if (!execution) {
      return left(new ExecutionNotFoundError(dto.executionId));
    }

    return right({
      executionId: execution.id,
      professionalProfileId: execution.professionalProfileId,
      clientId: execution.clientId,
      accessGrantId: execution.accessGrantId,
      deliverableId: execution.deliverableId,
      occurredAtUtc: execution.occurredAtUtc.toISO(),
      logicalDay: execution.logicalDay.value,
      timezoneUsed: execution.timezoneUsed,
      createdAtUtc: execution.createdAtUtc.toISO(),
      status: execution.status,
      corrections: execution.corrections.map((c) => ({
        correctionId: c.id,
        reason: c.reason,
        correctedBy: c.correctedBy,
        correctedAtUtc: c.correctedAtUtc.toISO(),
      })),
    });
  }
}
