import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { AssessmentResponse } from '../../domain/aggregates/assessment-response.js';
import type { IAssessmentResponseRepository } from '../../domain/repositories/assessment-response-repository.js';
import type { ListAssessmentResponsesInputDTO } from '../dtos/list-assessment-responses-input-dto.js';
import type { ListAssessmentResponsesOutputDTO } from '../dtos/list-assessment-responses-output-dto.js';

/**
 * Returns all AssessmentResponses for a client, optionally filtered by Deliverable.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): all repository queries are scoped by
 *    professionalProfileId. No cross-tenant data is returned.
 * 2. When `deliverableId` is provided, the results are further filtered to
 *    responses from that specific Deliverable (same template snapshot), which
 *    enables meaningful cross-session comparison.
 *
 * ## Read-only
 *
 * This use case never mutates state. An empty result is a valid success.
 *
 * ## Ordering
 *
 * Results are ordered by logicalDay descending (most recent first), as
 * enforced by the repository implementation.
 */
export class ListAssessmentResponses {
  constructor(private readonly responseRepository: IAssessmentResponseRepository) {}

  async execute(
    dto: ListAssessmentResponsesInputDTO,
  ): Promise<DomainResult<ListAssessmentResponsesOutputDTO>> {
    let responses: AssessmentResponse[];

    if (dto.deliverableId) {
      // Filter to a specific Deliverable for same-template comparisons
      responses = await this.responseRepository.findAllByDeliverableAndClient(
        dto.deliverableId,
        dto.clientId,
        dto.professionalProfileId,
      );
    } else {
      // All responses for this client across all Deliverables
      responses = await this.responseRepository.findAllByClient(
        dto.clientId,
        dto.professionalProfileId,
      );
    }

    return right({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      total: responses.length,
      responses: responses.map((r) => ({
        assessmentResponseId: r.id,
        executionId: r.executionId,
        deliverableId: r.deliverableId,
        clientId: r.clientId,
        logicalDay: r.logicalDay.value,
        timezoneUsed: r.timezoneUsed,
        responseCount: r.responseCount,
        responses: r.responses.map((fr) => ({
          fieldId: fr.fieldId,
          value: fr.value,
        })),
        createdAtUtc: r.createdAtUtc.toISO(),
      })),
    });
  }
}
