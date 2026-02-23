import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentTemplateNotFoundError } from '../../domain/errors/assessment-template-not-found-error.js';
import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { ActivateAssessmentTemplateInputDTO } from '../dtos/activate-assessment-template-input-dto.js';
import type { ActivateAssessmentTemplateOutputDTO } from '../dtos/activate-assessment-template-output-dto.js';

/**
 * Transitions an AssessmentTemplate from DRAFT to ACTIVE.
 *
 * After activation:
 * - The field list is locked (snapshot semantics, ADR-0011 §3).
 * - The template may be referenced at Deliverable prescription time.
 * - No further field additions or removals are permitted.
 *
 * ## Enforced invariants
 *
 * 1. Template must exist and belong to the requesting tenant (ADR-0025).
 * 2. Template must be in DRAFT status (InvalidAssessmentTemplateTransitionError).
 * 3. At least one field must be defined (EmptyTemplateFieldsError).
 *
 * ## No domain events — see Q8 decision.
 */
export class ActivateAssessmentTemplate {
  constructor(private readonly templateRepository: IAssessmentTemplateRepository) {}

  async execute(
    dto: ActivateAssessmentTemplateInputDTO,
  ): Promise<DomainResult<ActivateAssessmentTemplateOutputDTO>> {
    // 1. Load template (tenant-scoped, ADR-0025)
    const template = await this.templateRepository.findById(
      dto.assessmentTemplateId,
      dto.professionalProfileId,
    );
    if (!template) {
      return left(new AssessmentTemplateNotFoundError(dto.assessmentTemplateId));
    }

    // 2. Execute state transition (invariants enforced inside aggregate)
    const activateResult = template.activateTemplate();
    if (activateResult.isLeft()) return left(activateResult.value);

    await this.templateRepository.save(template);

    return right({
      assessmentTemplateId: template.id,
      status: template.status,
      contentVersion: template.contentVersion,
      fieldCount: template.fields.length,
      activatedAtUtc: activateResult.value.toISO(),
    });
  }
}
