import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentResponseNotFoundError } from '../../domain/errors/assessment-response-not-found-error.js';
import type { IAssessmentResponseRepository } from '../../domain/repositories/assessment-response-repository.js';
import type { GetAssessmentResponseInputDTO } from '../dtos/get-assessment-response-input-dto.js';
import type { GetAssessmentResponseOutputDTO } from '../dtos/get-assessment-response-output-dto.js';

/**
 * Returns a single AssessmentResponse by ID, scoped to the requesting tenant.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): the repository filters by professionalProfileId.
 *    Not found and cross-tenant access both return AssessmentResponseNotFoundError
 *    (404, never 403) to prevent tenant existence leakage.
 *
 * ## Read-only
 *
 * This use case never mutates state. AssessmentResponse is immutable after
 * creation (mirrors ADR-0005 for the Assessments context).
 */
export class GetAssessmentResponse {
  constructor(private readonly responseRepository: IAssessmentResponseRepository) {}

  async execute(
    dto: GetAssessmentResponseInputDTO,
  ): Promise<DomainResult<GetAssessmentResponseOutputDTO>> {
    // Load response (tenant-scoped, ADR-0025)
    const response = await this.responseRepository.findById(
      dto.assessmentResponseId,
      dto.professionalProfileId,
    );
    if (!response) {
      return left(new AssessmentResponseNotFoundError(dto.assessmentResponseId));
    }

    return right({
      assessmentResponseId: response.id,
      executionId: response.executionId,
      deliverableId: response.deliverableId,
      professionalProfileId: response.professionalProfileId,
      clientId: response.clientId,
      logicalDay: response.logicalDay.value,
      timezoneUsed: response.timezoneUsed,
      responseCount: response.responseCount,
      responses: response.responses.map((r) => ({
        fieldId: r.fieldId,
        value: r.value,
      })),
      createdAtUtc: response.createdAtUtc.toISO(),
    });
  }
}
