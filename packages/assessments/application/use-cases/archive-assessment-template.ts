import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentTemplateNotFoundError } from '../../domain/errors/assessment-template-not-found-error.js';
import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { ArchiveAssessmentTemplateInputDTO } from '../dtos/archive-assessment-template-input-dto.js';
import type { ArchiveAssessmentTemplateOutputDTO } from '../dtos/archive-assessment-template-output-dto.js';

/**
 * Permanently archives an AssessmentTemplate (DRAFT | ACTIVE → ARCHIVED).
 *
 * Existing Deliverables that embed a snapshot of this template are unaffected
 * (ADR-0011 §3 — snapshot immutability). New prescriptions can no longer
 * reference the archived template.
 *
 * ## Enforced invariants
 *
 * 1. Template must exist and belong to the requesting tenant (ADR-0025).
 * 2. Template must not already be ARCHIVED
 *    (InvalidAssessmentTemplateTransitionError).
 *
 * ## No domain events — see Q8 decision.
 */
export class ArchiveAssessmentTemplate {
  constructor(private readonly templateRepository: IAssessmentTemplateRepository) {}

  async execute(
    dto: ArchiveAssessmentTemplateInputDTO,
  ): Promise<DomainResult<ArchiveAssessmentTemplateOutputDTO>> {
    // 1. Load template (tenant-scoped, ADR-0025)
    const template = await this.templateRepository.findById(
      dto.assessmentTemplateId,
      dto.professionalProfileId,
    );
    if (!template) {
      return left(new AssessmentTemplateNotFoundError(dto.assessmentTemplateId));
    }

    // 2. Execute state transition (terminal guard enforced inside aggregate)
    const archiveResult = template.archiveTemplate();
    if (archiveResult.isLeft()) return left(archiveResult.value);

    await this.templateRepository.save(template);

    return right({
      assessmentTemplateId: template.id,
      status: template.status,
      archivedAtUtc: archiveResult.value.toISO(),
    });
  }
}
